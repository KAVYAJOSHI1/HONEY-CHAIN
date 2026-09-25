"""ESP32 hive sensor simulator — posts temperature / humidity / weight readings to the backend.

Examples:
  python simulator.py                                   # NORMAL readings for hive 1 every 10 s
  python simulator.py --scenario HIGH_TEMPERATURE --hives 4
  python simulator.py --scenario DEMO_MODE --hives 1,2,3 --interval 3
Environment:
  API_URL  telemetry endpoint (default http://localhost:8010/telemetry)
"""
import argparse
import json
import os
import random
import time
import urllib.error
import urllib.request

API_URL = os.getenv("API_URL", "http://localhost:8010/telemetry")

SCENARIOS = {
    # scenario: (temp base, humidity base, weight base, weight drift per tick)
    "NORMAL": (34.5, 52.0, 25.0, 0.05),
    "HIGH_TEMPERATURE": (38.2, 52.0, 25.0, 0.0),
    "HIGH_HUMIDITY": (34.5, 71.0, 25.0, 0.0),
    "WEIGHT_INCREASE": (34.5, 52.0, 29.0, 0.4),
    "WEIGHT_DROP": (34.5, 52.0, 26.0, -1.5),
    "ABNORMAL_HIVE": (38.5, 76.0, 20.0, -1.2),
    "DEVICE_OFFLINE": None,
    "DEMO_MODE": (34.5, 52.0, 27.0, 0.5),
}


def post(payload: dict) -> str:
    req = urllib.request.Request(API_URL, data=json.dumps(payload).encode(), method="POST",
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as res:
        body = json.loads(res.read() or b"{}")
        return f"{res.status} alerts={body.get('alerts_generated', 0)} status={body.get('hive_status', '?')}"


def last_weight(hive_id: int):
    """Start from the hive's real scale reading so the first sample isn't a fake weight jump."""
    base = API_URL.rsplit("/telemetry", 1)[0]
    try:
        with urllib.request.urlopen(f"{base}/hives/{hive_id}", timeout=10) as res:
            return json.loads(res.read()).get("latest_weight")
    except Exception:
        return None


def run(scenario: str, hive_ids: list, interval: float):
    params = SCENARIOS[scenario]
    print(f"Simulating {scenario} for hives {hive_ids} -> {API_URL}")
    default = params[2] if params else 25.0
    # Scenarios that set an explicit weight profile keep it; others continue from the real weight.
    keep_profile = scenario in ("WEIGHT_INCREASE", "WEIGHT_DROP", "ABNORMAL_HIVE")
    weights = {h: default if keep_profile else (last_weight(h) or default) for h in hive_ids}

    while True:
        if params is None:
            print("Device offline — no readings sent.")
            time.sleep(interval)
            continue

        temp_base, hum_base, _, drift = params
        for hive_id in hive_ids:
            weights[hive_id] = max(5.0, weights[hive_id] + drift + random.uniform(-0.05, 0.05))
            if scenario == "DEMO_MODE" and weights[hive_id] > 31.5:
                weights[hive_id] = 31.5  # hold at harvest-ready so the demo can show it
            temp = random.uniform(temp_base - 0.5, temp_base + 0.5)
            if scenario == "NORMAL" and random.random() < 0.03:
                temp += 4.0  # occasional heat spike for the anomaly detector
            payload = {
                "hive_id": hive_id,
                "temperature": round(temp, 1),
                "humidity": round(random.uniform(hum_base - 2.0, hum_base + 2.0), 1),
                "weight": round(weights[hive_id], 1),
            }
            try:
                print(f"hive {hive_id}: {payload} -> {post(payload)}")
            except urllib.error.HTTPError as exc:
                print(f"hive {hive_id}: rejected ({exc.code}) {exc.read().decode(errors='ignore')}")
            except Exception as exc:
                print(f"hive {hive_id}: backend unreachable ({exc}); retrying")
        time.sleep(interval)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="IoT hive simulator")
    parser.add_argument("--scenario", default="NORMAL", choices=list(SCENARIOS))
    parser.add_argument("--hives", default=os.getenv("HIVE_IDS", "1"), help="Comma-separated hive ids (default 1)")
    parser.add_argument("--interval", type=float, default=float(os.getenv("INTERVAL", "10")), help="Seconds between readings")
    args = parser.parse_args()
    run(args.scenario, [int(h) for h in args.hives.split(",") if h.strip()], args.interval)
