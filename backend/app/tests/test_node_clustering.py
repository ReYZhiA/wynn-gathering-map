from app.models.gathering_node import EnrichedGatheringNode
from app.services.node_clustering import (
    ClusteringOptions,
    NodeClusterFilters,
    build_node_clusters,
    compute_cluster_outline,
    convex_hull,
    dbscan,
)


def make_node(x: int, z: int, resource: str = "OAK") -> EnrichedGatheringNode:
    return EnrichedGatheringNode(
        x=x,
        y=64,
        z=z,
        angle=0,
        type="NODE",
        resource=resource,
        level=1,
    )


def test_dbscan_groups_close_nodes_and_marks_noise() -> None:
    labels = dbscan([(0, 0), (10, 0), (0, 10), (500, 500)], eps=20, min_samples=3)

    assert labels[:3] == [0, 0, 0]
    assert labels[3] == -1


def test_different_resources_do_not_cluster_when_grouped_by_resource() -> None:
    nodes = [
        make_node(0, 0, "OAK"),
        make_node(10, 0, "OAK"),
        make_node(0, 10, "OAK"),
        make_node(500, 500, "COPPER"),
        make_node(510, 500, "COPPER"),
        make_node(500, 510, "COPPER"),
    ]

    clusters = build_node_clusters(
        nodes,
        ClusteringOptions(eps=20, min_samples=3, by_resource=True, by_territory=False),
    )

    assert len(clusters) == 2
    assert {cluster.resource for cluster in clusters} == {"OAK", "COPPER"}


def test_cluster_filters_apply_before_clustering() -> None:
    nodes = [
        make_node(0, 0, "OAK"),
        make_node(10, 0, "OAK"),
        make_node(0, 10, "OAK"),
        make_node(500, 500, "COPPER"),
        make_node(510, 500, "COPPER"),
        make_node(500, 510, "COPPER"),
    ]

    clusters = build_node_clusters(
        nodes,
        ClusteringOptions(eps=20, min_samples=3, by_resource=True, by_territory=False),
        NodeClusterFilters(resource="OAK"),
    )

    assert len(clusters) == 1
    assert clusters[0].dominant_resource == "OAK"


def test_outline_handles_one_two_and_three_points() -> None:
    assert len(compute_cluster_outline([(0, 0)])) == 1
    assert len(compute_cluster_outline([(0, 0), (10, 0)])) == 2
    assert len(compute_cluster_outline([(0, 0), (10, 0), (0, 10)])) == 3


def test_outline_for_non_rectangular_points_is_not_bounding_box() -> None:
    outline = compute_cluster_outline([(0, 0), (10, 0), (10, 10), (5, 15), (0, 10)])
    outline_points = {(point.x, point.z) for point in outline}
    bounding_box = {(0, 0), (10, 0), (10, 15), (0, 15)}

    assert len(outline) >= 3
    assert outline_points != bounding_box


def test_convex_hull_fallback_returns_exterior_points() -> None:
    hull = convex_hull([(0, 0), (5, 5), (10, 0), (10, 10), (0, 10)])

    assert set(hull) == {(0, 0), (10, 0), (10, 10), (0, 10)}
