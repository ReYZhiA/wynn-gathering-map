from fastapi import APIRouter

from app.core.config import get_settings
from app.models.territory import TerritoriesMeta, TerritoriesResponse
from app.services.territory_service import TerritoryService

router = APIRouter(tags=["territories"])
settings = get_settings()
territory_service = TerritoryService(
    settings.territory_json_path,
    api_base_url=settings.wynncraft_api_base_url,
    api_cache_ttl_seconds=settings.territory_api_cache_ttl_seconds,
    debug=settings.debug,
)


@router.get("/territories", response_model=TerritoriesResponse)
async def get_territories() -> TerritoriesResponse:
    territories = territory_service.list_territories()
    return TerritoriesResponse(data=territories, meta=TerritoriesMeta(count=len(territories)))
