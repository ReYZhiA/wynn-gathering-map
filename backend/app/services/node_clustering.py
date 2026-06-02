from collections import Counter, defaultdict
from dataclasses import dataclass
from math import atan2, hypot

from app.models.gathering_node import EnrichedGatheringNode, GatheringNodeType
from app.models.node_cluster import ClusterOutlinePoint, NodeCluster
from app.services.territory_service import TerritoryService


@dataclass(frozen=True)
class ClusteringOptions:
    eps: float
    min_samples: int
    by_resource: bool
    by_territory: bool
    mode: str = "connected"


@dataclass(frozen=True)
class NodeClusterFilters:
    resource: str | None = None
    territory: str | None = None
    min_level: int | None = None
    max_level: int | None = None
    node_type: GatheringNodeType | None = None


Point = tuple[float, float]

WOODCUTTING_RESOURCES = {
    "OAK",
    "BIRCH",
    "WILLOW",
    "ACACIA",
    "SPRUCE",
    "JUNGLE",
    "DARK",
    "DARK_OAK",
    "LIGHT",
    "LIGHT_OAK",
    "PINE",
    "AVO",
    "SKY",
    "MAPLE",
    "REDWOOD",
}

MINING_RESOURCES = {
    "COPPER",
    "GRANITE",
    "GOLD",
    "SANDSTONE",
    "IRON",
    "SILVER",
    "COBALT",
    "KANDERSTONE",
    "DIAMOND",
    "VOIDSTONE",
    "DERNIC",
    "TITANIUM",
    "CINNABAR",
}

FARMING_RESOURCES = {
    "WHEAT",
    "BARLEY",
    "OAT",
    "OATS",
    "MALT",
    "HOPS",
    "RYE",
    "MILLET",
    "DECAY",
    "DECAY_ROOT",
    "RICE",
    "SORGHUM",
    "HEMP",
    "JUTE",
    "HEATHER",
}

FISHING_RESOURCES = {
    "GUDGEON",
    "TROUT",
    "SALMON",
    "CARP",
    "ICEFISH",
    "PIRANHA",
    "KOI",
    "GYLIA",
    "GYLIA_FISH",
    "BASS",
    "MOLTEN",
    "MOLTEN_EEL",
    "SUNFISH",
    "STARFISH",
    "STURGEON",
    "MAHSEER",
}


def enrich_nodes_with_territories(
    nodes: list[EnrichedGatheringNode],
    territory_service: TerritoryService,
) -> list[EnrichedGatheringNode]:
    enriched: list[EnrichedGatheringNode] = []
    for node in nodes:
        territory = territory_service.find_territory_for_point(node.x, node.z)
        enriched.append(
            node.model_copy(
                update={
                    "territory": territory.name if territory else None,
                    "cluster_id": None,
                }
            )
        )
    return enriched


def apply_node_filters(
    nodes: list[EnrichedGatheringNode],
    filters: NodeClusterFilters,
) -> list[tuple[int, EnrichedGatheringNode]]:
    resource = filters.resource.upper() if filters.resource else None
    territory = filters.territory if filters.territory else None
    filtered: list[tuple[int, EnrichedGatheringNode]] = []
    for index, node in enumerate(nodes):
        if resource and resource not in node.resource:
            continue
        if territory and node.territory != territory:
            continue
        if filters.min_level is not None and node.level < filters.min_level:
            continue
        if filters.max_level is not None and node.level > filters.max_level:
            continue
        if filters.node_type is not None and node.type != filters.node_type:
            continue
        filtered.append((index, node))
    return filtered


def build_node_clusters(
    nodes: list[EnrichedGatheringNode],
    options: ClusteringOptions,
    filters: NodeClusterFilters | None = None,
) -> list[NodeCluster]:
    filtered_nodes = apply_node_filters(nodes, filters or NodeClusterFilters())
    groups: dict[
        tuple[str | None, int | None, str | None],
        list[tuple[int, EnrichedGatheringNode]],
    ] = defaultdict(list)
    for index, node in filtered_nodes:
        resource_key = gathering_profession_for_resource(node.resource) if options.by_resource else None
        level_key = node.level if options.by_resource else None
        territory_key = node.territory if options.by_territory else None
        groups[(resource_key, level_key, territory_key)].append((index, node))

    clusters: list[NodeCluster] = []
    next_cluster_id = 0
    for (resource_key, _level_key, territory_key), group_nodes in sorted(
        groups.items(), key=lambda item: str(item[0])
    ):
        cluster_candidates = cluster_group_nodes(group_nodes, options)
        if options.mode == "dbscan":
            cluster_candidates = merge_cluster_candidates(
                cluster_candidates,
                merge_distance=options.eps * 1.5,
            )

        for members in cluster_candidates:
            member_points = [(float(node.x), float(node.z)) for _, node in members]
            resource_counts = Counter(node.resource for _, node in members)
            dominant_resource = resource_counts.most_common(1)[0][0]
            clusters.append(
                NodeCluster(
                    id=next_cluster_id,
                    resource=resource_key,
                    territory=territory_key or shared_member_territory(members),
                    nodeCount=len(members),
                    levelMin=min(node.level for _, node in members),
                    levelMax=max(node.level for _, node in members),
                    dominantResource=dominant_resource,
                    outline=compute_cluster_outline(member_points),
                    nodeIndices=[original_index for original_index, _ in members],
                )
            )
            next_cluster_id += 1
    return clusters


def shared_member_territory(members: list[tuple[int, EnrichedGatheringNode]]) -> str | None:
    territories = {node.territory for _, node in members}
    return territories.pop() if len(territories) == 1 and None not in territories else None


def cluster_group_nodes(
    group_nodes: list[tuple[int, EnrichedGatheringNode]],
    options: ClusteringOptions,
) -> list[list[tuple[int, EnrichedGatheringNode]]]:
    points = [(float(node.x), float(node.z)) for _, node in group_nodes]
    if options.mode == "dbscan":
        labels = dbscan(points, eps=options.eps, min_samples=options.min_samples)
        clustered_labels = sorted({label for label in labels if label >= 0})
        return [
            [
                (original_index, node)
                for label_index, (original_index, node) in enumerate(group_nodes)
                if labels[label_index] == label
            ]
            for label in clustered_labels
        ]
    return [
        [group_nodes[index] for index in component]
        for component in distance_connected_components(points, eps=options.eps)
        if len(component) >= options.min_samples
    ]


def gathering_profession_for_resource(resource: str) -> str:
    normalized = resource.strip().upper().replace(" ", "_").replace("-", "_")
    if normalized in WOODCUTTING_RESOURCES:
        return "WOODCUTTING"
    if normalized in MINING_RESOURCES:
        return "MINING"
    if normalized in FARMING_RESOURCES:
        return "FARMING"
    if normalized in FISHING_RESOURCES:
        return "FISHING"
    return normalized


def merge_cluster_candidates(
    candidates: list[list[tuple[int, EnrichedGatheringNode]]],
    *,
    merge_distance: float,
) -> list[list[tuple[int, EnrichedGatheringNode]]]:
    merged = [candidate[:] for candidate in candidates if candidate]
    changed = True
    while changed:
        changed = False
        for left_index in range(len(merged)):
            if changed:
                break
            for right_index in range(left_index + 1, len(merged)):
                if cluster_candidates_should_merge(
                    merged[left_index],
                    merged[right_index],
                    merge_distance=merge_distance,
                ):
                    by_node_index = {
                        original_index: (original_index, node)
                        for original_index, node in merged[left_index] + merged[right_index]
                    }
                    merged[left_index] = list(by_node_index.values())
                    del merged[right_index]
                    changed = True
                    break
    return merged


def cluster_candidates_should_merge(
    left: list[tuple[int, EnrichedGatheringNode]],
    right: list[tuple[int, EnrichedGatheringNode]],
    *,
    merge_distance: float,
) -> bool:
    left_hull = convex_hull([(float(node.x), float(node.z)) for _, node in left])
    right_hull = convex_hull([(float(node.x), float(node.z)) for _, node in right])
    if hulls_overlap(left_hull, right_hull):
        return True
    return hull_distance(left_hull, right_hull) <= merge_distance


def hulls_overlap(left: list[Point], right: list[Point]) -> bool:
    if not left or not right:
        return False
    if len(left) >= 3 and any(point_in_polygon(point, right) for point in left):
        return True
    if len(right) >= 3 and any(point_in_polygon(point, left) for point in right):
        return True
    for left_start, left_end in hull_segments(left):
        for right_start, right_end in hull_segments(right):
            if segments_intersect(left_start, left_end, right_start, right_end):
                return True
    return False


def hull_distance(left: list[Point], right: list[Point]) -> float:
    if not left or not right:
        return float("inf")
    if hulls_overlap(left, right):
        return 0
    distances = [
        point_to_segment_distance(point, start, end)
        for point in left
        for start, end in hull_segments(right)
    ] + [
        point_to_segment_distance(point, start, end)
        for point in right
        for start, end in hull_segments(left)
    ]
    return min(distances) if distances else min(hypot(a[0] - b[0], a[1] - b[1]) for a in left for b in right)


def hull_segments(points: list[Point]) -> list[tuple[Point, Point]]:
    if len(points) <= 1:
        return [(points[0], points[0])] if points else []
    if len(points) == 2:
        return [(points[0], points[1])]
    return [(points[index], points[(index + 1) % len(points)]) for index in range(len(points))]


def point_in_polygon(point: Point, polygon: list[Point]) -> bool:
    if len(polygon) < 3:
        return False
    inside = False
    for index, previous_index in zip(range(len(polygon)), [len(polygon) - 1, *range(len(polygon) - 1)]):
        current = polygon[index]
        previous = polygon[previous_index]
        intersects = (
            (current[1] > point[1]) != (previous[1] > point[1])
            and point[0]
            < ((previous[0] - current[0]) * (point[1] - current[1])) / (previous[1] - current[1])
            + current[0]
        )
        if intersects:
            inside = not inside
    return inside


def segments_intersect(a: Point, b: Point, c: Point, d: Point) -> bool:
    def orientation(p: Point, q: Point, r: Point) -> float:
        return (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1])

    def on_segment(p: Point, q: Point, r: Point) -> bool:
        return (
            min(p[0], r[0]) <= q[0] <= max(p[0], r[0])
            and min(p[1], r[1]) <= q[1] <= max(p[1], r[1])
        )

    o1 = orientation(a, b, c)
    o2 = orientation(a, b, d)
    o3 = orientation(c, d, a)
    o4 = orientation(c, d, b)
    if o1 * o2 < 0 and o3 * o4 < 0:
        return True
    return (
        o1 == 0 and on_segment(a, c, b)
        or o2 == 0 and on_segment(a, d, b)
        or o3 == 0 and on_segment(c, a, d)
        or o4 == 0 and on_segment(c, b, d)
    )


def point_to_segment_distance(point: Point, start: Point, end: Point) -> float:
    dx = end[0] - start[0]
    dz = end[1] - start[1]
    if dx == 0 and dz == 0:
        return hypot(point[0] - start[0], point[1] - start[1])
    t = max(0.0, min(1.0, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dz) / (dx * dx + dz * dz)))
    projected = (start[0] + t * dx, start[1] + t * dz)
    return hypot(point[0] - projected[0], point[1] - projected[1])


def assign_cluster_ids(
    nodes: list[EnrichedGatheringNode],
    clusters: list[NodeCluster],
) -> list[EnrichedGatheringNode]:
    cluster_ids_by_index: dict[int, int] = {}
    for cluster in clusters:
        for node_index in cluster.node_indices:
            cluster_ids_by_index[node_index] = cluster.id
    return [
        node.model_copy(update={"cluster_id": cluster_ids_by_index.get(index)})
        for index, node in enumerate(nodes)
    ]


def dbscan(points: list[Point], *, eps: float, min_samples: int) -> list[int]:
    labels = [-2] * len(points)
    cluster_id = 0
    for point_index in range(len(points)):
        if labels[point_index] != -2:
            continue
        neighbors = region_query(points, point_index, eps)
        if len(neighbors) < min_samples:
            labels[point_index] = -1
            continue
        expand_cluster(points, labels, point_index, neighbors, cluster_id, eps, min_samples)
        cluster_id += 1
    return labels


def expand_cluster(
    points: list[Point],
    labels: list[int],
    point_index: int,
    neighbors: list[int],
    cluster_id: int,
    eps: float,
    min_samples: int,
) -> None:
    labels[point_index] = cluster_id
    queue = list(neighbors)
    cursor = 0
    while cursor < len(queue):
        neighbor_index = queue[cursor]
        if labels[neighbor_index] == -1:
            labels[neighbor_index] = cluster_id
        if labels[neighbor_index] != -2:
            cursor += 1
            continue
        labels[neighbor_index] = cluster_id
        neighbor_neighbors = region_query(points, neighbor_index, eps)
        if len(neighbor_neighbors) >= min_samples:
            for candidate in neighbor_neighbors:
                if candidate not in queue:
                    queue.append(candidate)
        cursor += 1


def region_query(points: list[Point], point_index: int, eps: float) -> list[int]:
    origin = points[point_index]
    return [
        index
        for index, point in enumerate(points)
        if hypot(point[0] - origin[0], point[1] - origin[1]) <= eps
    ]


def distance_connected_components(points: list[Point], *, eps: float) -> list[list[int]]:
    visited = [False] * len(points)
    components: list[list[int]] = []
    for start_index in range(len(points)):
        if visited[start_index]:
            continue
        visited[start_index] = True
        component = [start_index]
        queue = [start_index]
        cursor = 0
        while cursor < len(queue):
            point_index = queue[cursor]
            for neighbor_index in region_query(points, point_index, eps):
                if visited[neighbor_index]:
                    continue
                visited[neighbor_index] = True
                queue.append(neighbor_index)
                component.append(neighbor_index)
            cursor += 1
        components.append(component)
    return components


def compute_cluster_outline(points: list[Point]) -> list[ClusterOutlinePoint]:
    unique_points = sorted(set(points))
    if len(unique_points) <= 2:
        return [ClusterOutlinePoint(x=x, z=z) for x, z in unique_points]
    outline_points = convex_hull(unique_points)
    return [ClusterOutlinePoint(x=x, z=z) for x, z in outline_points]


def compute_alpha_shape_outline(points: list[Point]) -> list[Point]:
    try:
        import numpy as np
        from scipy.spatial import Delaunay
    except Exception:
        return []

    if len(points) < 4:
        return []
    coordinates = np.array(points)
    try:
        triangles = Delaunay(coordinates).simplices
    except Exception:
        return []

    edge_counts: Counter[tuple[int, int]] = Counter()
    distances = [
        hypot(points[a][0] - points[b][0], points[a][1] - points[b][1])
        for a in range(len(points))
        for b in range(a + 1, len(points))
    ]
    if not distances:
        return []
    edge_limit = sorted(distances)[max(0, int(len(distances) * 0.6) - 1)] * 1.35

    for triangle in triangles:
        a, b, c = [int(index) for index in triangle]
        pa, pb, pc = points[a], points[b], points[c]
        if circumradius(pa, pb, pc) > edge_limit:
            continue
        for edge in ((a, b), (b, c), (c, a)):
            edge_counts[tuple(sorted(edge))] += 1

    boundary_edges = [edge for edge, count in edge_counts.items() if count == 1]
    ordered = order_boundary_edges(boundary_edges, points)
    return ordered if len(ordered) >= 3 else []


def circumradius(a: Point, b: Point, c: Point) -> float:
    ab = hypot(a[0] - b[0], a[1] - b[1])
    bc = hypot(b[0] - c[0], b[1] - c[1])
    ca = hypot(c[0] - a[0], c[1] - a[1])
    area2 = abs(
        a[0] * (b[1] - c[1])
        + b[0] * (c[1] - a[1])
        + c[0] * (a[1] - b[1])
    )
    if area2 == 0:
        return float("inf")
    return (ab * bc * ca) / (2 * area2)


def order_boundary_edges(edges: list[tuple[int, int]], points: list[Point]) -> list[Point]:
    adjacency: dict[int, list[int]] = defaultdict(list)
    for a, b in edges:
        adjacency[a].append(b)
        adjacency[b].append(a)
    if not adjacency:
        return []

    start = min(adjacency, key=lambda index: (points[index][0], points[index][1]))
    ordered_indices = [start]
    previous: int | None = None
    current = start
    for _ in range(len(edges) + 1):
        candidates = [candidate for candidate in adjacency[current] if candidate != previous]
        if not candidates:
            break
        next_index = min(candidates, key=lambda index: angle_from(points[current], points[index]))
        if next_index == start:
            break
        ordered_indices.append(next_index)
        previous, current = current, next_index

    if len(set(ordered_indices)) < 3:
        return []
    return order_points_clockwise([points[index] for index in ordered_indices])


def angle_from(origin: Point, point: Point) -> float:
    return atan2(point[1] - origin[1], point[0] - origin[0])


def order_points_clockwise(points: list[Point]) -> list[Point]:
    center_x = sum(point[0] for point in points) / len(points)
    center_z = sum(point[1] for point in points) / len(points)
    return sorted(points, key=lambda point: atan2(point[1] - center_z, point[0] - center_x))


def convex_hull(points: list[Point]) -> list[Point]:
    sorted_points = sorted(set(points))
    if len(sorted_points) <= 1:
        return sorted_points

    def cross(origin: Point, a: Point, b: Point) -> float:
        return (a[0] - origin[0]) * (b[1] - origin[1]) - (a[1] - origin[1]) * (b[0] - origin[0])

    lower: list[Point] = []
    for point in sorted_points:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], point) <= 0:
            lower.pop()
        lower.append(point)

    upper: list[Point] = []
    for point in reversed(sorted_points):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], point) <= 0:
            upper.pop()
        upper.append(point)

    return lower[:-1] + upper[:-1]
