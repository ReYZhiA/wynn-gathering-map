from fastapi.testclient import TestClient

from app.api.routes import territories
from app.main import app
from app.models.territory import Territory, TerritoryBounds


def test_territories_endpoint_returns_territory_list(monkeypatch) -> None:
    monkeypatch.setattr(
        territories.territory_service,
        "list_territories",
        lambda: [
            Territory(
                name="Detlas",
                resources={"emeralds": 9000},
                tradingRoutes=[],
                bounds=TerritoryBounds(minX=402, maxX=536, minZ=-1657, maxZ=-1518),
            )
        ],
    )

    client = TestClient(app)
    response = client.get("/api/territories")

    assert response.status_code == 200
    payload = response.json()
    assert payload["meta"]["count"] == 1
    assert payload["data"][0]["bounds"]["minX"] == 402
