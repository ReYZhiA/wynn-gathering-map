from datetime import UTC, datetime
import json
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import get_settings
from app.models.gathering_node import EnrichedGatheringNode, GatheringNodesMeta, GatheringNodesResponse

router = APIRouter(tags=["dev-gathering-nodes"])
settings = get_settings()


class EditedGatheringNodesExportRequest(BaseModel):
    data: list[EnrichedGatheringNode]


class EditedGatheringNodesExportResponse(BaseModel):
    path: str
    count: int
    writtenAt: datetime


class ScannedNodeFilesResponse(BaseModel):
    files: list[str]


@router.get("/dev/scanned-nodes", response_model=ScannedNodeFilesResponse)
async def list_scanned_node_files() -> ScannedNodeFilesResponse:
    scanned_nodes_path = get_scanned_nodes_path()
    if not scanned_nodes_path.exists():
        return ScannedNodeFilesResponse(files=[])

    return ScannedNodeFilesResponse(
        files=sorted(
            path.name
            for path in scanned_nodes_path.glob("*.json")
            if path.name != "index.json"
        )
    )


@router.post("/dev/gathering-nodes/export-edited", response_model=EditedGatheringNodesExportResponse)
async def export_edited_gathering_nodes(
    request: EditedGatheringNodesExportRequest,
) -> EditedGatheringNodesExportResponse:
    written_at = datetime.now(UTC)
    output_path = get_edited_gathering_nodes_path()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    response = GatheringNodesResponse(
        data=request.data,
        meta=GatheringNodesMeta(
            source="edited",
            cached=False,
            count=len(request.data),
            cacheTtlSeconds=0,
            fetchedAt=written_at,
            warning="Edited dev export; node clusters were not regenerated.",
        ),
    )
    output_path.write_text(
        json.dumps(response.model_dump(mode="json", by_alias=True), indent=2),
        encoding="utf-8",
    )

    return EditedGatheringNodesExportResponse(
        path=str(output_path),
        count=len(request.data),
        writtenAt=written_at,
    )


def get_edited_gathering_nodes_path() -> Path:
    repo_root = Path(__file__).resolve().parents[4]
    return repo_root / "frontend" / "public" / "data" / "gathering-nodes.edited.json"


def get_scanned_nodes_path() -> Path:
    repo_root = Path(__file__).resolve().parents[4]
    return repo_root / "frontend" / "public" / "data" / "scanned_nodes"
