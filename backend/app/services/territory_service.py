import json
import logging
from pathlib import Path
from time import monotonic
from typing import Any

import httpx

from app.models.territory import Territory, TerritoryBounds, TerritoryGuild

logger = logging.getLogger(__name__)


class TerritoryService:
    def __init__(
        self,
        territory_json_path: str,
        *,
        api_base_url: str = "https://api.wynncraft.com",
        api_cache_ttl_seconds: int = 60,
        debug: bool = False,
    ) -> None:
        self._path = Path(territory_json_path)
        if not self._path.is_absolute():
            self._path = Path(__file__).resolve().parents[3] / self._path
        self._api_base_url = api_base_url.rstrip("/")
        self._api_cache_ttl_seconds = api_cache_ttl_seconds
        self._debug = debug
        self._territories: list[Territory] | None = None
        self._expires_at = 0.0

    def list_territories(self) -> list[Territory]:
        if self._territories is None or (not self._path.exists() and self._expires_at <= monotonic()):
            self._territories = self._load_territories()
            self._expires_at = monotonic() + self._api_cache_ttl_seconds
        return self._territories

    def find_territory_for_point(self, x: int, z: int) -> Territory | None:
        matches = [
            territory
            for territory in self.list_territories()
            if territory.bounds.min_x <= x <= territory.bounds.max_x
            and territory.bounds.min_z <= z <= territory.bounds.max_z
        ]
        if not matches:
            return None
        matches.sort(key=lambda territory: territory.bounds.area)
        if len(matches) > 1 and self._debug:
            logger.warning(
                "Point (%s, %s) matched multiple territories; selected smallest: %s",
                x,
                z,
                matches[0].name,
            )
        return matches[0]

    def _load_territories(self) -> list[Territory]:
        if self._path.exists():
            try:
                raw_data = json.loads(self._path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                logger.exception("Failed to load territory JSON from %s", self._path)
                return []
        else:
            raw_data = self._fetch_territory_api()

        if not isinstance(raw_data, dict):
            logger.warning("Territory JSON root must be an object keyed by territory name.")
            return []

        territories: list[Territory] = []
        for name, raw in raw_data.items():
            if not isinstance(raw, dict):
                continue
            territory = self._parse_territory(str(name), raw)
            if territory is not None:
                territories.append(territory)
        return territories

    def _fetch_territory_api(self) -> dict[str, Any]:
        url = f"{self._api_base_url}/v3/guild/list/territory"
        try:
            response = httpx.get(url, timeout=20.0)
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError):
            logger.exception("Failed to fetch territories from Wynncraft API.")
            return {}
        return payload if isinstance(payload, dict) else {}

    def _parse_territory(self, name: str, raw: dict[str, Any]) -> Territory | None:
        location = raw.get("Location") or raw.get("location")
        if not isinstance(location, dict):
            return None
        start = location.get("start")
        end = location.get("end")
        if not self._is_coordinate_pair(start) or not self._is_coordinate_pair(end):
            return None

        x1, z1 = int(start[0]), int(start[1])
        x2, z2 = int(end[0]), int(end[1])
        guild = raw.get("Guild") or raw.get("guild")

        return Territory(
            name=name,
            resources=self._parse_resources(raw.get("resources", {})),
            tradingRoutes=list(raw.get("Trading Routes") or raw.get("links") or []),
            bounds=TerritoryBounds(
                minX=min(x1, x2),
                maxX=max(x1, x2),
                minZ=min(z1, z2),
                maxZ=max(z1, z2),
            ),
            guild=TerritoryGuild.model_validate(guild) if isinstance(guild, dict) else None,
            acquired=raw.get("Acquired") or raw.get("acquired") or None,
        )

    @staticmethod
    def _parse_resources(raw_resources: Any) -> dict[str, int]:
        if isinstance(raw_resources, dict):
            resources: dict[str, int] = {}
            for key, raw_value in raw_resources.items():
                try:
                    resources[str(key).lower()] = int(raw_value)
                except (TypeError, ValueError):
                    resources[str(key).lower()] = 0
            return resources

        if isinstance(raw_resources, list):
            resources = {}
            for resource in raw_resources:
                if not isinstance(resource, dict) or "type" not in resource:
                    continue
                key = str(resource["type"]).lower()
                raw_value = resource.get("generation", resource.get("baseGeneration", 0))
                try:
                    resources[key] = int(raw_value)
                except (TypeError, ValueError):
                    resources[key] = 0
            return resources

        return {}

    @staticmethod
    def _is_coordinate_pair(value: Any) -> bool:
        if not isinstance(value, list | tuple) or len(value) != 2:
            return False
        try:
            int(value[0])
            int(value[1])
        except (TypeError, ValueError):
            return False
        return True
