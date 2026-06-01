from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class GatheringNodeType(str, Enum):
    NODE = "NODE"
    WALL = "WALL"
    CORNER = "CORNER"


class GatheringNode(BaseModel):
    model_config = ConfigDict(extra="ignore")

    x: int
    y: int
    z: int
    angle: int
    type: GatheringNodeType
    resource: str
    level: int

    @field_validator("x", "y", "z", "angle", "level", mode="before")
    @classmethod
    def coerce_int(cls, value: Any) -> int:
        if isinstance(value, bool):
            raise ValueError("boolean values are not valid integers")
        if isinstance(value, int):
            return value
        if isinstance(value, float) and value.is_integer():
            return int(value)
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("-"):
                digits = stripped[1:]
            else:
                digits = stripped
            if digits.isdigit():
                return int(stripped)
        raise ValueError("expected an integer value")

    @field_validator("type", mode="before")
    @classmethod
    def normalize_type(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip().upper()
        return value

    @field_validator("resource", mode="before")
    @classmethod
    def normalize_resource(cls, value: Any) -> str:
        if not isinstance(value, str):
            raise ValueError("resource must be a string")
        normalized = value.strip().upper()
        if not normalized:
            raise ValueError("resource cannot be empty")
        return normalized


class EnrichedGatheringNode(GatheringNode):
    territory: str | None = None
    cluster_id: int | None = None


class GatheringNodesMeta(BaseModel):
    source: str = "wynncraft"
    cached: bool
    count: int
    cacheTtlSeconds: int = Field(serialization_alias="cacheTtlSeconds")
    fetchedAt: datetime = Field(serialization_alias="fetchedAt")
    warning: str | None = None


class GatheringNodesResponse(BaseModel):
    data: list[EnrichedGatheringNode]
    meta: GatheringNodesMeta
