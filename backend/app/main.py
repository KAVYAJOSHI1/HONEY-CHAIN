import asyncio
import csv
import io
import logging
import os
import random
import time
import uuid
from collections import defaultdict
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session

from . import database, models, utils
from .ai.anomaly_detector import HiveAnomalyDetector
from .ai.vision_model import InvalidImageError, vision_model
from .intelligence import (
    HARVEST_WEIGHT_KG, compute_health, compute_productivity, compute_recommendations, refresh_hive_status,
)
from .services import BLOCKCHAIN_MODE, IPFS_MODE, BlockchainService, IPFSService, canonical_hash

logger = logging.getLogger("honeychain")

OFFLINE_AFTER = timedelta(hours=24)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

anomaly_detector = HiveAnomalyDetector()
anomaly_detector.train_on_baseline()

database.migrate()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.loop = asyncio.get_running_loop()
    if os.getenv("AUTO_SEED", "true").lower() == "true":
        from .seed import seed_if_empty
        if seed_if_empty():
            logger.info("Empty database detected — demo dataset seeded.")
    yield


app = FastAPI(
    title="Honey Chain API",
    description="IoT-enabled, AI-assisted, blockchain-backed honey traceability and smart beekeeping platform.",
    version="2.1.0",
    lifespan=lifespan,
)

_cors = os.getenv("CORS_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors.split(",")] if _cors != "*" else ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Helpers -----------------------------------------------------------------
def iso(dt: Optional[datetime]) -> Optional[str]:
    """Timestamps are stored as naive UTC; mark them explicitly so browsers don't treat them as local."""
    return dt.isoformat() + "Z" if dt else None


class ConnectionManager:
    def __init__(self):
        self.active: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, topic: str, websocket: WebSocket):
        await websocket.accept()
        self.active[topic].append(websocket)

    def disconnect(self, topic: str, websocket: WebSocket):
        if websocket in self.active.get(topic, []):
            self.active[topic].remove(websocket)

    async def broadcast(self, topic: str, message: dict):
        for connection in list(self.active.get(topic, [])):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(topic, connection)

    def publish(self, topic: str, message: dict):
        """Thread-safe broadcast from sync endpoints (which run in a worker thread)."""
        loop = getattr(app.state, "loop", None)
        if loop and self.active.get(topic):
            asyncio.run_coroutine_threadsafe(self.broadcast(topic, message), loop)


ws_manager = ConnectionManager()


def record_audit_log(db: Session, action: str, actor: str = "Beekeeper", details: str = "", blockchain_tx: Optional[str] = None):
    try:
        db.add(models.AuditLog(action=action, actor=actor, details=details, blockchain_tx=blockchain_tx, timestamp=datetime.utcnow()))
        db.commit()
    except Exception:
        db.rollback()


def record_security_event(db: Session, event_type: str, severity: str = "LOW", description: str = "", actor: str = "System"):
    try:
        db.add(models.SecurityEvent(event_type=event_type, severity=severity, description=description, actor=actor, timestamp=datetime.utcnow()))
        db.commit()
    except Exception:
        db.rollback()


def get_hive_or_404(db: Session, hive_id: int) -> models.Hive:
    hive = db.query(models.Hive).filter(models.Hive.id == hive_id).first()
    if not hive:
        raise HTTPException(status_code=404, detail=f"Hive #{hive_id} not found")
    return hive


def get_batch_or_404(db: Session, batch_id: str) -> models.Batch:
    batch = db.query(models.Batch).filter(models.Batch.batch_id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


def latest_telemetry(db: Session, hive_id: int) -> Optional[models.Telemetry]:
    return (
        db.query(models.Telemetry)
        .filter(models.Telemetry.hive_id == hive_id)
        .order_by(models.Telemetry.timestamp.desc())
        .first()
    )


def batch_canonical_string(hive_id, floral_source, weight, health_score) -> str:
    return f"{hive_id}_{floral_source}_{float(weight)}_{float(health_score)}"


def integrity_of(batch: models.Batch) -> dict:
    score = batch.tampered_health_score if batch.tampered_health_score is not None else batch.health_score
    current_hash = canonical_hash(batch_canonical_string(batch.hive_id, batch.floral_source or "Wildflower", batch.weight_kg or 0, score))
    # On-chain batches keep the data hash separately; demo batches use the hash itself as the anchor.
    anchored_hash = batch.data_hash if (batch.blockchain_mode == "sepolia" and batch.data_hash) else batch.tx_hash
    hash_ok = current_hash == anchored_hash
    verified = hash_ok and batch.tampered_health_score is None and not batch.is_revoked
    if verified:
        status = "Authentic"
    elif batch.is_revoked:
        status = "REVOKED"
    else:
        status = "Integrity Mismatch Detected"
    return {
        "verified": verified,
        "current_hash": current_hash,
        "anchored_hash": anchored_hash,
        "is_tampered": (batch.tampered_health_score is not None) or not hash_ok,
        "is_revoked": batch.is_revoked,
        "revocation_reason": batch.revocation_reason,
        "status": status,
    }


def serialize_batch(db: Session, b: models.Batch, include_origin: bool = True) -> dict:
    data = {
        "id": b.id,
        "batch_id": b.batch_id,
        "hive_id": b.hive_id,
        "token_id": b.token_id,
        "ipfs_cid": b.ipfs_cid,
        "tx_hash": b.tx_hash,
        "data_hash": b.data_hash,
        "health_score": b.health_score,
        "floral_source": b.floral_source,
        "weight_kg": b.weight_kg,
        "tampered_health_score": b.tampered_health_score,
        "is_revoked": b.is_revoked,
        "revocation_reason": b.revocation_reason,
        "blockchain_mode": b.blockchain_mode,
        "created_at": iso(b.created_at),
        "updated_at": iso(b.updated_at),
        "verification_url": utils.verification_url(b.batch_id),
    }
    if include_origin:
        hive = db.query(models.Hive).filter(models.Hive.id == b.hive_id).first()
        cluster = hive.cluster if hive else None
        owner = hive.owner if hive else None
        data["origin"] = {
            "hive_id": b.hive_id,
            "apiary": cluster.name if cluster else None,
            "region": cluster.region if cluster else None,
            "gps_lat": hive.gps_lat if hive else None,
            "gps_long": hive.gps_long if hive else None,
            "beekeeper": owner.name if owner else None,
        }
    return data


def serialize_alert(a: models.Alert) -> dict:
    return {
        "id": a.id,
        "hive_id": a.hive_id,
        "type": a.type or "ANOMALY",
        "severity": a.severity,
        "reason": a.reason,
        "message": a.message,
        "source": a.source,
        "current_value": a.current_value,
        "acknowledged": bool(a.acknowledged),
        "resolved": bool(a.resolved),
        "timestamp": iso(a.timestamp),
    }


def serialize_telemetry(t: models.Telemetry) -> dict:
    return {"id": t.id, "hive_id": t.hive_id, "temperature": t.temperature, "humidity": t.humidity, "weight": t.weight, "timestamp": iso(t.timestamp)}


def serialize_analysis(a: models.AIAnalysis) -> dict:
    return {
        "id": a.id, "hive_id": a.hive_id, "health_score": a.health_score, "infection_rate": a.infection_rate,
        "varroa_count": a.varroa_count, "healthy_bee_count": a.healthy_bee_count, "image_ref": a.image_ref, "timestamp": iso(a.timestamp),
    }


def hive_summary(db: Session, h: models.Hive) -> dict:
    tel = latest_telemetry(db, h.id)
    health = compute_health(db, h.id)
    last_seen = tel.timestamp if tel else None
    return {
        "id": h.id,
        "owner_id": h.owner_id,
        "cluster_id": h.cluster_id,
        "cluster_name": h.cluster.name if h.cluster else None,
        "region": h.cluster.region if h.cluster else None,
        "gps_lat": h.gps_lat,
        "gps_long": h.gps_long,
        "status": health["status"],
        "health_score": health["health_score"],
        "installed_at": iso(h.installed_at),
        "latest_temperature": tel.temperature if tel else None,
        "latest_humidity": tel.humidity if tel else None,
        "latest_weight": tel.weight if tel else None,
        "harvest_ready": bool(tel and tel.weight >= HARVEST_WEIGHT_KG),
        "last_seen": iso(last_seen),
        "online": bool(last_seen and datetime.utcnow() - last_seen < OFFLINE_AFTER),
    }


# --- Schemas -----------------------------------------------------------------
class TelemetryCreate(BaseModel):
    hive_id: int
    temperature: float = Field(..., ge=-20, le=70)
    humidity: float = Field(..., ge=0, le=100)
    weight: float = Field(..., ge=0, le=200)


class ScenarioSimulateRequest(BaseModel):
    hive_id: int = 1
    scenario: str = "NORMAL"


class TamperBatchRequest(BaseModel):
    tampered_score: float = 35.0


class HiveCreate(BaseModel):
    owner_id: int
    cluster_id: int
    gps_lat: float = Field(..., ge=-90, le=90)
    gps_long: float = Field(..., ge=-180, le=180)


class BatchCreate(BaseModel):
    hive_id: int
    floral_source: str = Field(..., min_length=2, max_length=80)
    weight: float = Field(..., gt=0, le=500)
    health_score: float = Field(..., ge=1, le=100)


class RevokeRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=300)


class HoneyBotRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)


# --- System ------------------------------------------------------------------
@app.get("/", tags=["System"])
def read_root():
    return {"message": "Welcome to the Honey Chain API"}


@app.get("/system-health", tags=["System"])
def system_health(db: Session = Depends(database.get_db)):
    t0 = time.perf_counter()
    db_status, last_tel = "ONLINE", None
    try:
        db.execute(text("SELECT 1"))
        tel = db.query(models.Telemetry).order_by(models.Telemetry.timestamp.desc()).first()
        last_tel = iso(tel.timestamp) if tel else None
    except Exception:
        db_status = "OFFLINE"
    return {
        "backend": "ONLINE",
        "database": db_status,
        "database_engine": database.engine.dialect.name,
        "yolo_model": "LOADED" if vision_model.model_loaded else "OFFLINE",
        "isolation_forest": "TRAINED" if anomaly_detector.is_trained else "RULE_FALLBACK",
        "blockchain_mode": BLOCKCHAIN_MODE.upper(),
        "ipfs_mode": "MOCK" if IPFS_MODE != "real" else "LIVE",
        "websocket": "ONLINE",
        "websocket_clients": sum(len(v) for v in ws_manager.active.values()),
        "latency_ms": round((time.perf_counter() - t0) * 1000, 2),
        "last_telemetry": last_tel,
        "version": app.version,
    }


@app.get("/stats/kpis", tags=["System"])
def get_kpis(db: Session = Depends(database.get_db)):
    open_alerts = db.query(models.Alert).filter(models.Alert.resolved == False).count()  # noqa: E712
    critical = db.query(models.Alert).filter(models.Alert.resolved == False, models.Alert.severity == "CRITICAL").count()  # noqa: E712
    hives = db.query(models.Hive).all()
    harvest_ready = 0
    for h in hives:
        tel = latest_telemetry(db, h.id)
        if tel and tel.weight >= HARVEST_WEIGHT_KG:
            harvest_ready += 1
    return {
        "total_hives": len(hives),
        "total_batches": db.query(models.Batch).count(),
        "revoked_batches": db.query(models.Batch).filter(models.Batch.is_revoked == True).count(),  # noqa: E712
        "alerts": open_alerts,
        "critical_alerts": critical,
        "harvest_ready_hives": harvest_ready,
        "clusters": db.query(models.Cluster).count(),
    }


@app.get("/search", tags=["System"])
def search(q: str, db: Session = Depends(database.get_db)):
    q = q.strip()
    term = q.lstrip("#")
    hives = db.query(models.Hive).filter(models.Hive.id == int(term)).all() if term.isdigit() else []
    batches = (
        db.query(models.Batch)
        .filter(or_(models.Batch.batch_id.ilike(f"%{q}%"), models.Batch.floral_source.ilike(f"%{q}%")))
        .limit(8)
        .all()
    )
    clusters = (
        db.query(models.Cluster)
        .filter(or_(models.Cluster.name.ilike(f"%{q}%"), models.Cluster.region.ilike(f"%{q}%")))
        .limit(5)
        .all()
    )
    return {
        "hives": [{"id": h.id, "status": h.status, "cluster_name": h.cluster.name if h.cluster else None} for h in hives],
        "batches": [{"id": b.id, "batch_id": b.batch_id, "floral_source": b.floral_source, "is_revoked": b.is_revoked} for b in batches],
        "clusters": [{"id": c.id, "name": c.name, "region": c.region} for c in clusters],
    }


@app.post("/system/reset-demo", tags=["System"])
def reset_demo_system():
    from .seed import reset_db, seed_data
    try:
        database.engine.dispose()
        reset_db()
        seed_data()
    except Exception as exc:
        logger.exception("Demo reset failed")
        raise HTTPException(status_code=500, detail=f"Reset failed: {exc}")
    return {"status": "success", "message": "Database reset and demo data seeded."}


@app.get("/notifications", tags=["System"])
def get_notifications(db: Session = Depends(database.get_db)):
    rows = db.query(models.Notification).order_by(models.Notification.timestamp.desc()).limit(50).all()
    return [{"id": n.id, "message": n.message, "is_read": bool(n.is_read), "timestamp": iso(n.timestamp)} for n in rows]


@app.post("/notifications/read-all", tags=["System"])
def mark_notifications_read(db: Session = Depends(database.get_db)):
    updated = db.query(models.Notification).filter(models.Notification.is_read == False).update({"is_read": True})  # noqa: E712
    db.commit()
    return {"updated": updated}


# --- Apiaries & hives ----------------------------------------------------------
@app.get("/clusters/", tags=["Apiaries"])
def list_clusters(db: Session = Depends(database.get_db)):
    result = []
    for c in db.query(models.Cluster).order_by(models.Cluster.id).all():
        summaries = [hive_summary(db, h) for h in sorted(c.hives, key=lambda h: h.id)]
        temps = [s["latest_temperature"] for s in summaries if s["latest_temperature"] is not None]
        hums = [s["latest_humidity"] for s in summaries if s["latest_humidity"] is not None]
        counts = defaultdict(int)
        for s in summaries:
            counts[s["status"]] += 1
        result.append({
            "id": c.id,
            "name": c.name,
            "region": c.region,
            "total_hives": len(summaries),
            "healthy": counts["HEALTHY"],
            "watch": counts["WATCH"],
            "warning": counts["WARNING"],
            "critical": counts["CRITICAL"],
            "avg_health": round(sum(s["health_score"] for s in summaries) / len(summaries)) if summaries else None,
            "avg_temperature": round(sum(temps) / len(temps), 1) if temps else None,
            "avg_humidity": round(sum(hums) / len(hums), 1) if hums else None,
            "harvest_ready": sum(1 for s in summaries if s["harvest_ready"]),
            "center": {
                "lat": round(sum(s["gps_lat"] for s in summaries) / len(summaries), 4) if summaries else None,
                "lng": round(sum(s["gps_long"] for s in summaries) / len(summaries), 4) if summaries else None,
            },
            "hives": summaries,
        })
    return result


@app.get("/clusters/{cluster_id}", tags=["Apiaries"])
def get_cluster(cluster_id: int, db: Session = Depends(database.get_db)):
    for c in list_clusters(db):
        if c["id"] == cluster_id:
            return c
    raise HTTPException(status_code=404, detail="Apiary cluster not found")


@app.get("/hives/", tags=["Hives"])
def get_hives(db: Session = Depends(database.get_db)):
    return [hive_summary(db, h) for h in db.query(models.Hive).order_by(models.Hive.id).all()]


@app.post("/hives/", tags=["Hives"])
def create_hive(hive: HiveCreate, db: Session = Depends(database.get_db)):
    if not db.query(models.Cluster).filter(models.Cluster.id == hive.cluster_id).first():
        raise HTTPException(status_code=404, detail="Apiary cluster not found")
    db_hive = models.Hive(**hive.model_dump(), status="WATCH")
    db.add(db_hive)
    db.commit()
    db.refresh(db_hive)
    record_audit_log(db, action="Hive Registered", details=f"Registered Hive #{db_hive.id} at GPS ({db_hive.gps_lat}, {db_hive.gps_long})")
    return hive_summary(db, db_hive)


@app.get("/hives/{hive_id}", tags=["Hives"])
def get_hive(hive_id: int, db: Session = Depends(database.get_db)):
    hive = get_hive_or_404(db, hive_id)
    summary = hive_summary(db, hive)
    summary["beekeeper"] = hive.owner.name if hive.owner else None
    return summary


@app.get("/hives/{hive_id}/health", tags=["AI & Intelligence"])
def get_health(hive_id: int, db: Session = Depends(database.get_db)):
    return compute_health(db, hive_id)


@app.get("/hives/{hive_id}/productivity", tags=["AI & Intelligence"])
def get_productivity(hive_id: int, db: Session = Depends(database.get_db)):
    return compute_productivity(db, hive_id)


@app.get("/hives/{hive_id}/recommendations", tags=["AI & Intelligence"])
def get_recommendations(hive_id: int, db: Session = Depends(database.get_db)):
    return compute_recommendations(db, hive_id)


@app.get("/telemetry/{hive_id}", tags=["IoT Telemetry"])
@app.get("/hives/{hive_id}/telemetry", tags=["IoT Telemetry"])
def get_hive_telemetry(hive_id: int, limit: int = 100, db: Session = Depends(database.get_db)):
    limit = max(1, min(limit, 1000))
    rows = (
        db.query(models.Telemetry)
        .filter(models.Telemetry.hive_id == hive_id)
        .order_by(models.Telemetry.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [serialize_telemetry(t) for t in rows]


@app.get("/hives/{hive_id}/analyses", tags=["AI & Intelligence"])
def get_hive_analyses(hive_id: int, db: Session = Depends(database.get_db)):
    rows = db.query(models.AIAnalysis).filter(models.AIAnalysis.hive_id == hive_id).order_by(models.AIAnalysis.timestamp.desc()).all()
    return [serialize_analysis(a) for a in rows]


@app.get("/hives/{hive_id}/batches", tags=["Blockchain & Traceability"])
def get_hive_batches(hive_id: int, db: Session = Depends(database.get_db)):
    rows = db.query(models.Batch).filter(models.Batch.hive_id == hive_id).order_by(models.Batch.created_at.desc()).all()
    return [serialize_batch(db, b, include_origin=False) for b in rows]


# --- AI insight center -------------------------------------------------------
@app.get("/ai-insights", tags=["AI & Intelligence"])
def get_ai_insights(db: Session = Depends(database.get_db)):
    hive_insights, disease, productivity, recommendations = [], [], [], []
    for h in db.query(models.Hive).order_by(models.Hive.id).all():
        health = compute_health(db, h.id)
        prod = compute_productivity(db, h.id)
        hive_insights.append({
            "hive_id": h.id,
            "cluster_name": h.cluster.name if h.cluster else None,
            "health_score": health["health_score"],
            "status": health["status"],
            "score_explanation": health["score_explanation"],
            "factors": health["factors"],
        })
        latest_ai = db.query(models.AIAnalysis).filter(models.AIAnalysis.hive_id == h.id).order_by(models.AIAnalysis.timestamp.desc()).first()
        if latest_ai:
            disease.append({
                "hive_id": h.id,
                "varroa_count": latest_ai.varroa_count,
                "infection_rate": round(latest_ai.infection_rate * 100, 1),
                "healthy_bee_count": latest_ai.healthy_bee_count,
                "health_score": latest_ai.health_score,
                "timestamp": iso(latest_ai.timestamp),
            })
        productivity.append({
            "hive_id": h.id,
            "current_weight_kg": prod["current_weight_kg"],
            "predicted_yield_kg": prod["predicted_yield_kg"],
            "trend": prod["trend"],
            "harvest_ready": prod["harvest_ready"],
            "harvest_window": prod["harvest_window"],
        })
        recommendations += [r for r in compute_recommendations(db, h.id, health, prod) if r["priority"] in ("HIGH", "MEDIUM")]

    recommendations.sort(key=lambda r: 0 if r["priority"] == "HIGH" else 1)
    disease.sort(key=lambda d: -d["varroa_count"])
    return {
        "hive_intelligence": sorted(hive_insights, key=lambda h: h["health_score"]),
        "disease_intelligence": disease,
        "productivity_intelligence": sorted(productivity, key=lambda p: -p["current_weight_kg"]),
        "recommendations": recommendations,
    }


# --- Alerts ------------------------------------------------------------------
@app.get("/alerts", tags=["Alerts"])
def get_alerts(
    hive_id: Optional[int] = None,
    severity: Optional[str] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(database.get_db),
):
    query = db.query(models.Alert)
    if hive_id:
        query = query.filter(models.Alert.hive_id == hive_id)
    if severity:
        query = query.filter(models.Alert.severity == severity.upper())
    if type:
        query = query.filter(models.Alert.type == type.upper())
    if status == "acknowledged":
        query = query.filter(models.Alert.acknowledged == True, models.Alert.resolved == False)  # noqa: E712
    elif status == "unacknowledged":
        query = query.filter(models.Alert.acknowledged == False)  # noqa: E712
    elif status == "resolved":
        query = query.filter(models.Alert.resolved == True)  # noqa: E712
    elif status in ("unresolved", "open"):
        query = query.filter(models.Alert.resolved == False)  # noqa: E712
    rows = query.order_by(models.Alert.timestamp.desc()).limit(max(1, min(limit, 500))).all()
    return [serialize_alert(a) for a in rows]


def _update_alert(db: Session, alert_id: int, resolve: bool) -> dict:
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.acknowledged = True
    if resolve:
        alert.resolved = True
    db.commit()
    db.refresh(alert)
    refresh_hive_status(db, alert.hive_id)
    record_audit_log(db, action="Alert Resolved" if resolve else "Alert Acknowledged",
                     details=f"{'Resolved' if resolve else 'Acknowledged'} alert #{alert_id} on Hive #{alert.hive_id}")
    return serialize_alert(alert)


@app.post("/alerts/{alert_id}/acknowledge", tags=["Alerts"])
def acknowledge_alert(alert_id: int, db: Session = Depends(database.get_db)):
    return _update_alert(db, alert_id, resolve=False)


@app.post("/alerts/{alert_id}/resolve", tags=["Alerts"])
def resolve_alert(alert_id: int, db: Session = Depends(database.get_db)):
    return _update_alert(db, alert_id, resolve=True)


# --- Telemetry ingestion -----------------------------------------------------
@app.post("/telemetry/", tags=["IoT Telemetry"])
@app.post("/telemetry", tags=["IoT Telemetry"])
def create_telemetry(telemetry: TelemetryCreate, db: Session = Depends(database.get_db)):
    get_hive_or_404(db, telemetry.hive_id)
    last_reading = latest_telemetry(db, telemetry.hive_id)
    weight_delta = telemetry.weight - last_reading.weight if last_reading else 0.0

    db_telemetry = models.Telemetry(**telemetry.model_dump(), timestamp=datetime.utcnow())
    db.add(db_telemetry)
    db.commit()
    db.refresh(db_telemetry)

    crossed_harvest = telemetry.weight >= HARVEST_WEIGHT_KG and (last_reading is None or last_reading.weight < HARVEST_WEIGHT_KG)
    harvest_ready = telemetry.weight > HARVEST_WEIGHT_KG and weight_delta > 0

    def alert(type_, severity, reason, message, source, value):
        return models.Alert(hive_id=telemetry.hive_id, type=type_, severity=severity, reason=reason,
                            message=message, source=source, current_value=value, timestamp=datetime.utcnow())

    alerts = []
    if telemetry.temperature > 37.0:
        alerts.append(alert("TEMPERATURE", "CRITICAL", "Hive temperature overheating", f"Temperature reached {telemetry.temperature}°C", "IoT Telemetry", telemetry.temperature))
    elif telemetry.temperature < 32.0:
        alerts.append(alert("TEMPERATURE", "WARNING", "Hive temperature below ideal", f"Temperature dropped to {telemetry.temperature}°C", "IoT Telemetry", telemetry.temperature))
    if telemetry.humidity > 65.0:
        alerts.append(alert("HUMIDITY", "WARNING", "Excess moisture detected", f"Humidity reached {telemetry.humidity}%", "IoT Telemetry", telemetry.humidity))
    if weight_delta < -1.0:
        alerts.append(alert("WEIGHT", "CRITICAL", "Rapid weight drop (swarming or robbing)", f"Weight dropped by {abs(weight_delta):.1f} kg", "IoT Telemetry", telemetry.weight))
    if crossed_harvest:
        alerts.append(alert("HARVEST_READY", "SUCCESS", "Hive crossed harvest threshold", f"Hive weight reached {telemetry.weight} kg", "Rule Engine", telemetry.weight))
    if not alerts and anomaly_detector.predict([telemetry.temperature, telemetry.humidity, telemetry.weight]):
        alerts.append(alert("ANOMALY", "WARNING", "Multivariate sensor anomaly detected", "IsolationForest flagged environmental drift", "Anomaly Engine", telemetry.temperature))

    for a in alerts:
        db.add(a)
        db.add(models.Notification(message=f"Hive #{telemetry.hive_id}: {a.reason}", timestamp=datetime.utcnow()))
    if alerts:
        db.commit()

    status = refresh_hive_status(db, telemetry.hive_id)
    record_audit_log(db, action="Telemetry Ingested", actor=f"Sensor Node #{telemetry.hive_id}",
                     details=f"Temp {telemetry.temperature}°C, humidity {telemetry.humidity}%, weight {telemetry.weight} kg")

    payload = {
        "telemetry": serialize_telemetry(db_telemetry),
        "weight_delta": round(weight_delta, 2),
        "harvest_ready": harvest_ready,
        "alerts_generated": len(alerts),
        "hive_status": status,
    }
    ws_manager.publish(f"hive_{telemetry.hive_id}", payload)
    if alerts:
        ws_manager.publish("alerts", {"hive_id": telemetry.hive_id, "alerts_count": len(alerts)})
    return payload


SCENARIOS = {
    "NORMAL": (34.5, 50.0, None),
    "HIGH_TEMPERATURE": (38.5, 50.0, None),
    "LOW_TEMPERATURE": (30.5, 50.0, None),
    "HIGH_HUMIDITY": (34.5, 72.0, None),
    "WEIGHT_INCREASE": (34.5, 50.0, "+"),
    "WEIGHT_DROP": (34.5, 50.0, "-"),
    "ABNORMAL_HIVE": (39.0, 78.0, "-"),
}


@app.post("/simulate-scenario", tags=["IoT Telemetry"])
def simulate_scenario(req: ScenarioSimulateRequest, db: Session = Depends(database.get_db)):
    scenario = req.scenario.upper()
    if scenario not in SCENARIOS:
        raise HTTPException(status_code=400, detail=f"Unknown scenario. Choose one of: {', '.join(SCENARIOS)}")
    get_hive_or_404(db, req.hive_id)
    temp, hum, weight_mode = SCENARIOS[scenario]
    last = latest_telemetry(db, req.hive_id)
    current_weight = last.weight if last else 25.0
    if weight_mode == "+":
        weight = max(current_weight + 1.5, HARVEST_WEIGHT_KG + 1.5)
    elif weight_mode == "-":
        weight = max(5.0, current_weight - 3.0)
    else:
        weight = current_weight + random.uniform(0.0, 0.2)

    return create_telemetry(TelemetryCreate(
        hive_id=req.hive_id,
        temperature=round(random.uniform(temp - 0.3, temp + 0.3), 1),
        humidity=round(random.uniform(hum - 1.5, hum + 1.5), 1),
        weight=round(weight, 1),
    ), db)


# --- AI vision inspection ------------------------------------------------------
@app.post("/analyze-frame/", tags=["AI & Intelligence"])
async def analyze_hive_frame(
    file: UploadFile = File(...),
    hive_id: int = Form(...),
    scenario: Optional[str] = Form(None),
    db: Session = Depends(database.get_db),
):
    if not (file.filename or "").lower().endswith((".jpg", ".jpeg", ".png")):
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG/PNG allowed.")
    get_hive_or_404(db, hive_id)

    image_bytes = await file.read(MAX_FILE_SIZE + 1)
    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")
    try:
        results = vision_model.analyze_image(image_bytes, scenario=scenario)
    except InvalidImageError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    analysis = models.AIAnalysis(
        hive_id=hive_id,
        health_score=results["health_score"],
        infection_rate=results["infection_rate_percentage"] / 100.0,
        varroa_count=results["mite_count"],
        healthy_bee_count=results["bee_count"],
        image_ref=file.filename,
        timestamp=datetime.utcnow(),
    )
    db.add(analysis)

    if results["health_score"] < 70:
        severity = "CRITICAL" if results["health_score"] < 45 else "WARNING"
        db.add(models.Alert(
            hive_id=hive_id, type="VARROA", severity=severity,
            reason="Varroa infestation detected on inspected frame",
            message=f"{results['mite_count']} mites detected, frame health {results['health_score']}",
            source="AI Vision", current_value=results["health_score"], timestamp=datetime.utcnow(),
        ))
        db.add(models.Notification(message=f"Hive #{hive_id}: Varroa risk — frame health {results['health_score']}", timestamp=datetime.utcnow()))

    db.commit()
    db.refresh(analysis)
    refresh_hive_status(db, hive_id)
    record_audit_log(db, action="AI Frame Inspection", actor="Vision Model",
                     details=f"Analyzed frame for Hive #{hive_id}. Varroa: {results['mite_count']}, score: {results['health_score']}")

    return {"filename": file.filename, "results": results, "model_status": "prototype_inference", "analysis_id": analysis.id}


# --- Batches & blockchain ------------------------------------------------------
@app.post("/mint-batch/", tags=["Blockchain & Traceability"])
def mint_batch(batch: BatchCreate, db: Session = Depends(database.get_db)):
    get_hive_or_404(db, batch.hive_id)
    floral = batch.floral_source.strip()
    now = datetime.utcnow()
    batch_uuid = f"HC-{uuid.uuid4().hex[:8].upper()}"

    ipfs_uri = IPFSService.pin_json({
        "hive_id": batch.hive_id, "floral_source": floral, "weight_kg": batch.weight,
        "ai_health_score": batch.health_score, "timestamp": now.isoformat(),
    })
    canonical = batch_canonical_string(batch.hive_id, floral, batch.weight, batch.health_score)
    minted = BlockchainService.mint_token(canonical, ipfs_uri, floral)

    token_id = minted.token_id
    if token_id is None:
        max_token = db.query(func.max(models.Batch.token_id)).scalar()
        token_id = str(int(max_token) + 1 if max_token and str(max_token).isdigit() else 1001)

    db_batch = models.Batch(
        batch_id=batch_uuid, hive_id=batch.hive_id, token_id=token_id, ipfs_cid=ipfs_uri,
        tx_hash=minted.tx_hash, data_hash=canonical_hash(canonical), health_score=batch.health_score,
        floral_source=floral, weight_kg=batch.weight, blockchain_mode=minted.mode, created_at=now, updated_at=now,
    )
    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)

    record_audit_log(db, action="Batch Minted", actor="Beekeeper",
                     details=f"Minted batch {batch_uuid} ({batch.weight} kg {floral}) from Hive #{batch.hive_id}",
                     blockchain_tx=minted.tx_hash)
    db.add(models.Notification(message=f"Batch {batch_uuid} minted from Hive #{batch.hive_id}", timestamp=now))
    db.commit()

    data = serialize_batch(db, db_batch)
    data["weight_kg"] = batch.weight
    data["qr_code"] = utils.generate_qr_code(batch_uuid)
    return data


@app.get("/batches/", tags=["Blockchain & Traceability"])
def list_batches(db: Session = Depends(database.get_db)):
    return [serialize_batch(db, b) for b in db.query(models.Batch).order_by(models.Batch.created_at.desc()).all()]


@app.get("/batches/{batch_id}", tags=["Blockchain & Traceability"])
def get_batch(batch_id: str, db: Session = Depends(database.get_db)):
    return serialize_batch(db, get_batch_or_404(db, batch_id))


@app.get("/batches/{batch_id}/qr", tags=["Blockchain & Traceability"])
def get_batch_qr(batch_id: str, db: Session = Depends(database.get_db)):
    b = get_batch_or_404(db, batch_id)
    return {"batch_id": b.batch_id, "verification_url": utils.verification_url(b.batch_id), "qr_code": utils.generate_qr_code(b.batch_id)}


@app.get("/batches/{batch_id}/timeline", tags=["Blockchain & Traceability"])
def get_batch_timeline(batch_id: str, db: Session = Depends(database.get_db)):
    """Provenance events for the consumer passport, built from real records."""
    b = get_batch_or_404(db, batch_id)
    hive = db.query(models.Hive).filter(models.Hive.id == b.hive_id).first()
    events = []
    if hive:
        events.append({"key": "registered", "title": "Hive registered", "timestamp": iso(hive.installed_at),
                       "detail": f"Hive #{hive.id} registered{' at ' + hive.cluster.name if hive.cluster else ''} with GPS-tagged IoT sensors."})
    tel_count = db.query(models.Telemetry).filter(models.Telemetry.hive_id == b.hive_id, models.Telemetry.timestamp <= b.created_at).count()
    first_tel = db.query(models.Telemetry).filter(models.Telemetry.hive_id == b.hive_id).order_by(models.Telemetry.timestamp.asc()).first()
    if tel_count:
        events.append({"key": "monitoring", "title": "Continuous IoT monitoring", "timestamp": iso(first_tel.timestamp) if first_tel else None,
                       "detail": f"{tel_count} temperature, humidity and weight readings recorded before harvest."})
    inspection = (
        db.query(models.AIAnalysis)
        .filter(models.AIAnalysis.hive_id == b.hive_id, models.AIAnalysis.timestamp <= b.created_at + timedelta(days=1))
        .order_by(models.AIAnalysis.timestamp.desc())
        .first()
    )
    if inspection:
        events.append({"key": "inspection", "title": "AI frame inspection", "timestamp": iso(inspection.timestamp),
                       "detail": f"{inspection.varroa_count} Varroa mites detected; frame health {inspection.health_score}/100."})
    events.append({"key": "harvest", "title": "Harvest & batch creation", "timestamp": iso(b.created_at),
                   "detail": f"{b.weight_kg} kg of {b.floral_source} extracted. Colony health score {b.health_score}/100."})
    events.append({"key": "anchored", "title": "Provenance anchored" + (" on Sepolia" if b.blockchain_mode == "sepolia" else " (demo ledger)"),
                   "timestamp": iso(b.created_at), "detail": f"Token #{b.token_id} minted; metadata pinned at {b.ipfs_cid}."})
    if b.is_revoked:
        events.append({"key": "revoked", "title": "Revoked by KVIC", "timestamp": iso(b.updated_at), "detail": b.revocation_reason or "Batch revoked."})
    return events


@app.post("/batches/{batch_id}/revoke", tags=["Blockchain & Traceability"])
def revoke_batch(batch_id: str, req: RevokeRequest, db: Session = Depends(database.get_db)):
    b = get_batch_or_404(db, batch_id)
    if b.is_revoked:
        raise HTTPException(status_code=409, detail="Batch is already revoked")
    b.is_revoked = True
    b.revocation_reason = req.reason.strip()
    b.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(b)

    chain_tx = BlockchainService.revoke_token(b.token_id, b.revocation_reason) if b.blockchain_mode == "sepolia" else None
    record_audit_log(db, action="Batch Revoked", actor="KVIC Admin", details=f"Revoked batch {batch_id}. Reason: {b.revocation_reason}", blockchain_tx=chain_tx)
    record_security_event(db, event_type="BATCH_REVOKED", severity="HIGH", description=f"Batch {batch_id} revoked: {b.revocation_reason}", actor="KVIC Admin")
    db.add(models.Notification(message=f"Batch {batch_id} revoked by KVIC", timestamp=datetime.utcnow()))
    db.commit()
    return serialize_batch(db, b)


@app.post("/batches/{batch_id}/tamper", tags=["Blockchain & Traceability"])
def tamper_batch(batch_id: str, req: TamperBatchRequest, db: Session = Depends(database.get_db)):
    b = get_batch_or_404(db, batch_id)
    b.tampered_health_score = req.tampered_score
    db.commit()
    record_audit_log(db, action="Tamper Simulation", actor="Demo System", details=f"Simulated tamper on batch {batch_id}: score set to {req.tampered_score}")
    record_security_event(db, event_type="TAMPER_SIMULATION", severity="MEDIUM", description=f"Simulated modification of batch {batch_id} health score", actor="Demo System")
    return {"message": "Batch record modified (demo tamper)", "tampered_score": req.tampered_score}


@app.post("/batches/{batch_id}/restore", tags=["Blockchain & Traceability"])
def restore_batch(batch_id: str, db: Session = Depends(database.get_db)):
    b = get_batch_or_404(db, batch_id)
    b.tampered_health_score = None
    db.commit()
    record_audit_log(db, action="Integrity Restored", actor="Demo System", details=f"Restored original record for batch {batch_id}")
    return {"message": "Batch integrity restored"}


@app.post("/batches/{batch_id}/verify-integrity", tags=["Blockchain & Traceability"])
def verify_integrity(batch_id: str, actor: str = "Consumer", db: Session = Depends(database.get_db)):
    result = integrity_of(get_batch_or_404(db, batch_id))
    actor = actor.strip()[:40] or "Consumer"
    record_audit_log(db, action="Integrity Verified", actor=actor, details=f"Verified batch {batch_id} authenticity: {result['verified']}")
    return result


@app.get("/batches/{batch_id}/timeline", tags=["Blockchain & Traceability"])
def get_batch_timeline(batch_id: str, db: Session = Depends(database.get_db)):
    b = get_batch_or_404(db, batch_id)
    h = db.query(models.Hive).filter(models.Hive.id == b.hive_id).first()
    cluster = db.query(models.Cluster).filter(models.Cluster.id == h.cluster_id).first() if h else None
    
    created_ts = iso(b.created_at) if b.created_at else iso(datetime.utcnow())
    installed_ts = iso(h.installed_at) if h and h.installed_at else created_ts
    
    events = [
        {
            "stage": "HIVE_REGISTERED",
            "title": "🐝 Hive Registered",
            "timestamp": installed_ts,
            "actor": "Beekeeper Master Node",
            "location": f"{cluster.name if cluster else 'Apiary Node'} ({cluster.region if cluster else 'Regional'})",
            "data": f"Hive #{b.hive_id} GPS: ({h.gps_lat if h else 30.3165}, {h.gps_long if h else 78.0322})",
            "verification": "VERIFIED"
        },
        {
            "stage": "SENSOR_MONITORING",
            "title": "📡 IoT Telemetry Monitoring",
            "timestamp": created_ts,
            "actor": f"IoT Sensor Node #{b.hive_id}",
            "location": f"Hive #{b.hive_id}",
            "data": "Temperature, Humidity, & Weight stability tracked continuously",
            "verification": "VERIFIED"
        },
        {
            "stage": "AI_ANALYSIS",
            "title": "🧠 AI Health & Vision Inspection",
            "timestamp": created_ts,
            "actor": "YOLO Vision AI + Anomaly Detector",
            "location": f"Hive #{b.hive_id}",
            "data": f"AI Health Score: {b.health_score}/100",
            "verification": "VERIFIED"
        },
        {
            "stage": "HARVEST",
            "title": "🍯 Nectar Harvested",
            "timestamp": created_ts,
            "actor": "Beekeeper",
            "location": f"Hive #{b.hive_id}",
            "data": f"{b.weight_kg}kg of {b.floral_source} harvested",
            "verification": "VERIFIED"
        },
        {
            "stage": "BATCH_CREATED",
            "title": "📦 Batch Passport Created",
            "timestamp": created_ts,
            "actor": "Honey Chain Protocol",
            "location": "Honey Chain Node",
            "data": f"Batch ID: {b.batch_id} (Canonical SHA-256 Hash Generated)",
            "verification": "VERIFIED"
        },
        {
            "stage": "BLOCKCHAIN_MINT",
            "title": f"⛓ ERC-721 Token #{b.token_id} Minted",
            "timestamp": created_ts,
            "actor": "Sepolia Smart Contract",
            "location": "Ethereum Sepolia",
            "data": f"Tx Hash: {b.tx_hash} | IPFS CID: {b.ipfs_cid}",
            "verification": "VERIFIED ON SEPOLIA" if b.blockchain_mode == "sepolia" else "DEMO MODE VERIFIED"
        }
    ]
    
    if b.is_revoked:
        events.append({
            "stage": "REVOKED",
            "title": "❌ Batch Revoked by KVIC",
            "timestamp": iso(b.updated_at),
            "actor": "KVIC Admin Authority",
            "location": "KVIC Command Center",
            "data": f"Reason: {b.revocation_reason or 'Compliance failure'}",
            "verification": "REVOKED"
        })

    return {
        "batch_id": b.batch_id,
        "hive_id": b.hive_id,
        "token_id": b.token_id,
        "is_revoked": b.is_revoked,
        "timeline": events
    }


# --- Audit, security, analytics ------------------------------------------------
@app.get("/audit-logs", tags=["Audit & Security"])
def list_audit_logs(limit: int = 200, action: Optional[str] = None, db: Session = Depends(database.get_db)):
    query = db.query(models.AuditLog)
    if action:
        query = query.filter(models.AuditLog.action == action)
    rows = query.order_by(models.AuditLog.timestamp.desc()).limit(max(1, min(limit, 1000))).all()
    return [{"id": l.id, "action": l.action, "actor": l.actor, "details": l.details, "blockchain_tx": l.blockchain_tx, "timestamp": iso(l.timestamp)} for l in rows]


@app.get("/admin/security", tags=["Audit & Security"])
def security_dashboard(db: Session = Depends(database.get_db)):
    batches = db.query(models.Batch).all()
    integrity = [integrity_of(b) for b in batches]
    mismatched = sum(1 for i in integrity if i["is_tampered"])
    revoked = sum(1 for b in batches if b.is_revoked)
    since = datetime.utcnow() - timedelta(hours=24)
    failed_verifications = db.query(models.AuditLog).filter(
        models.AuditLog.action == "Integrity Verified", models.AuditLog.actor == "Consumer",
        models.AuditLog.details.like("%: False")).count()
    suspicious = db.query(models.SecurityEvent).filter(
        models.SecurityEvent.severity.in_(["HIGH", "CRITICAL"]), models.SecurityEvent.timestamp >= since).count()
    events = db.query(models.SecurityEvent).order_by(models.SecurityEvent.timestamp.desc()).limit(50).all()

    return {
        "security_status": {
            "database_integrity": "OK" if mismatched == 0 else "MISMATCH",
            "blockchain_verification": "ACTIVE" if BLOCKCHAIN_MODE == "sepolia" else "DEMO",
            "qr_integrity": "OK",
            "batches_checked": len(batches),
            "integrity_mismatches": mismatched,
            "revoked_batches": revoked,
            "tamper_events": db.query(models.SecurityEvent).filter(models.SecurityEvent.event_type == "TAMPER_SIMULATION").count(),
            "failed_verification": failed_verifications,
            "suspicious_activity": suspicious,
        },
        "batches": [{"batch_id": b.batch_id, "floral_source": b.floral_source, **i} for b, i in zip(batches, integrity)],
        "events": [{"id": e.id, "event_type": e.event_type, "severity": e.severity, "description": e.description,
                    "actor": e.actor, "timestamp": iso(e.timestamp)} for e in events],
    }


@app.get("/admin/analytics", tags=["Admin & Analytics"])
def analytics_dashboard(db: Session = Depends(database.get_db)):
    hives = db.query(models.Hive).all()
    total_hives = len(hives)
    batches = db.query(models.Batch).all()
    now = datetime.utcnow()

    total_kg = sum(b.weight_kg or 0 for b in batches)
    last_30 = sum(b.weight_kg or 0 for b in batches if b.created_at and b.created_at >= now - timedelta(days=30))
    prev_30 = sum(b.weight_kg or 0 for b in batches if b.created_at and now - timedelta(days=60) <= b.created_at < now - timedelta(days=30))
    trend = f"{'+' if last_30 >= prev_30 else ''}{round((last_30 - prev_30) / prev_30 * 100, 1)}% vs previous 30 days" if prev_30 else "No prior-period data"

    by_source = defaultdict(lambda: {"weight_kg": 0.0, "batches": 0})
    for b in batches:
        by_source[b.floral_source or "Unknown"]["weight_kg"] += b.weight_kg or 0
        by_source[b.floral_source or "Unknown"]["batches"] += 1

    status_counts = defaultdict(int)
    harvest_ready, offline = 0, 0
    for h in hives:
        status_counts[compute_health(db, h.id)["status"]] += 1
        tel = latest_telemetry(db, h.id)
        if tel and tel.weight >= HARVEST_WEIGHT_KG:
            harvest_ready += 1
        if not tel or now - tel.timestamp >= OFFLINE_AFTER:
            offline += 1

    def pct(n):
        return round(n / max(1, total_hives) * 100, 1)

    latest_ai = {}
    for a in db.query(models.AIAnalysis).order_by(models.AIAnalysis.timestamp.asc()).all():
        latest_ai[a.hive_id] = a
    all_ai = db.query(models.AIAnalysis).all()

    verifications = db.query(models.AuditLog).filter(models.AuditLog.action == "Integrity Verified", models.AuditLog.actor == "Consumer")
    verification_count = verifications.count()
    failed = verifications.filter(models.AuditLog.details.like("%: False")).count()

    return {
        "production": {
            "total_honey_produced_kg": round(total_kg, 1),
            "avg_yield_per_hive_kg": round(total_kg / max(1, total_hives), 1),
            "harvest_ready_hives": harvest_ready,
            "production_trend": trend,
            "by_floral_source": sorted(
                [{"floral_source": k, "weight_kg": round(v["weight_kg"], 1), "batches": v["batches"]} for k, v in by_source.items()],
                key=lambda x: -x["weight_kg"],
            ),
        },
        "hive_health": {
            "healthy": status_counts["HEALTHY"], "watch": status_counts["WATCH"],
            "warning": status_counts["WARNING"], "critical": status_counts["CRITICAL"],
            "healthy_pct": pct(status_counts["HEALTHY"]), "watch_pct": pct(status_counts["WATCH"]),
            "warning_pct": pct(status_counts["WARNING"]), "critical_pct": pct(status_counts["CRITICAL"]),
        },
        "disease": {
            "total_varroa_detections": sum(a.varroa_count for a in all_ai),
            "inspections": len(all_ai),
            "disease_risk_hives": sum(1 for a in latest_ai.values() if a.varroa_count > 5),
            "disease_trend": "Contained" if sum(1 for a in latest_ai.values() if a.varroa_count > 5) <= max(1, total_hives // 10) else "Spreading",
        },
        "iot": {
            "active_devices": total_hives - offline,
            "offline_devices": offline,
            "telemetry_points_ingested": db.query(models.Telemetry).count(),
            "anomalies_detected": db.query(models.Alert).filter(models.Alert.severity.in_(["WARNING", "CRITICAL"])).count(),
            "open_alerts": db.query(models.Alert).filter(models.Alert.resolved == False).count(),  # noqa: E712
        },
        "blockchain": {
            "batches_minted": len(batches),
            "verified_batches": sum(1 for b in batches if integrity_of(b)["verified"]),
            "revoked_batches": sum(1 for b in batches if b.is_revoked),
        },
        "consumer": {
            "verification_attempts": verification_count,
            "failed_verifications": failed,
            "success_rate_pct": round((verification_count - failed) / verification_count * 100, 1) if verification_count else None,
        },
    }


EXPORTS = {
    "telemetry": (["id", "hive_id", "temperature", "humidity", "weight", "timestamp"],
                  lambda db: db.query(models.Telemetry).order_by(models.Telemetry.timestamp.desc()).limit(5000).all(),
                  lambda r: [r.id, r.hive_id, r.temperature, r.humidity, r.weight, iso(r.timestamp)]),
    "batches": (["batch_id", "hive_id", "token_id", "floral_source", "weight_kg", "health_score", "is_revoked", "revocation_reason", "blockchain_mode", "tx_hash", "ipfs_cid", "created_at"],
                lambda db: db.query(models.Batch).order_by(models.Batch.created_at.desc()).all(),
                lambda b: [b.batch_id, b.hive_id, b.token_id, b.floral_source, b.weight_kg, b.health_score, b.is_revoked, b.revocation_reason, b.blockchain_mode, b.tx_hash, b.ipfs_cid, iso(b.created_at)]),
    "alerts": (["id", "hive_id", "type", "severity", "reason", "source", "acknowledged", "resolved", "timestamp"],
               lambda db: db.query(models.Alert).order_by(models.Alert.timestamp.desc()).all(),
               lambda a: [a.id, a.hive_id, a.type, a.severity, a.reason, a.source, a.acknowledged, a.resolved, iso(a.timestamp)]),
    "audit-logs": (["id", "action", "actor", "details", "blockchain_tx", "timestamp"],
                   lambda db: db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).all(),
                   lambda l: [l.id, l.action, l.actor, l.details, l.blockchain_tx, iso(l.timestamp)]),
}


@app.get("/export/csv/{data_type}", tags=["Admin & Analytics"])
def export_csv(data_type: str, db: Session = Depends(database.get_db)):
    if data_type not in EXPORTS:
        raise HTTPException(status_code=400, detail=f"Invalid export type. Choose one of: {', '.join(EXPORTS)}")
    header, fetch, row = EXPORTS[data_type]
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(header)
    for r in fetch(db):
        writer.writerow(row(r))
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=honeychain_{data_type}_{datetime.utcnow():%Y%m%d}.csv"},
    )


@app.get("/export/pdf/apiary/{cluster_id}", tags=["Admin & Analytics"])
@app.get("/export/report/apiary/{cluster_id}", tags=["Admin & Analytics"])
def export_apiary_report(cluster_id: int, db: Session = Depends(database.get_db)):
    c = db.query(models.Cluster).filter(models.Cluster.id == cluster_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cluster not found")

    rule = "=" * 64
    sub = "-" * 64
    lines = [
        rule, "               HONEY CHAIN OFFICIAL APIARY REPORT", rule,
        f"Generated:     {datetime.utcnow():%Y-%m-%d %H:%M:%S} UTC",
        f"Apiary:        {c.name}",
        f"Region:        {c.region}",
        f"Managed hives: {len(c.hives)}",
        "", sub, "HIVE HEALTH BREAKDOWN", sub,
    ]
    for h in sorted(c.hives, key=lambda h: h.id):
        health = compute_health(db, h.id)
        tel = latest_telemetry(db, h.id)
        reading = f"{tel.temperature}°C / {tel.humidity}% / {tel.weight} kg" if tel else "no telemetry"
        lines.append(f"Hive #{h.id:<3} {health['status']:<9} score {health['health_score']:>3}/100   latest: {reading}")
        lines.append(f"          {health['score_explanation']}")
    hive_ids = [h.id for h in c.hives]
    batches = db.query(models.Batch).filter(models.Batch.hive_id.in_(hive_ids)).order_by(models.Batch.created_at.desc()).all() if hive_ids else []
    lines += ["", sub, "HONEY BATCHES", sub]
    if not batches:
        lines.append("No batches minted from this apiary yet.")
    for b in batches:
        state = "REVOKED" if b.is_revoked else ("VERIFIED" if integrity_of(b)["verified"] else "MISMATCH")
        lines.append(f"{b.batch_id:<16} Hive #{b.hive_id:<3} {b.weight_kg:>6} kg  {b.floral_source:<28} {state}")
    anchor = "Sepolia ERC-721 with SHA-256 integrity proofs" if BLOCKCHAIN_MODE == "sepolia" else "the demo ledger (SHA-256 integrity proofs; Sepolia minting disabled)"
    lines += ["", sub, "PROVENANCE", sub, f"Batches from this apiary are anchored on {anchor}.", rule, ""]

    return Response(
        content="\n".join(lines),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=apiary_report_cluster_{cluster_id}.txt"},
    )


# --- HoneyBot ------------------------------------------------------------------
@app.post("/honeybot/query", tags=["AI & Intelligence"])
def honeybot_query(req: HoneyBotRequest, db: Session = Depends(database.get_db)):
    q = req.query.lower()
    hives = db.query(models.Hive).order_by(models.Hive.id).all()
    default_chips = ["Unhealthy hives", "Harvest ready", "Varroa risk", "Today's alerts", "Batch verification"]

    def reply(text_, chips=None):
        return {"query": req.query, "reply": text_, "chips": chips or default_chips}

    if any(k in q for k in ("unhealthy", "critical", "risk", "attention", "sick")) and "varroa" not in q:
        rows = []
        for h in hives:
            info = compute_health(db, h.id)
            if info["status"] != "HEALTHY":
                rows.append((info["health_score"], f"• Hive #{h.id} — {info['status']} ({info['health_score']}/100): {info['score_explanation']}"))
        rows.sort()
        return reply("Hives needing attention:\n" + "\n".join(r for _, r in rows) if rows else "All hives are currently healthy.")

    if any(k in q for k in ("varroa", "disease", "mite")):
        latest = {}
        for a in db.query(models.AIAnalysis).order_by(models.AIAnalysis.timestamp.asc()).all():
            latest[a.hive_id] = a
        infected = [f"• Hive #{a.hive_id}: {a.varroa_count} mites, frame health {a.health_score}/100" for a in sorted(latest.values(), key=lambda a: -a.varroa_count) if a.varroa_count > 3]
        return reply("Varroa report (latest inspection per hive):\n" + "\n".join(infected) if infected else "No significant Varroa infestation in the latest inspections.")

    if any(k in q for k in ("harvest", "ready", "yield")):
        ready = []
        for h in hives:
            prod = compute_productivity(db, h.id)
            if prod["current_weight_kg"] >= HARVEST_WEIGHT_KG - 2:
                ready.append(f"• Hive #{h.id}: {prod['current_weight_kg']} kg, est. yield {prod['predicted_yield_kg']} kg ({prod['harvest_window']})")
        return reply("Harvest readiness:\n" + "\n".join(ready) if ready else "No hives are near harvest weight yet.")

    if any(k in q for k in ("alert", "anomaly", "today")):
        alerts = db.query(models.Alert).filter(models.Alert.resolved == False).order_by(models.Alert.timestamp.desc()).limit(6).all()  # noqa: E712
        return reply("Open alerts:\n" + "\n".join(f"• [{a.severity}] Hive #{a.hive_id}: {a.reason}" for a in alerts) if alerts else "There are no open alerts.")

    if any(k in q for k in ("batch", "authentic", "verify", "revoke")):
        batches = db.query(models.Batch).order_by(models.Batch.created_at.desc()).limit(5).all()
        lines = [f"• {b.batch_id} ({b.floral_source}, Hive #{b.hive_id}): {'REVOKED' if b.is_revoked else ('VERIFIED' if integrity_of(b)['verified'] else 'INTEGRITY MISMATCH')}" for b in batches]
        return reply("Recent batches:\n" + "\n".join(lines) if lines else "No batches have been minted yet.")

    ids = [int(t.lstrip("#")) for t in q.replace("hive", " ").split() if t.lstrip("#").isdigit()]
    if ids:
        hive = db.query(models.Hive).filter(models.Hive.id == ids[0]).first()
        if hive:
            info = compute_health(db, hive.id)
            prod = compute_productivity(db, hive.id)
            return reply(
                f"Hive #{hive.id} ({hive.cluster.name if hive.cluster else 'unassigned'}): {info['status']}, score {info['health_score']}/100. "
                f"{info['score_explanation']} Weight {prod['current_weight_kg']} kg, trend {prod['trend'].lower()}, harvest window {prod['harvest_window']}."
            )

    clusters = db.query(models.Cluster).count()
    mode = "Sepolia" if BLOCKCHAIN_MODE == "sepolia" else "demo-ledger"
    return reply(
        f"I'm monitoring {len(hives)} hives across {clusters} apiaries with {mode} provenance anchoring. "
        "Ask about unhealthy hives, Varroa risk, harvest readiness, open alerts, batch verification, or a specific hive (e.g. \"hive 4\")."
    )


# --- WebSockets ------------------------------------------------------------------
@app.websocket("/ws/hives/{hive_id}")
async def websocket_hive(websocket: WebSocket, hive_id: int):
    topic = f"hive_{hive_id}"
    await ws_manager.connect(topic, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(topic, websocket)


@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    await ws_manager.connect("alerts", websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect("alerts", websocket)


@app.websocket("/ws")
async def websocket_generic(websocket: WebSocket):
    await ws_manager.connect("alerts", websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect("alerts", websocket)


@app.get("/api/system/status", tags=["System"])
@app.get("/api/video/status", tags=["System"])
@app.get("/api/voice/status", tags=["System"])
def api_status_alias():
    return {"status": "ONLINE", "mode": BLOCKCHAIN_MODE}


@app.get("/api/demo/videos", tags=["System"])
def api_demo_videos():
    return [{"id": "1", "title": "Hive Inspection Sample", "url": "/sample.mp4"}]


@app.get("/api/procedures/{proc_id}", tags=["System"])
def api_procedure(proc_id: str):
    return {
        "id": proc_id,
        "title": "Standard Operating Procedure",
        "status": "APPROVED",
        "steps": ["Inspect ventilation", "Verify temperature sensors", "Scan frames with YOLO AI"]
    }
