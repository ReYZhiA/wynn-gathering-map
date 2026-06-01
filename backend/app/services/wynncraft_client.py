import json
import logging
from pathlib import Path
from typing import Any

import httpx
from pydantic import ValidationError

from app.core.config import Settings
from app.models.gathering_node import GatheringNode

logger = logging.getLogger(__name__)


class WynncraftApiError(RuntimeError):
    pass


class WynncraftClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._base_url = settings.wynncraft_api_base_url.rstrip("/")
        self._mock_path = self._resolve_mock_path(settings.gathering_nodes_mock_path)

    async def fetch_gathering_nodes(self) -> list[GatheringNode]:
        mock_payload = self._load_mock_payload()
        if mock_payload is not None:
            return self._validate_nodes(mock_payload)

        url = f"{self._base_url}/v3/map/gathering-nodes"
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                payload = response.json()
        except httpx.HTTPStatusError as exc:
            raise WynncraftApiError(
                f"Wynncraft API returned HTTP {exc.response.status_code} for gathering nodes."
            ) from exc
        except (httpx.HTTPError, ValueError) as exc:
            raise WynncraftApiError("Failed to fetch gathering nodes from Wynncraft API.") from exc

        if not isinstance(payload, list):
            raise WynncraftApiError("Wynncraft gathering nodes response was not a list.")

        return self._validate_nodes(payload)

    def _load_mock_payload(self) -> list[Any] | None:
        if self._mock_path is None or not self._mock_path.exists():
            return None
        try:
            payload = json.loads(self._mock_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise WynncraftApiError(f"Failed to load gathering node mock file: {self._mock_path}") from exc
        if not isinstance(payload, list):
            raise WynncraftApiError("Gathering node mock file must contain a JSON array.")
        return payload

    @staticmethod
    def _resolve_mock_path(mock_path: str | None) -> Path | None:
        if not mock_path:
            return None
        path = Path(mock_path)
        if path.is_absolute():
            return path
        return Path(__file__).resolve().parents[3] / path

    def _validate_nodes(self, payload: list[Any]) -> list[GatheringNode]:
        nodes: list[GatheringNode] = []
        for index, raw_node in enumerate(payload):
            try:
                nodes.append(GatheringNode.model_validate(raw_node))
            except ValidationError:
                if self._settings.debug:
                    logger.exception("Skipping invalid gathering node at index %s: %r", index, raw_node)
        return nodes
