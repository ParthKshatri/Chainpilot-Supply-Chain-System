from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime, timedelta
import pandas as pd
import numpy as np
from routers import predict

app = FastAPI(
    title="Supply Chain ML Service",
    description="Machine Learning predictions for supply chain management",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router)

@app.get("/")
async def root():
    return {"message": "Supply Chain ML Service", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "OK", "timestamp": datetime.now().isoformat()}
