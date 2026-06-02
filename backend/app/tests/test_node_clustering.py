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


def make_territory_node(
    x: int,
    z: int,
    territory: str | None,
    resource: str = "OAK",
) -> EnrichedGatheringNode:
    return make_node(x, z, resource).model_copy(update={"territory": territory})


def test_dbscan_groups_close_nodes_and_marks_noise() -> None:
    labels = dbscan([(0, 0), (10, 0), (0, 10), (500, 500)], eps=20, min_samples=3)

    assert labels[:3] == [0, 0, 0]
    assert labels[3] == -1


def test_different_professions_do_not_cluster_when_grouped() -> None:
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
    assert {cluster.resource for cluster in clusters} == {"WOODCUTTING", "MINING"}


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


def test_connected_mode_chains_sparse_nodes_by_distance() -> None:
    nodes = [
        make_node(0, 0, "TROUT"),
        make_node(15, 0, "TROUT"),
        make_node(30, 0, "TROUT"),
        make_node(45, 0, "TROUT"),
    ]

    clusters = build_node_clusters(
        nodes,
        ClusteringOptions(
            eps=20,
            min_samples=4,
            by_resource=True,
            by_territory=False,
            mode="connected",
        ),
    )

    assert len(clusters) == 1
    assert clusters[0].node_count == 4


def test_cluster_infers_shared_member_territory() -> None:
    nodes = [
        make_territory_node(0, 0, "Detlas Woods"),
        make_territory_node(10, 0, "Detlas Woods"),
        make_territory_node(0, 10, "Detlas Woods"),
    ]

    clusters = build_node_clusters(
        nodes,
        ClusteringOptions(
            eps=20,
            min_samples=3,
            by_resource=True,
            by_territory=False,
            mode="connected",
        ),
    )

    assert len(clusters) == 1
    assert clusters[0].territory == "Detlas Woods"


def test_cluster_omits_mixed_member_territory() -> None:
    nodes = [
        make_territory_node(0, 0, "Detlas Woods"),
        make_territory_node(10, 0, "Ragni Plains"),
        make_territory_node(0, 10, "Detlas Woods"),
    ]

    clusters = build_node_clusters(
        nodes,
        ClusteringOptions(
            eps=20,
            min_samples=3,
            by_resource=True,
            by_territory=False,
            mode="connected",
        ),
    )

    assert len(clusters) == 1
    assert clusters[0].territory is None


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
