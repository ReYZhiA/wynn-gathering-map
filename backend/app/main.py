from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import dev_gathering_nodes, gathering_nodes, health, node_clusters, territories
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=settings.cors_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix="/api")
    app.include_router(gathering_nodes.router, prefix="/api")
    app.include_router(territories.router, prefix="/api")
    app.include_router(node_clusters.router, prefix="/api")
    app.include_router(dev_gathering_nodes.router, prefix="/api")

    @app.get("/")
    async def root() -> dict[str, object]:
        return {
            "status": "ok",
            "docs": "/docs",
            "api": {
                "health": "/api/health",
                "gatheringNodes": "/api/gathering-nodes",
                "territories": "/api/territories",
                "nodeClusters": "/api/node-clusters",
            },
        }

    return app


app = create_app()
