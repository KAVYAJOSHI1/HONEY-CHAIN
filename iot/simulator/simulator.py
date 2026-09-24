import time
import random
import json
import urllib.request
import threading
import argparse

API_URL = "http://localhost:8000/telemetry"
HIVE_ID = "1"

def simulate_telemetry(scenario="NORMAL"):
    """Generates and sends simulated ESP32 sensor data to the backend."""
    # Base values
    temp_base = 34.5
    hum_base = 50.0
    weight_base = 25.0
    
    if scenario == "HIGH_TEMPERATURE":
        temp_base = 38.0
    elif scenario == "HIGH_HUMIDITY":
        hum_base = 70.0
    elif scenario == "WEIGHT_INCREASE":
        weight_base = 31.0
    elif scenario == "WEIGHT_DROP":
        weight_base = 15.0
    elif scenario == "ABNORMAL_HIVE":
        temp_base = 38.0
        hum_base = 75.0
        weight_base = 10.0

    print(f"Running scenario: {scenario}")
    
    while True:
        # Simulate realistic hive metrics with jitter
        payload = {
            "hive_id": HIVE_ID,
            "temperature": round(random.uniform(temp_base - 1.0, temp_base + 1.0), 2),
            "humidity": round(random.uniform(hum_base - 5.0, hum_base + 5.0), 2),
            "weight": round(random.uniform(weight_base - 0.5, weight_base + 0.5), 2),
            "timestamp": int(time.time())
        }
        
        # Introduce occasional anomalies in NORMAL mode
        if scenario == "NORMAL" and random.random() < 0.05:
            payload["temperature"] += 10.0 # Heat spike anomaly
            
        if scenario == "DEVICE_OFFLINE":
            print("Device is offline. Not sending data.")
            time.sleep(10)
            continue
            
        if scenario == "DEMO_MODE":
            payload["weight"] = round(weight_base, 2)
            weight_base += 0.5
            if weight_base >= 31.0:
                print("Harvest threshold crossed! Triggering AI scan and Batch creation on backend...")
                # We could hit other endpoints here, but just simulating weight is enough for Harvest Ready.
                # Let's pause at 31.5 to allow the demo to show the Harvest Ready state
                if weight_base > 31.5:
                    weight_base = 31.5

        try:
            req = urllib.request.Request(API_URL, method="POST")
            req.add_header('Content-Type', 'application/json')
            data = json.dumps(payload).encode('utf-8')
            
            with urllib.request.urlopen(req, data=data) as response:
                print(f"Sent: {payload} | Status: {response.status}")
                
        except Exception as e:
            print(f"Failed to send {payload} | Error: {e}")
            
        time.sleep(10 if scenario != "DEMO_MODE" else 3) # Faster updates for demo mode

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="IoT Hive Simulator")
    parser.add_argument("--scenario", type=str, default="NORMAL", 
                        choices=["NORMAL", "HIGH_TEMPERATURE", "HIGH_HUMIDITY", "WEIGHT_INCREASE", "WEIGHT_DROP", "DEVICE_OFFLINE", "ABNORMAL_HIVE", "DEMO_MODE"],
                        help="The demo scenario to run")
    args = parser.parse_args()
    
    print(f"Starting IoT simulator for hive {HIVE_ID}...")
    simulate_telemetry(args.scenario)
