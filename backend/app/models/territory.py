from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TerritoryBounds(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    min_x: int = Field(alias="minX")
    max_x: int = Field(alias="maxX")
    min_z: int = Field(alias="minZ")
    max_z: int = Field(alias="maxZ")

    @property
    def area(self) -> int:
        return max(0, self.max_x - self.min_x) * max(0, self.max_z - self.min_z)


class TerritoryGuild(BaseModel):
    uuid: str = ""
    name: str = ""
    prefix: str = ""


class Territory(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    resources: dict[str, int]
    trading_routes: list[str] = Field(default_factory=list, alias="tradingRoutes")
    bounds: TerritoryBounds
    guild: TerritoryGuild | None = None
    acquired: str | None = None

    @field_validator("resources", mode="before")
    @classmethod
    def coerce_resources(cls, value: Any) -> dict[str, int]:
        if not isinstance(value, dict):
            return {}
        resources: dict[str, int] = {}
        for key, raw in value.items():
            try:
                resources[str(key)] = int(raw)
            except (TypeError, ValueError):
                resources[str(key)] = 0
        return resources


class TerritoriesMeta(BaseModel):
    count: int


class TerritoriesResponse(BaseModel):
    data: list[Territory]
    meta: TerritoriesMeta
