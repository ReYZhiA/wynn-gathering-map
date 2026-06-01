from fastapi.testclient import TestClient

from app.api.routes import node_clusters
from app.main import app
from app.models.gathering_node import GatheringNode


def make_raw_node(x: int, z: int, resource: str = "OAK") -> GatheringNode:
    return GatheringNode(
        x=x,
        y=64,
        z=z,
        angle=0,
        type="NODE",
        resource=resource,
        level=1,
    )


def test_node_clusters_endpoint_returns_cluster_response(monkeypatch) -> None:
    node_clusters.cluster_cache.clear()

    async def fake_raw_nodes() -> list[GatheringNode]:
        return [
            make_raw_node(0, 0),
            make_raw_node(10, 0),
            make_raw_node(0, 10),
            make_raw_node(500, 500, "COPPER"),
        ]

    monkeypatch.setattr(node_clusters, "get_raw_gathering_nodes", fake_raw_nodes)
    monkeypatch.setattr(node_clusters.territory_service, "find_territory_for_point", lambda x, z: None)

    client = TestClient(app)
    response = client.get("/api/node-clusters?eps=20&minSamples=3&byResource=true")

    assert response.status_code == 200
    payload = response.json()
    assert payload["meta"]["count"] == 1
    assert payload["data"][0]["nodeCount"] == 3
    assert payload["data"][0]["dominantResource"] == "OAK"
