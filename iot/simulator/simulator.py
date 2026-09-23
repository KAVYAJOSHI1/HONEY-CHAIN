import time
import random
import json
import urllib.request
import threading

API_URL = "http://localhost:8000/telemetry"
HIVE_ID = "hive-101"

def simulate_telemetry():
    """Generates and sends simulated ESP32 sensor data to the backend."""
    while True:
        # Simulate realistic hive metrics
        payload = {
            "hive_id": HIVE_ID,
            "temperature": round(random.uniform(33.0, 36.5), 2), # ideal is ~34.5C
            "humidity": round(random.uniform(40.0, 60.0), 2),
            "weight": round(random.uniform(25.0, 26.5), 2),
            "timestamp": int(time.time())
        }
        
        # Introduce occasional anomalies
        if random.random() < 0.05:
            payload["temperature"] += 10.0 # Heat spike anomaly
            
        try:
            req = urllib.request.Request(API_URL, method="POST")
            req.add_header('Content-Type', 'application/json')
            data = json.dumps(payload).encode('utf-8')
            
            with urllib.request.urlopen(req, data=data) as response:
                print(f"Sent: {payload} | Status: {response.status}")
                
        except Exception as e:
            print(f"Failed to send {payload} | Error: {e}")
            
        time.sleep(10) # Send every 10 seconds for demo purposes

if __name__ == "__main__":
    print(f"Starting IoT simulator for {HIVE_ID}...")
    simulate_telemetry()
