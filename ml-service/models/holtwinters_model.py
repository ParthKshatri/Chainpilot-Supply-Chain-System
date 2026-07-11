import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings("ignore")

from models.base_model import BaseForecaster


class HoltWintersForecaster(BaseForecaster):
    name = "holt_winters"

    def __init__(self):
        self._model_fit  = None
        self._steps_done = 0

    def fit(self, df: pd.DataFrame) -> "HoltWintersForecaster":
        from statsmodels.tsa.holtwinters import ExponentialSmoothing

        series = df.set_index("date")["quantity"].asfreq("D").fillna(method="ffill")

        # Use weekly seasonality only if we have at least 2 full weeks
        use_seasonal = len(series) >= 14
        seasonal_periods = 7 if use_seasonal else None
        trend_type = "add"
        seasonal_type = "add" if use_seasonal else None

        try:
            model = ExponentialSmoothing(
                series,
                trend            = trend_type,
                seasonal         = seasonal_type,
                seasonal_periods = seasonal_periods,
                damped_trend     = True,
            )
            self._model_fit = model.fit(optimized=True)
        except Exception:
            # Fallback: simple exponential smoothing
            from statsmodels.tsa.holtwinters import SimpleExpSmoothing
            model = SimpleExpSmoothing(series)
            self._model_fit = model.fit(optimized=True)

        self._steps_done = len(series)
        return self

    def predict(self, steps: int) -> pd.DataFrame:
        forecast = self._model_fit.forecast(steps)

        # Build confidence intervals using residual std
        residuals = self._model_fit.resid
        std = residuals.std()

        return pd.DataFrame({
            "date":             forecast.index,
            "predicted_usage":  np.maximum(0, forecast.values),
            "lower_bound":      np.maximum(0, forecast.values - 1.28 * std),
            "upper_bound":      np.maximum(0, forecast.values + 1.28 * std),
        })
