from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import engine, Base

# Clean and unified router imports
from app.api.health import router as health_router
from app.api.routers.telemetry import router as telemetry_router
from app.api import auth, documents, orchestrator, projects, agents, analytics, settings as app_settings

# Import models to ensure they are registered with SQLAlchemy Base before creation
from app.models.user import User
from app.models.document import Document
from app.models.chat import Thread, Message
from app.models.project import Project
from app.models.agent import AgentConfig
from app.models.analytics import AnalyticEvent
from app.models.user_setting import UserSetting

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Automatically creates the PostgreSQL database tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        lifespan=lifespan
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register API Routers with Enterprise-grade Swagger tags
    app.include_router(health_router, prefix=settings.API_V1_STR, tags=["System"])
    app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
    app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])
    app.include_router(orchestrator.router, prefix="/api/v1/orchestrator", tags=["Orchestration Engine"])
    
    # Phase 1 Modules
    app.include_router(projects.router, prefix="/api/v1/projects", tags=["Projects"])
    app.include_router(agents.router, prefix="/api/v1/agents", tags=["Agent Center"])
    app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
    app.include_router(app_settings.router, prefix="/api/v1/settings", tags=["Settings & Secrets"])
    
    # Telemetry WebSockets
    app.include_router(telemetry_router)

    return app

app = create_app()