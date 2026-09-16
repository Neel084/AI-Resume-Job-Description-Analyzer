from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.database import Base, engine

from app.routes import conversations
from app.routes import messages
from app.routes import resume
from app.routes import job_matching


# --------------------------------------------------
# Create FastAPI application
# --------------------------------------------------

app = FastAPI(
    title="ResumeAI",
    description="AI-powered Resume & Job Description Analyzer",
    version="1.0.0"
)


# --------------------------------------------------
# CORS Configuration
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "https://ai-resume-job-description-analyzer.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Create Database Tables
# --------------------------------------------------

Base.metadata.create_all(bind=engine)


# --------------------------------------------------
# Include API Routers
# --------------------------------------------------

app.include_router(conversations.router)
app.include_router(messages.router)
app.include_router(resume.router)
app.include_router(job_matching.router)


# --------------------------------------------------
# Root Endpoint
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "ResumeAI API is running 🚀"
    }


# --------------------------------------------------
# Health Check
# --------------------------------------------------

@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }