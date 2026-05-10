from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import companies, documents, notifications
from app.core.config import settings

app = FastAPI(
    title="Integris API",
    version="0.1.0",
    description="KSeF invoice processing middleware",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.app_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(companies.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")


@app.get("/health", tags=["system"])
async def health() -> dict:
    return {"status": "ok", "env": settings.app_env}
