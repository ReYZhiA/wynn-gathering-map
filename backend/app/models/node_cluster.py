from pydantic import BaseModel, ConfigDict, Field


class ClusterOutlinePoint(BaseModel):
    x: float
    z: float


class NodeCluster(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    resource: str | None = None
    territory: str | None = None
    node_count: int = Field(alias="nodeCount")
    level_min: int = Field(alias="levelMin")
    level_max: int = Field(alias="levelMax")
    dominant_resource: str = Field(alias="dominantResource")
    outline: list[ClusterOutlinePoint]
    node_indices: list[int] = Field(default_factory=list, alias="nodeIndices")


class NodeClustersMeta(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    count: int
    eps: float
    min_samples: int = Field(alias="minSamples")
    by_resource: bool = Field(alias="byResource")
    by_territory: bool = Field(alias="byTerritory")


class NodeClustersResponse(BaseModel):
    data: list[NodeCluster]
    meta: NodeClustersMeta
