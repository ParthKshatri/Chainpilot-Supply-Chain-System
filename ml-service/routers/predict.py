from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging

from pipeline import run_pipeline

router = APIRouter()
logger = logging.getLogger(__name__)


class UsagePoint(BaseModel):
    date: str
    quantity: float


class PredictionRequest(BaseModel):
    material_id:    str
    material_name:  str
    current_stock:  float
    lead_time_days: int  = 7
    usage_data:     List[UsagePoint]
    forecast_days:  int  = 90
    use_ensemble:   bool = True


class ModelResult(BaseModel):
    model_name:      str
    success:         bool
    training_time_s: float
    mae:             Optional[float] = None
    rmse:            Optional[float] = None
    mape:            Optional[float] = None
    confidence:      Optional[float] = None
    cv_folds:        Optional[int]   = None
    is_best:         bool
    error:           Optional[str]   = None


class PredictionResponse(BaseModel):
    material_id:               str
    best_model:                str
    used_ensemble:             bool
    ensemble_top_n:            int
    models_compared:           List[ModelResult]
    data_points:               int
    trend:                     str
    predicted_daily_usage:     float
    stockout_date:             Optional[str] = None
    resupply_date:             Optional[str] = None
    recommended_order_quantity: float
    confidence:                float
    forecast_data:             List[Dict[str, Any]]
    model_used:                str


@router.post("/predict", response_model=PredictionResponse)
async def generate_prediction(req: PredictionRequest):
    if len(req.usage_data) < 3:
        raise HTTPException(status_code=400, detail="Need at least 3 data points")

    usage_list = [{"date": u.date, "quantity": u.quantity} for u in req.usage_data]

    try:
        result = run_pipeline(
            usage_data     = usage_list,
            current_stock  = req.current_stock,
            lead_time_days = req.lead_time_days,
            forecast_days  = req.forecast_days,
            use_ensemble   = req.use_ensemble,
        )
    except Exception as exc:
        logger.exception("Pipeline error")
        raise HTTPException(status_code=500, detail=str(exc))

    result["material_id"] = req.material_id
    result["model_used"]  = (
        f"ensemble({result['best_model']}+{result['ensemble_top_n']-1})"
        if result["used_ensemble"] else result["best_model"]
    )
    return result


@router.get("/models")
async def list_models():
    return {
        "models": [
            {"name": "linear_baseline", "min_rows": 3,  "always_available": True},
            {"name": "holt_winters",    "min_rows": 10, "always_available": False},
            {"name": "sarima",          "min_rows": 14, "always_available": False},
            {"name": "xgboost",         "min_rows": 20, "always_available": False},
        ]
    }


@router.get("/predict/health")
async def predict_health():
    return {"status": "ok", "models": ["linear_baseline","holt_winters","sarima","xgboost"]}
