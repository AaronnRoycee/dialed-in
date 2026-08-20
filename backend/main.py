import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.recommendation import ShotContext, recommend_next_shot

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Dialed In API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


class RecommendRequest(BaseModel):
    dose_g: float
    target_yield_g: float
    actual_yield_g: float
    target_time_s: float
    actual_time_s: float
    external_grind_setting: float | None = None
    internal_burr_setting: float | None = None
    overall_rating: float | None = None
    descriptors: list[str] = Field(default_factory=list)


@app.post("/recommend")
async def recommend(req: RecommendRequest):
    shot = ShotContext(
        dose_g=req.dose_g,
        target_yield_g=req.target_yield_g,
        actual_yield_g=req.actual_yield_g,
        target_time_s=req.target_time_s,
        actual_time_s=req.actual_time_s,
        external_grind_setting=req.external_grind_setting or 0,
        internal_burr_setting=req.internal_burr_setting or 0,
        overall_rating=req.overall_rating,
        descriptors=req.descriptors,
    )
    return recommend_next_shot(shot)
