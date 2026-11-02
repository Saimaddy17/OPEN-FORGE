
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import authentication router
from app.api.routes.auth import router as auth_router
from app.api.routes.admin import router as admin_router
from app.api.routes.applications import router as applications_router
from app.api.routes.categories import router as categories_router
from app.api.routes.submissions import router as submissions_router


app = FastAPI(
    title="OpenForge API",
    description="API for the OpenForge Open-Source Application Marketplace",
    version="1.0.0",
)


# Frontend-backend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register authentication routes
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(applications_router)
app.include_router(categories_router)
app.include_router(submissions_router)


# Root endpoint
@app.get("/")
def root():
    return {
        "message": "Welcome to OpenForge API",
        "status": "running",
    }


# Health check endpoint
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "application": "OpenForge",
        "version": "1.0.0",
    }


# API information endpoint
@app.get("/api")
def api_information():
    return {
        "name": "OpenForge",
        "purpose": "Open-Source Application Marketplace",
        "features": [
            "Discover open-source applications",
            "Download applications",
            "Publish open-source applications",
            "Verify application submissions",
        ],
    }
