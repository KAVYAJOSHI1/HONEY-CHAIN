import numpy as np
from sklearn.ensemble import IsolationForest

class HiveAnomalyDetector:
    def __init__(self):
        # We use an Isolation Forest to detect anomalies without requiring labeled data
        self.model = IsolationForest(contamination=0.05, random_state=42)
        self.is_trained = False

    def train(self, historical_data):
        """
        Trains the model on historical sensor telemetry.
        historical_data should be a list of [temperature, humidity, weight] arrays.
        """
        X = np.array(historical_data)
        self.model.fit(X)
        self.is_trained = True

    def predict(self, telemetry):
        """
        Predicts if a new telemetry reading is an anomaly.
        telemetry: [temperature, humidity, weight]
        Returns: True if anomaly, False if normal.
        """
        if not self.is_trained:
            # If no historical data is available, fallback to simple rule-based thresholds
            temp, hum, weight = telemetry
            is_anomaly = (temp < 30.0 or temp > 38.0) or (hum < 30.0 or hum > 70.0)
            return is_anomaly

        X = np.array([telemetry])
        prediction = self.model.predict(X)
        return prediction[0] == -1  # -1 indicates anomaly in IsolationForest

if __name__ == "__main__":
    detector = HiveAnomalyDetector()
    
    # Mock normal data (temp ~34.5, hum ~50.0, weight ~25.0)
    normal_data = [
        [34.5, 50.1, 25.1],
        [34.6, 49.8, 25.0],
        [34.4, 50.5, 25.2],
        [34.7, 51.0, 24.9]
    ]
    
    detector.train(normal_data)
    
    # Test normal point
    is_anomaly = detector.predict([34.5, 50.2, 25.1])
    print(f"Normal point is anomaly: {is_anomaly}")
    
    # Test anomaly point (heat spike)
    is_anomaly = detector.predict([45.0, 50.2, 25.1])
    print(f"Heat spike point is anomaly: {is_anomaly}")
