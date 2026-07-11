import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings("ignore")

from models.base_model import BaseForecaster


def _make_features(df: pd.DataFrame) -> pd.DataFrame:
    """Engineer lag + date features from a time-indexed quantity series."""
    d = df.copy()
    d = d.sort_values("date").reset_index(drop=True)
    d["dayofweek"]  = d["date"].dt.dayofweek
    d["dayofmonth"] = d["date"].dt.day
    d["month"]      = d["date"].dt.month
    d["weekofyear"] = d["date"].dt.isocalendar().week.astype(int)

    for lag in [1, 2, 3, 7, 14]:
        d[f"lag_{lag}"] = d["quantity"].shift(lag)

    # Rolling means
    d["roll_7"]  = d["quantity"].shift(1).rolling(7,  min_periods=1).mean()
    d["roll_14"] = d["quantity"].shift(1).rolling(14, min_periods=1).mean()
    d["roll_30"] = d["quantity"].shift(1).rolling(30, min_periods=1).mean()

    # Expanding mean (trend signal)
    d["expanding_mean"] = d["quantity"].shift(1).expanding(min_periods=1).mean()

    return d.dropna()


class XGBoostForecaster(BaseForecaster):
    name = "xgboost"

    def __init__(self):
        self._model = None
        self._last_row = None
        self._history  = None

    def fit(self, df: pd.DataFrame) -> "XGBoostForecaster":
        from xgboost import XGBRegressor

        featured = _make_features(df)
        if len(featured) < 5:
            raise ValueError("Not enough data for XGBoost after feature engineering")

        FEATURE_COLS = [c for c in featured.columns if c not in ("date", "quantity")]
        X = featured[FEATURE_COLS]
        y = featured["quantity"]

        self._model = XGBRegressor(
            n_estimators    = 300,
            learning_rate   = 0.05,
            max_depth       = 4,
            subsample       = 0.8,
            colsample_bytree= 0.8,
            random_state    = 42,
            verbosity       = 0,
        )
        self._model.fit(X, y, verbose=False)
        self._history = df.copy()
        return self

    def predict(self, steps: int) -> pd.DataFrame:
        history = self._history.copy()
        preds, dates = [], []
        last_date = pd.to_datetime(history["date"].max())

        for i in range(steps):
            future_date = last_date + pd.Timedelta(days=i+1)
            temp_row    = pd.DataFrame([{"date": future_date, "quantity": history["quantity"].mean()}])
            temp_df     = pd.concat([history, temp_row], ignore_index=True)
            featured    = _make_features(temp_df)

            if len(featured) == 0:
                pred = history["quantity"].mean()
            else:
                FEATURE_COLS = [c for c in featured.columns if c not in ("date", "quantity")]
                last_row = featured.iloc[[-1]][FEATURE_COLS]
                pred = float(self._model.predict(last_row)[0])
                pred = max(0, pred)

            preds.append(pred)
            dates.append(future_date)

            # Add predicted value to rolling history for next step
            new_row = pd.DataFrame([{"date": future_date, "quantity": pred}])
            history = pd.concat([history, new_row], ignore_index=True)

        preds_arr = np.array(preds)
        std = preds_arr.std() if len(preds_arr) > 1 else preds_arr.mean() * 0.1
        return pd.DataFrame({
            "date":             dates,
            "predicted_usage":  np.maximum(0, preds_arr),
            "lower_bound":      np.maximum(0, preds_arr - 1.28 * std),
            "upper_bound":      np.maximum(0, preds_arr + 1.28 * std),
        })
