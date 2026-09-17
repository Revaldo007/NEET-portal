import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine, SessionLocal
from app import models, seed, migrations
from app.routers import auth as auth_router, application, exam, admin

Base.metadata.create_all(bind=engine)

app = FastAPI(title="NEET Examination Portal API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )


UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth_router.router)
app.include_router(application.router)
app.include_router(exam.router)
app.include_router(admin.router)


@app.on_event("startup")
def on_startup():
    # Run schema migrations first (idempotent, safe to repeat)
    migrations.run_migrations(engine)
    # Then seed default data
    db = SessionLocal()
    try:
        seed.run_seed(db)
    finally:
        db.close()


@app.get("/api/health")
def health_check():
    return {"status": "ok"}

