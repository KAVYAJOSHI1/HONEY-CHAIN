"""Explainable hive health, yield forecasting and recommendations (rule-based prototype models)."""
from sqlalchemy.orm import Session

from . import models

IDEAL_TEMP = 34.5
HARVEST_WEIGHT_KG = 30.0
EMPTY_HIVE_WEIGHT_KG = 18.0
STATUS_ORDER = ["HEALTHY", "WATCH", "WARNING", "CRITICAL"]


def status_for_score(score: int) -> str:
    if score >= 80:
        return "HEALTHY"
    if score >= 65:
        return "WATCH"
    if score >= 45:
        return "WARNING"
    return "CRITICAL"


def compute_health(db: Session, hive_id: int) -> dict:
    records = (
        db.query(models.Telemetry)
        .filter(models.Telemetry.hive_id == hive_id)
        .order_by(models.Telemetry.timestamp.desc())
        .limit(10)
        .all()
    )

    if not records:
        return {
            "hive_id": hive_id,
            "health_score": 50,
            "status": "WATCH",
            "factors": {"temperature": 50, "humidity": 50, "weight": 50, "anomalies": 100, "disease_risk": 100},
            "alerts": ["No telemetry data recorded yet"],
            "recommendations": ["Check device connectivity"],
            "score_explanation": "Insufficient telemetry to calculate a precise health score.",
        }

    latest = records[0]
    alerts, recs, explanations = [], [], []

    # 1. Temperature (ideal brood nest 34.5 °C ± 1 °C)
    temp_diff = abs(latest.temperature - IDEAL_TEMP)
    temp_score = 100 if temp_diff <= 1.0 else max(0, int(100 - (temp_diff - 1.0) * 20))
    if latest.temperature > 37.0:
        alerts.append(f"High temperature ({latest.temperature}°C)")
        recs.append("Inspect hive ventilation and verify sensor placement.")
        explanations.append(f"temperature high ({latest.temperature}°C)")
    elif latest.temperature < 32.0:
        alerts.append(f"Low temperature ({latest.temperature}°C)")
        recs.append("Ensure hive insulation is intact.")
        explanations.append(f"temperature low ({latest.temperature}°C)")

    # 2. Humidity (ideal 40–65 %)
    hum_score = 100
    if latest.humidity > 65.0:
        hum_score = max(0, int(100 - (latest.humidity - 65.0) * 3))
        alerts.append(f"High humidity ({latest.humidity}%)")
        recs.append("Reduce moisture around the hive base and improve airflow.")
        explanations.append(f"humidity elevated ({latest.humidity}%)")
    elif latest.humidity < 40.0:
        hum_score = max(0, int(100 - (40.0 - latest.humidity) * 3))
        explanations.append(f"humidity low ({latest.humidity}%)")

    # 3. Weight trend over the window
    weight_score = 90
    if len(records) > 1:
        weight_delta = latest.weight - records[-1].weight
        if weight_delta < -1.0:
            weight_score = 40
            alerts.append(f"Sudden weight drop ({weight_delta:.1f} kg)")
            recs.append("Check for swarming or robbing activity.")
            explanations.append("sudden weight drop")
        elif weight_delta > 0.1:
            weight_score = 98

    # 4. Open (unresolved) warning/critical alerts
    open_alerts = (
        db.query(models.Alert)
        .filter(
            models.Alert.hive_id == hive_id,
            models.Alert.severity.in_(["WARNING", "CRITICAL"]),
            models.Alert.resolved == False,  # noqa: E712
        )
        .count()
    )
    anomaly_score = max(20, 100 - open_alerts * 15)
    if open_alerts:
        explanations.append(f"{open_alerts} open alert{'s' if open_alerts != 1 else ''}")

    # 5. Disease risk from latest vision analysis
    latest_ai = (
        db.query(models.AIAnalysis)
        .filter(models.AIAnalysis.hive_id == hive_id)
        .order_by(models.AIAnalysis.timestamp.desc())
        .first()
    )
    disease_score = 95
    if latest_ai and latest_ai.varroa_count > 5:
        disease_score = max(10, 100 - latest_ai.varroa_count * 7)
        alerts.append(f"Varroa mite risk ({latest_ai.varroa_count} mites detected)")
        recs.append("Perform a manual colony inspection for Varroa infestation.")
        explanations.append(f"high Varroa count ({latest_ai.varroa_count})")

    overall = int(
        temp_score * 0.30 + hum_score * 0.20 + weight_score * 0.20 + anomaly_score * 0.15 + disease_score * 0.15
    )
    overall = max(0, min(100, overall))

    # A single severe factor (e.g. heavy Varroa load) must not be averaged away by healthy ones:
    # the status is the worse of the score-based status and the weakest factor's status.
    factor_scores = [temp_score, hum_score, weight_score, anomaly_score, disease_score]
    weakest = min(factor_scores)
    factor_status = "CRITICAL" if weakest < 30 else "WARNING" if weakest < 60 else "WATCH" if weakest < 85 else "HEALTHY"
    status = max(status_for_score(overall), factor_status, key=STATUS_ORDER.index)

    explanation = (
        "Environmental parameters and colony status are within optimal ranges."
        if not explanations
        else "Score affected by " + ", ".join(explanations) + "."
    )

    return {
        "hive_id": hive_id,
        "health_score": overall,
        "status": status,
        "factors": {
            "temperature": temp_score,
            "humidity": hum_score,
            "weight": weight_score,
            "anomalies": anomaly_score,
            "disease_risk": disease_score,
        },
        "alerts": alerts,
        "recommendations": list(dict.fromkeys(recs)),
        "score_explanation": explanation,
    }


def compute_productivity(db: Session, hive_id: int) -> dict:
    records = (
        db.query(models.Telemetry)
        .filter(models.Telemetry.hive_id == hive_id)
        .order_by(models.Telemetry.timestamp.desc())
        .limit(15)
        .all()
    )

    if not records:
        return {
            "hive_id": hive_id,
            "current_weight_kg": 0.0,
            "predicted_yield_kg": 0.0,
            "weight_change_kg": 0.0,
            "confidence": 0.5,
            "trend": "STABLE",
            "harvest_ready": False,
            "harvest_window": "Insufficient data",
            "factors": ["No telemetry recorded yet"],
            "label": "Estimated Yield (Prototype Model)",
        }

    current_weight = records[0].weight
    avg_temp = sum(r.temperature for r in records) / len(records)
    delta = records[0].weight - records[-1].weight if len(records) >= 2 else 0.0
    trend = "INCREASING" if delta > 0.5 else "DECREASING" if delta < -0.5 else "STABLE"

    projected = max(0.0, current_weight - EMPTY_HIVE_WEIGHT_KG) * 1.15
    if not (32.0 <= avg_temp <= 36.5):
        projected = max(0.0, projected - 1.5)

    if current_weight >= HARVEST_WEIGHT_KG:
        window = "1–3 days (harvest ready)"
    elif current_weight >= 26.0:
        window = "3–5 days"
    elif current_weight >= 22.0:
        window = "1–2 weeks"
    else:
        window = "2–4 weeks"

    factors = [
        {"INCREASING": "Positive nectar weight accumulation", "DECREASING": "Weight reduction observed in colony"}.get(
            trend, "Stable weight baseline"
        ),
        "Optimal hive temperature for honey maturation"
        if 33.5 <= avg_temp <= 35.5
        else "Sub-optimal temperature impacting foraging activity",
    ]

    # Confidence grows with the amount of history available.
    confidence = round(min(0.9, 0.55 + len(records) * 0.025), 2)

    return {
        "hive_id": hive_id,
        "current_weight_kg": round(current_weight, 1),
        "predicted_yield_kg": round(projected, 1),
        "weight_change_kg": round(delta, 1),
        "confidence": confidence,
        "trend": trend,
        "harvest_ready": current_weight >= HARVEST_WEIGHT_KG,
        "harvest_window": window,
        "factors": factors,
        "label": "Estimated Yield (Prototype Model)",
    }


def compute_recommendations(db: Session, hive_id: int, health: dict = None, productivity: dict = None) -> list:
    health = health or compute_health(db, hive_id)
    productivity = productivity or compute_productivity(db, hive_id)
    recs = []

    if health["factors"]["temperature"] < 70:
        recs.append({
            "id": f"rec_{hive_id}_temp",
            "priority": "HIGH",
            "hive_id": hive_id,
            "title": "Hive temperature management required",
            "explanation": "Temperature has drifted outside the ideal 34.5 °C brood range.",
            "actions": ["Inspect hive ventilation ports", "Verify sensor calibration", "Check direct solar exposure on the hive box"],
            "source": "IoT telemetry + rule engine",
        })
    if health["factors"]["humidity"] < 70:
        recs.append({
            "id": f"rec_{hive_id}_humidity",
            "priority": "MEDIUM",
            "hive_id": hive_id,
            "title": "Moisture control",
            "explanation": "Internal humidity is outside the 40–65 % range, raising fermentation and mould risk.",
            "actions": ["Improve upper-entrance ventilation", "Raise the hive off damp ground", "Check for roof leaks"],
            "source": "IoT telemetry + rule engine",
        })
    if health["factors"]["disease_risk"] < 75:
        recs.append({
            "id": f"rec_{hive_id}_varroa",
            "priority": "HIGH",
            "hive_id": hive_id,
            "title": "Varroa mite containment inspection",
            "explanation": "Vision model detected an elevated Varroa mite count on the latest frame.",
            "actions": ["Perform a sticky-board mite count", "Apply organic oxalic acid treatment if confirmed", "Isolate affected frames"],
            "source": "Vision AI",
        })
    if productivity["harvest_ready"]:
        recs.append({
            "id": f"rec_{hive_id}_harvest",
            "priority": "MEDIUM",
            "hive_id": hive_id,
            "title": "Harvest window reached",
            "explanation": f"Hive weight reached {productivity['current_weight_kg']} kg.",
            "actions": ["Check frame capping (>80 %)", "Prepare extraction equipment", "Mint a batch provenance record after extraction"],
            "source": "Yield model",
        })
    if not recs:
        recs.append({
            "id": f"rec_{hive_id}_routine",
            "priority": "LOW",
            "hive_id": hive_id,
            "title": "Routine maintenance",
            "explanation": "Hive is operating in a healthy state.",
            "actions": ["Continue weekly inspections and telemetry monitoring"],
            "source": "System",
        })
    return recs


def refresh_hive_status(db: Session, hive_id: int) -> str:
    """Persist the computed health status on the hive row and return it."""
    status = compute_health(db, hive_id)["status"]
    hive = db.query(models.Hive).filter(models.Hive.id == hive_id).first()
    if hive and hive.status != status:
        hive.status = status
        db.commit()
    return status
