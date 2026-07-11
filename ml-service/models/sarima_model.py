import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings("ignore")

from models.base_model import BaseForecaster


class SARIMAForecaster(BaseForecaster):
    name = "sarima"

    def __init__(self):
        self._model_fit = None
        self._order = None
        self._seasonal_order = None

    def _select_order(self, series: pd.Series):
        """Simple grid search over common ARIMA orders."""
        from statsmodels.tsa.statespace.sarimax import SARIMAX

        best_aic = np.inf
        best_order = (1, 1, 1)
        best_seasonal = (1, 0, 1, 7)

        candidates = [
            ((1,1,1), (1,0,1,7)),
            ((2,1,1), (1,0,1,7)),
            ((1,1,2), (1,0,1,7)),
            ((0,1,1), (0,0,1,7)),
            ((1,1,0), (1,0,0,7)),
        ]

        for order, seasonal in candidates:
            try:
                m = SARIMAX(series, order=order, seasonal_order=seasonal,
                            enforce_stationarity=False, enforce_invertibility=False)
                r = m.fit(disp=False, maxiter=50)
                if r.aic < best_aic:
                    best_aic = r.aic
                    best_order = order
                    best_seasonal = seasonal
            except Exception:
                continue

        return best_order, best_seasonal

    def fit(self, df: pd.DataFrame) -> "SARIMAForecaster":
        from statsmodels.tsa.statespace.sarimax import SARIMAX

        series = df.set_index("date")["quantity"].asfreq("D").fillna(method="ffill")

        if len(series) >= 21:
            self._order, self._seasonal_order = self._select_order(series)
        else:
            self._order = (1, 1, 1)
            self._seasonal_order = (0, 0, 0, 0)

        model = SARIMAX(series,
                        order=self._order,
                        seasonal_order=self._seasonal_order,
                        enforce_stationarity=False,
                        enforce_invertibility=False)
        self._model_fit = model.fit(disp=False, maxiter=100)
        return self

    def predict(self, steps: int) -> pd.DataFrame:
        forecast = self._model_fit.forecast(steps=steps)
        lower    = forecast * 0.85
        upper    = forecast * 1.15

        return pd.DataFrame({
            "date":             forecast.index,
            "predicted_usage":  np.maximum(0, forecast.values),
            "lower_bound":      np.maximum(0, lower.values),
            "upper_bound":      np.maximum(0, upper.values),
        })
