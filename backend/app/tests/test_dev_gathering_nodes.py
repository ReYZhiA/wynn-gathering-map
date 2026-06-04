import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.api.routes import dev_gathering_nodes
from app.main import app


def test_export_edited_gathering_nodes_writes_valid_static_snapshot(
    monkeypatch,
    tmp_path: Path,
) -> None:
    output_path = tmp_path / "gathering-nodes.edited.json"
    monkeypatch.setattr(dev_gathering_nodes, "get_edited_gathering_nodes_path", lambda: output_path)

    client = TestClient(app)
    response = client.post(
        "/api/dev/gathering-nodes/export-edited",
        json={
            "data": [
                {
                    "x": 1,
                    "y": 2,
                    "z": 3,
                    "angle": 0,
                    "type": "NODE",
                    "resource": " molten_eel ",
                    "level": 110,
                    "territory": None,
                    "cluster_id": None,
                    "devId": "ignored",
                }
            ]
        },
    )

    assert response.status_code == 200
    assert response.json()["count"] == 1

    payload = json.loads(output_path.read_text(encoding="utf-8"))
    assert payload["meta"]["source"] == "edited"
    assert payload["meta"]["count"] == 1
    assert payload["data"][0]["resource"] == "MOLTEN_EEL"
    assert "devId" not in payload["data"][0]


def test_export_edited_gathering_nodes_rejects_invalid_nodes(tmp_path: Path, monkeypatch) -> None:
    output_path = tmp_path / "gathering-nodes.edited.json"
    monkeypatch.setattr(dev_gathering_nodes, "get_edited_gathering_nodes_path", lambda: output_path)

    client = TestClient(app)
    response = client.post(
        "/api/dev/gathering-nodes/export-edited",
        json={"data": [{"x": 1, "y": 2, "z": 3, "angle": 0, "type": "TREE", "resource": "OAK", "level": 1}]},
    )

    assert response.status_code == 422
    assert not output_path.exists()


def test_list_scanned_node_files_returns_folder_contents(monkeypatch, tmp_path: Path) -> None:
    scanned_nodes_path = tmp_path / "scanned_nodes"
    scanned_nodes_path.mkdir()
    (scanned_nodes_path / "z_scan.json").write_text("[]", encoding="utf-8")
    (scanned_nodes_path / "a_scan.json").write_text("[]", encoding="utf-8")
    (scanned_nodes_path / "index.json").write_text("{}", encoding="utf-8")
    (scanned_nodes_path / "notes.txt").write_text("", encoding="utf-8")
    monkeypatch.setattr(dev_gathering_nodes, "get_scanned_nodes_path", lambda: scanned_nodes_path)

    client = TestClient(app)
    response = client.get("/api/dev/scanned-nodes")

    assert response.status_code == 200
    assert response.json()["files"] == ["a_scan.json", "z_scan.json"]
