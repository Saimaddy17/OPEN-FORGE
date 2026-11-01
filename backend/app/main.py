
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import authentication router
from app.api.routes.auth import router as auth_router


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
