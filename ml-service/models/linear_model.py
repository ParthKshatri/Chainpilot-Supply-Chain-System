import pandas as pd
import numpy as np
from sklearn.linear_model import Ridge
from sklearn.preprocessing import PolynomialFeatures
import warnings
warnings.filterwarnings("ignore")

from models.base_model import BaseForecaster


class LinearBaselineForecaster(BaseForecaster):
    """
    Polynomial Ridge regression — fast, always works, used as the
    guaranteed fallback when all other models fail.
    """
    name = "linear_baseline"

    def __init__(self, degree: int = 2):
        self._model   = None
        self._poly    = None
        self._n_train = 0

    def fit(self, df: pd.DataFrame) -> "LinearBaselineForecaster":
        series = df.sort_values("date")["quantity"].values.astype(float)
        self._n_train = len(series)

        X = np.arange(len(series)).reshape(-1, 1)
        self._poly  = PolynomialFeatures(degree=2)
        X_poly      = self._poly.fit_transform(X)

        self._model = Ridge(alpha=1.0)
        self._model.fit(X_poly, series)
        return self

    def predict(self, steps: int) -> pd.DataFrame:
        future_idx   = np.arange(self._n_train, self._n_train + steps).reshape(-1, 1)
        future_poly  = self._poly.transform(future_idx)
        preds        = np.maximum(0, self._model.predict(future_poly))

        std = preds.std() if len(preds) > 1 else preds.mean() * 0.15
        last_date = pd.Timestamp.today().normalize()
        dates = [last_date + pd.Timedelta(days=i+1) for i in range(steps)]

        return pd.DataFrame({
            "date":             dates,
            "predicted_usage":  preds,
            "lower_bound":      np.maximum(0, preds - 1.28 * std),
            "upper_bound":      np.maximum(0, preds + 1.28 * std),
        })
