"""
Multi-model comparison pipeline.
Models: SARIMA, XGBoost, Holt-Winters, Linear Baseline (weighted ensemble)
Removed: Prophet (stan_backend issue), LSTM (tensorflow too heavy)
"""

import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

from models.base_model        import BaseForecaster
from models.sarima_model      import SARIMAForecaster
from models.xgboost_model     import XGBoostForecaster
from models.holtwinters_model import HoltWintersForecaster
from models.linear_model      import LinearBaselineForecaster

logger = logging.getLogger(__name__)

MIN_ROWS_HOLTWINTERS = 10
MIN_ROWS_SARIMA      = 14
MIN_ROWS_XGBOOST     = 20
ENSEMBLE_TOP_N       = 3
TIMEOUT_SECONDS      = 60


def preprocess(raw: List[dict]) -> pd.DataFrame:
    df = pd.DataFrame(raw)
    df["date"]     = pd.to_datetime(df["date"])
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(0)
    df = df.groupby("date", as_index=False)["quantity"].sum()
    df = df.sort_values("date").reset_index(drop=True)

    full_range = pd.date_range(df["date"].min(), df["date"].max(), freq="D")
    df = (df.set_index("date")
            .reindex(full_range)
            .rename_axis("date")
            .reset_index())
    df["quantity"] = df["quantity"].fillna(method="ffill", limit=7).fillna(0)

    mean, std = df["quantity"].mean(), df["quantity"].std()
    if std > 0:
        mask = (df["quantity"] - mean).abs() > 4 * std
        df.loc[mask, "quantity"] = (
            df["quantity"].rolling(7, min_periods=1, center=True).median()
        )
    return df


def detect_trend(values: List[float]) -> str:
    if len(values) < 3:
        return "stable"
    arr    = np.array(values)
    recent = arr[-min(7, len(arr)):]
    older  = arr[:min(7, len(arr))]
    cv     = arr.std() / arr.mean() if arr.mean() > 0 else 0
    if cv > 0.5:                        return "volatile"
    if recent.mean() > older.mean() * 1.15: return "increasing"
    if recent.mean() < older.mean() * 0.85: return "decreasing"
    return "stable"


def _run_model(model: BaseForecaster, df: pd.DataFrame,
               forecast_steps: int, n_cv_splits: int) -> Optional[Dict]:
    t0 = time.time()
    try:
        metrics     = model.cv_score(df, n_splits=n_cv_splits)
        model.fit(df)
        forecast_df = model.predict(forecast_steps)
        return {
            "model_name":      model.name,
            "metrics":         metrics,
            "forecast":        forecast_df,
            "training_time_s": round(time.time() - t0, 2),
            "success":         True,
        }
    except Exception as exc:
        logger.warning(f"Model {model.name} failed: {exc}")
        return {
            "model_name":      model.name,
            "metrics":         {"mae":9999,"rmse":9999,"mape":9999,"confidence":0.1,"cv_folds":0},
            "forecast":        None,
            "training_time_s": round(time.time() - t0, 2),
            "success":         False,
            "error":           str(exc),
        }


def _weighted_ensemble(results: List[Dict], top_n: int, steps: int) -> pd.DataFrame:
    top = sorted(
        [r for r in results if r["success"] and r["forecast"] is not None],
        key=lambda x: x["metrics"]["mape"],
    )[:top_n]

    if not top:
        raise ValueError("No successful models for ensemble")

    mapes   = np.array([r["metrics"]["mape"] for r in top])
    inv     = 1.0 / (mapes + 1e-9)
    weights = inv / inv.sum()

    blended = np.zeros((steps, 3))  # usage, lower, upper
    for w, r in zip(weights, top):
        fc = r["forecast"]
        n  = min(steps, len(fc))
        blended[:n, 0] += w * fc["predicted_usage"].values[:n]
        blended[:n, 1] += w * fc["lower_bound"].values[:n]
        blended[:n, 2] += w * fc["upper_bound"].values[:n]

    dates = top[0]["forecast"]["date"].values[:steps]
    return pd.DataFrame({
        "date":            dates,
        "predicted_usage": np.maximum(0, blended[:, 0]),
        "lower_bound":     np.maximum(0, blended[:, 1]),
        "upper_bound":     np.maximum(0, blended[:, 2]),
    })


def run_pipeline(usage_data: List[dict], current_stock: float,
                 lead_time_days: int, forecast_days: int = 90,
                 use_ensemble: bool = True, n_cv_splits: int = 3) -> Dict:

    df = preprocess(usage_data)
    n  = len(df)
    trend = detect_trend(df["quantity"].tolist())

    # Build candidate list based on data size
    candidates: List[BaseForecaster] = [LinearBaselineForecaster()]
    if n >= MIN_ROWS_HOLTWINTERS:
        candidates.append(HoltWintersForecaster())
    if n >= MIN_ROWS_SARIMA:
        candidates.append(SARIMAForecaster())
    if n >= MIN_ROWS_XGBOOST:
        candidates.append(XGBoostForecaster())

    logger.info(f"Pipeline: {len(candidates)} models on {n} rows")

    # Run in parallel
    results = []
    with ThreadPoolExecutor(max_workers=min(len(candidates), 4)) as executor:
        futures = {
            executor.submit(_run_model, m, df, forecast_days, n_cv_splits): m.name
            for m in candidates
        }
        for future in as_completed(futures, timeout=TIMEOUT_SECONDS * len(candidates)):
            result = future.result()
            if result:
                results.append(result)

    # Guarantee fallback
    if not any(r["success"] for r in results):
        fb = LinearBaselineForecaster()
        fb.fit(df)
        results = [{
            "model_name":      "linear_baseline",
            "metrics":         {"mae":0,"rmse":0,"mape":50,"confidence":0.4,"cv_folds":0},
            "forecast":        fb.predict(forecast_days),
            "training_time_s": 0,
            "success":         True,
        }]

    successful = sorted(
        [r for r in results if r["success"] and r["forecast"] is not None],
        key=lambda x: x["metrics"]["mape"],
    )
    best = successful[0]

    # Ensemble
    if use_ensemble and len(successful) >= 2:
        try:
            final_forecast = _weighted_ensemble(successful, ENSEMBLE_TOP_N, forecast_days)
            used_ensemble  = True
            top_n_r  = successful[:ENSEMBLE_TOP_N]
            mapes    = np.array([r["metrics"]["mape"] for r in top_n_r])
            inv      = 1.0 / (mapes + 1e-9)
            w        = inv / inv.sum()
            conf     = float(sum(w[i] * top_n_r[i]["metrics"]["confidence"] for i in range(len(top_n_r))))
            final_confidence = min(0.97, conf * 1.05)
        except Exception as exc:
            logger.warning(f"Ensemble failed: {exc}")
            final_forecast   = best["forecast"]
            used_ensemble    = False
            final_confidence = best["metrics"]["confidence"]
    else:
        final_forecast   = best["forecast"]
        used_ensemble    = False
        final_confidence = best["metrics"]["confidence"]

    avg_daily  = max(float(final_forecast["predicted_usage"].mean()), 0.001)
    stock_left = current_stock
    stockout_date = None

    for _, row in final_forecast.iterrows():
        stock_left -= row["predicted_usage"]
        if stock_left <= 0:
            stockout_date = row["date"]
            break

    if stockout_date is not None:
        resupply_dt = pd.Timestamp(stockout_date) - pd.Timedelta(days=lead_time_days)
        if resupply_dt < pd.Timestamp.today():
            resupply_dt = pd.Timestamp.today() + pd.Timedelta(days=1)
    else:
        extra = int(stock_left / avg_daily) if avg_daily > 0 else 999
        stockout_date = final_forecast["date"].iloc[-1] + pd.Timedelta(days=extra)
        resupply_dt   = pd.Timestamp(stockout_date) - pd.Timedelta(days=lead_time_days)

    recommended_order = round(avg_daily * (30 + lead_time_days), 2)

    running_stock = current_stock
    forecast_data = []
    for _, row in final_forecast.iterrows():
        running_stock = max(0, running_stock - row["predicted_usage"])
        forecast_data.append({
            "date":            str(row["date"])[:10],
            "predicted_stock": round(running_stock, 2),
            "predicted_usage": round(float(row["predicted_usage"]), 2),
            "lower_bound":     round(max(0, float(row["lower_bound"])), 2),
            "upper_bound":     round(float(row["upper_bound"]), 2),
        })

    models_compared = [{
        "model_name":      r["model_name"],
        "success":         r["success"],
        "training_time_s": r["training_time_s"],
        "mae":             r["metrics"].get("mae"),
        "rmse":            r["metrics"].get("rmse"),
        "mape":            r["metrics"].get("mape"),
        "confidence":      r["metrics"].get("confidence"),
        "cv_folds":        r["metrics"].get("cv_folds"),
        "is_best":         r["model_name"] == best["model_name"] and not used_ensemble,
        "error":           r.get("error"),
    } for r in results]

    return {
        "best_model":                 best["model_name"],
        "used_ensemble":              used_ensemble,
        "ensemble_top_n":             ENSEMBLE_TOP_N if used_ensemble else 1,
        "models_compared":            models_compared,
        "data_points":                n,
        "trend":                      trend,
        "predicted_daily_usage":      round(avg_daily, 3),
        "stockout_date":              str(stockout_date)[:10] if stockout_date is not None else None,
        "resupply_date":              str(resupply_dt)[:10]   if resupply_dt   is not None else None,
        "recommended_order_quantity": recommended_order,
        "confidence":                 round(final_confidence, 4),
        "forecast_data":              forecast_data,
    }
