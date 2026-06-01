from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api.routes import gathering_nodes as route
from app.main import app
from app.models.gathering_node import GatheringNode, GatheringNodeType
from app.services.wynncraft_client import WynncraftApiError


def test_valid_gathering_node_is_normalized() -> None:
    node = GatheringNode.model_validate(
        {
            "x": "1034",
            "y": 72.0,
            "z": "-421",
            "angle": "0",
            "type": "node",
            "resource": " oak ",
            "level": "1",
        }
    )

    assert node.x == 1034
    assert node.z == -421
    assert node.type == GatheringNodeType.NODE
    assert node.resource == "OAK"
    assert node.level == 1


def test_invalid_node_type_is_rejected() -> None:
    with pytest.raises(ValidationError):
        GatheringNode.model_validate(
            {
                "x": 1,
                "y": 2,
                "z": 3,
                "angle": 0,
                "type": "TREE",
                "resource": "OAK",
                "level": 1,
            }
        )


def test_get_gathering_nodes_returns_normalized_data(monkeypatch: pytest.MonkeyPatch) -> None:
    route.gathering_nodes_cache.clear()

    async def fake_fetch() -> list[GatheringNode]:
        return [
            GatheringNode.model_validate(
                {
                    "x": 1034,
                    "y": 72,
                    "z": -421,
                    "angle": 0,
                    "type": "NODE",
                    "resource": "OAK",
                    "level": 1,
                }
            )
        ]

    monkeypatch.setattr(route.wynncraft_client, "fetch_gathering_nodes", fake_fetch)

    client = TestClient(app)
    response = client.get("/api/gathering-nodes")

    assert response.status_code == 200
    payload = response.json()
    assert payload["data"][0]["resource"] == "OAK"
    assert payload["meta"]["source"] == "wynncraft"
    assert payload["meta"]["cached"] is False
    assert payload["meta"]["count"] == 1


def test_get_gathering_nodes_returns_stale_cache_on_api_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    stale_node = GatheringNode.model_validate(
        {
            "x": 1,
            "y": 2,
            "z": 3,
            "angle": 0,
            "type": "WALL",
            "resource": "COPPER",
            "level": 1,
        }
    )
    route.gathering_nodes_cache.set(
        {
            "data": [stale_node],
            "fetched_at": datetime.now(UTC),
        }
    )
    route.gathering_nodes_cache._entry.expires_at = 0  # type: ignore[union-attr]

    async def fake_fetch() -> list[GatheringNode]:
        raise WynncraftApiError("boom")

    monkeypatch.setattr(route.wynncraft_client, "fetch_gathering_nodes", fake_fetch)

    client = TestClient(app)
    response = client.get("/api/gathering-nodes")

    assert response.status_code == 200
    payload = response.json()
    assert payload["meta"]["cached"] is True
    assert "warning" in payload["meta"]
    assert payload["data"][0]["resource"] == "COPPER"


def test_get_gathering_nodes_returns_502_without_cache(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    route.gathering_nodes_cache.clear()

    async def fake_fetch() -> list[GatheringNode]:
        raise WynncraftApiError("boom")

    monkeypatch.setattr(route.wynncraft_client, "fetch_gathering_nodes", fake_fetch)

    client = TestClient(app)
    response = client.get("/api/gathering-nodes")

    assert response.status_code == 502
