import json

from app.models.gathering_node import EnrichedGatheringNode
from app.services.node_clustering import enrich_nodes_with_territories
from app.services.territory_service import TerritoryService


def write_territories(path) -> None:
    path.write_text(
        json.dumps(
            {
                "Large": {
                    "resources": {"emeralds": "9000", "ore": "0"},
                    "Trading Routes": ["Small"],
                    "Location": {"start": [0, 0], "end": [100, 100]},
                    "Guild": {"uuid": "", "name": "Guild", "prefix": "GLD"},
                    "Acquired": "",
                },
                "Small": {
                    "resources": {"emeralds": "1200", "wood": "3600"},
                    "Trading Routes": [],
                    "Location": {"start": [75, 75], "end": [25, 25]},
                    "Guild": {"uuid": "", "name": "", "prefix": ""},
                    "Acquired": "today",
                },
            }
        ),
        encoding="utf-8",
    )


def test_territory_loading_normalizes_bounds_and_resources(tmp_path) -> None:
    path = tmp_path / "territories.json"
    write_territories(path)

    territories = TerritoryService(str(path)).list_territories()
    small = next(territory for territory in territories if territory.name == "Small")

    assert small.bounds.min_x == 25
    assert small.bounds.max_x == 75
    assert small.bounds.min_z == 25
    assert small.bounds.max_z == 75
    assert small.resources["wood"] == 3600


def test_find_territory_returns_none_outside_all_territories(tmp_path) -> None:
    path = tmp_path / "territories.json"
    write_territories(path)

    territory = TerritoryService(str(path)).find_territory_for_point(300, 300)

    assert territory is None


def test_find_territory_chooses_smallest_area_overlap(tmp_path) -> None:
    path = tmp_path / "territories.json"
    write_territories(path)

    territory = TerritoryService(str(path)).find_territory_for_point(50, 50)

    assert territory is not None
    assert territory.name == "Small"


def test_node_enrichment_adds_territory_name(tmp_path) -> None:
    path = tmp_path / "territories.json"
    write_territories(path)
    node = EnrichedGatheringNode(
        x=50,
        y=64,
        z=50,
        angle=0,
        type="NODE",
        resource="OAK",
        level=1,
    )

    enriched = enrich_nodes_with_territories([node], TerritoryService(str(path)))

    assert enriched[0].territory == "Small"


def test_territory_parser_accepts_live_api_shape(tmp_path) -> None:
    service = TerritoryService(str(tmp_path / "missing.json"))

    territory = service._parse_territory(
        "Apprentice Huts",
        {
            "guild": {"uuid": "u", "name": "Guild", "prefix": "GLD", "hq": "HQ"},
            "acquired": "2026-05-25T17:53:59.333000Z",
            "location": {"start": [-600, -610], "end": [-670, -780]},
            "resources": [
                {"type": "EMERALD", "generation": 9359},
                {"type": "ORE", "generation": 0},
                {"type": "WOOD", "generation": 3743},
            ],
            "links": ["Monte's Village"],
        },
    )

    assert territory is not None
    assert territory.bounds.min_x == -670
    assert territory.bounds.max_x == -600
    assert territory.bounds.min_z == -780
    assert territory.bounds.max_z == -610
    assert territory.resources["emerald"] == 9359
    assert territory.trading_routes == ["Monte's Village"]
