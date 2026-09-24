import numpy as np
from sklearn.ensemble import IsolationForest

# Healthy brood-nest operating envelope used to fit the baseline model.
BASELINE_TEMP = (34.5, 0.6)      # mean °C, std
BASELINE_HUMIDITY = (52.0, 4.0)  # mean %, std
BASELINE_WEIGHT = (26.0, 4.0)    # mean kg, std


class HiveAnomalyDetector:
    """Unsupervised multivariate anomaly detector over [temperature, humidity, weight]."""

    def __init__(self):
        self.model = IsolationForest(contamination=0.02, random_state=42)
        self.is_trained = False

    def train(self, historical_data):
        """Fit on a list of [temperature, humidity, weight] rows."""
        X = np.array(historical_data, dtype=float)
        self.model.fit(X)
        self.is_trained = True

    def train_on_baseline(self, samples: int = 2000):
        """Fit on a synthetic healthy-colony baseline so the model is usable before real history exists."""
        rng = np.random.default_rng(42)
        X = np.column_stack([
            rng.normal(*BASELINE_TEMP, samples),
            rng.normal(*BASELINE_HUMIDITY, samples),
            rng.normal(*BASELINE_WEIGHT, samples),
        ])
        self.train(X)

    def predict(self, telemetry) -> bool:
        """Return True if the [temperature, humidity, weight] reading is anomalous."""
        if not self.is_trained:
            temp, hum, _ = telemetry
            return (temp < 30.0 or temp > 38.0) or (hum < 30.0 or hum > 70.0)

        X = np.array([telemetry], dtype=float)
        return bool(self.model.predict(X)[0] == -1)


if __name__ == "__main__":
    detector = HiveAnomalyDetector()
    detector.train_on_baseline()
    print(f"Normal point is anomaly: {detector.predict([34.5, 50.2, 25.1])}")
    print(f"Heat spike point is anomaly: {detector.predict([45.0, 50.2, 25.1])}")
