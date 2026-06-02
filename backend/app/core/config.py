from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Wynncraft Gathering Map API"
    debug: bool = Field(default=False, alias="APP_DEBUG")
    wynncraft_api_base_url: str = Field(
        default="https://api.wynncraft.com",
        alias="WYNNCRAFT_API_BASE_URL",
    )
    gathering_nodes_cache_ttl_seconds: int = 3600
    gathering_nodes_mock_path: str | None = Field(
        default=None,
        alias="GATHERING_NODES_MOCK_PATH",
    )
    territory_json_path: str = Field(default="territories.json", alias="TERRITORIES_JSON_PATH")
    territory_api_cache_ttl_seconds: int = Field(default=60, alias="TERRITORY_API_CACHE_TTL_SECONDS")
    node_cluster_eps: float = Field(default=90.0, alias="NODE_CLUSTER_EPS")
    node_cluster_min_samples: int = Field(default=3, alias="NODE_CLUSTER_MIN_SAMPLES")
    node_cluster_by_resource: bool = Field(default=True, alias="NODE_CLUSTER_BY_RESOURCE")
    node_cluster_by_territory: bool = Field(default=False, alias="NODE_CLUSTER_BY_TERRITORY")
    node_cluster_mode: str = Field(default="connected", alias="NODE_CLUSTER_MODE")
    node_cluster_cache_ttl_seconds: int = Field(default=300, alias="NODE_CLUSTER_CACHE_TTL_SECONDS")
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    cors_origin_regex: str = (
        r"http://(localhost|127\.0\.0\.1|0\.0\.0\.0|"
        r"10\.\d+\.\d+\.\d+|"
        r"192\.168\.\d+\.\d+|"
        r"172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+):51\d{2}"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
