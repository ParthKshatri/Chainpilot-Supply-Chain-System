from abc import ABC, abstractmethod
from typing import Dict, List, Tuple
import pandas as pd
import numpy as np


class BaseForecaster(ABC):
    """
    Every model in the pipeline must implement this interface.
    fit() trains on historical data.
    predict() returns forecast for N future days.
    cv_score() returns cross-validation metrics.
    """

    name: str = "base"

    @abstractmethod
    def fit(self, df: pd.DataFrame) -> "BaseForecaster":
        """
        Train on a DataFrame with columns ['date', 'quantity'].
        date must be datetime, quantity must be numeric.
        """
        pass

    @abstractmethod
    def predict(self, steps: int) -> pd.DataFrame:
        """
        Return a DataFrame with columns:
          date            : forecast date (datetime)
          predicted_usage : point forecast
          lower_bound     : 80% prediction interval lower
          upper_bound     : 80% prediction interval upper
        """
        pass

    def cv_score(self, df: pd.DataFrame, n_splits: int = 3) -> Dict[str, float]:
        """
        Time-series cross-validation using expanding window.
        Returns MAE, RMSE, MAPE, and a normalised confidence score 0-1.
        Falls back to full-fit metrics if not enough data.
        """
        from sklearn.model_selection import TimeSeriesSplit
        from sklearn.metrics import mean_absolute_error, mean_squared_error

        if len(df) < 10:
            # Not enough data for CV — fit on all and return placeholder
            try:
                self.fit(df)
                preds = self.predict(1)
                return {"mae": 999, "rmse": 999, "mape": 999, "confidence": 0.4, "cv_folds": 0}
            except Exception:
                return {"mae": 9999, "rmse": 9999, "mape": 9999, "confidence": 0.1, "cv_folds": 0}

        n_splits = min(n_splits, max(2, len(df) // 5))
        tscv = TimeSeriesSplit(n_splits=n_splits)

        maes, rmses, mapes = [], [], []

        for train_idx, test_idx in tscv.split(df):
            train = df.iloc[train_idx].copy()
            test  = df.iloc[test_idx].copy()
            if len(train) < 3:
                continue
            try:
                self.fit(train)
                forecast = self.predict(len(test))
                y_pred = forecast["predicted_usage"].values[:len(test)]
                y_true = test["quantity"].values

                mae  = mean_absolute_error(y_true, y_pred)
                rmse = np.sqrt(mean_squared_error(y_true, y_pred))

                # MAPE — avoid division by zero
                nonzero = y_true != 0
                if nonzero.any():
                    mape = np.mean(np.abs((y_true[nonzero] - y_pred[nonzero]) / y_true[nonzero])) * 100
                else:
                    mape = 100.0

                maes.append(mae)
                rmses.append(rmse)
                mapes.append(mape)
            except Exception:
                continue

        if not maes:
            return {"mae": 9999, "rmse": 9999, "mape": 9999, "confidence": 0.1, "cv_folds": 0}

        avg_mae  = float(np.mean(maes))
        avg_rmse = float(np.mean(rmses))
        avg_mape = float(np.mean(mapes))

        # Confidence: starts at 0.95, penalised by MAPE
        # MAPE 0%  → confidence ~0.95
        # MAPE 20% → confidence ~0.75
        # MAPE 50% → confidence ~0.50
        confidence = max(0.1, min(0.95, 0.95 - (avg_mape / 100) * 0.85))

        # Bonus for more data
        data_bonus = min(0.05, len(df) / 2000)
        confidence = min(0.95, confidence + data_bonus)

        return {
            "mae":        round(avg_mae,  4),
            "rmse":       round(avg_rmse, 4),
            "mape":       round(avg_mape, 4),
            "confidence": round(confidence, 4),
            "cv_folds":   len(maes),
        }
