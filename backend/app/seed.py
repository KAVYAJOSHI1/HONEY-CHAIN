"""Demo dataset: 3 apiaries, 18 hives, 24h of telemetry, batches, analyses, alerts and logs."""
import random
from datetime import datetime, timedelta

from .database import Base, SessionLocal, engine, migrate
from .intelligence import refresh_hive_status
from .models import (
    AIAnalysis, Alert, AuditLog, Batch, Cluster, Hive, Notification, SecurityEvent, Telemetry, User,
)
from .services import IPFSService, canonical_hash


def canonical_string(hive_id, floral_source, weight, health_score) -> str:
    return f"{hive_id}_{floral_source}_{float(weight)}_{float(health_score)}"


def reset_db():
    Base.metadata.drop_all(bind=engine)
    migrate()


def seed_data():
    rng = random.Random(7)
    db = SessionLocal()
    now = datetime.utcnow()
    try:
        db.add_all([
            User(id=1, wallet_address="0xKVICAdmin8829103849102", role="ADMIN", name="KVIC National Honey Board"),
            User(id=2, wallet_address="0xBeekeeper771928340129", role="BEEKEEPER", name="Ramesh Sharma"),
            Cluster(id=1, name="Himalayan Foothills Apiary", region="Dehradun, Uttarakhand"),
            Cluster(id=2, name="Nilgiri Biosphere Hub", region="Wayanad, Kerala"),
            Cluster(id=3, name="Sundarbans Mangrove Cluster", region="South 24 Parganas, West Bengal"),
        ])
        db.flush()

        layouts = [
            (1, range(1, 8), (30.3165, 78.0322), (0.005, 0.004)),
            (2, range(8, 14), (11.6854, 76.1320), (0.006, 0.005)),
            (3, range(14, 19), (21.9497, 88.9007), (0.007, 0.006)),
        ]
        hives = []
        for cluster_id, ids, (lat0, lng0), (dlat, dlng) in layouts:
            for i, hive_id in enumerate(ids):
                hives.append(Hive(
                    id=hive_id, owner_id=2, cluster_id=cluster_id,
                    gps_lat=round(lat0 + i * dlat, 4), gps_long=round(lng0 + i * dlng, 4),
                    installed_at=now - timedelta(days=rng.randint(60, 400)), status="HEALTHY",
                ))
        db.add_all(hives)
        db.flush()

        # 24 hourly readings per hive. A few hives carry scripted problems for the demo.
        overheating, humid, harvest_ready, swarming = {4, 16}, {2, 11}, {1, 8, 14}, {12}
        # Two weeks of daily history (pre-harvest record for the batches below).
        for hive in hives:
            for day in range(15, 1, -1):
                db.add(Telemetry(
                    hive_id=hive.id,
                    temperature=round(34.5 + rng.uniform(-0.6, 0.6), 1),
                    humidity=round(52.0 + rng.uniform(-3, 3), 1),
                    weight=round(19.0 + (15 - day) * 0.35 + rng.uniform(-0.2, 0.2), 1),
                    timestamp=now - timedelta(days=day, hours=rng.randint(0, 6)),
                ))
        for hive in hives:
            base_temp = 38.2 if hive.id in overheating else 34.5
            base_hum = 72.0 if hive.id in humid else 52.0
            base_weight = 30.5 if hive.id in harvest_ready else 21.0 + (hive.id % 6) * 0.9
            for step in range(24):
                ts = now - timedelta(hours=24 - step)
                weight = base_weight + step * 0.12
                if hive.id in swarming and step >= 20:
                    weight -= 2.5
                db.add(Telemetry(
                    hive_id=hive.id,
                    temperature=round(base_temp + rng.uniform(-0.4, 0.4), 1),
                    humidity=round(base_hum + rng.uniform(-1.5, 1.5), 1),
                    weight=round(weight + rng.uniform(-0.08, 0.08), 1),
                    timestamp=ts,
                ))
        db.flush()

        batches = [
            ("demo-batch-101", 1, "Wildflower Honey", 32.5, 94.0, False, None, 9),
            ("demo-batch-102", 8, "Eucalyptus Honey", 34.0, 91.0, False, None, 7),
            ("demo-batch-103", 14, "Sundarbans Mangrove Honey", 29.5, 88.0, False, None, 5),
            ("demo-batch-104", 2, "Acacia Honey", 31.0, 78.0, True, "Quality inspection failure — excess moisture content", 4),
            ("demo-batch-105", 5, "Mustard Honey", 33.2, 96.0, False, None, 2),
        ]
        for idx, (batch_id, hive_id, floral, weight, score, revoked, reason, days_ago) in enumerate(batches):
            created = now - timedelta(days=days_ago)
            data_hash = canonical_hash(canonical_string(hive_id, floral, weight, score))
            ipfs = IPFSService.pin_json({
                "hive_id": hive_id, "floral_source": floral, "weight_kg": weight,
                "ai_health_score": score, "timestamp": created.isoformat(),
            })
            db.add(Batch(
                batch_id=batch_id, hive_id=hive_id, token_id=str(1001 + idx), ipfs_cid=ipfs,
                tx_hash=data_hash, data_hash=data_hash, health_score=score, floral_source=floral,
                weight_kg=weight, is_revoked=revoked, revocation_reason=reason, blockchain_mode="demo",
                created_at=created, updated_at=created,
            ))
            db.add(AuditLog(action="Batch Minted", actor="Ramesh Sharma", timestamp=created,
                            details=f"Minted batch {batch_id} ({weight} kg {floral}) from Hive #{hive_id}",
                            blockchain_tx=data_hash))
            db.add(AIAnalysis(hive_id=hive_id, health_score=score, infection_rate=round(rng.uniform(0.005, 0.03), 3),
                              varroa_count=rng.randint(0, 2), healthy_bee_count=rng.randint(70, 90),
                              image_ref=f"preharvest_hive{hive_id}.jpg", timestamp=created - timedelta(days=1)))
            if revoked:
                db.add(AuditLog(action="Batch Revoked", actor="KVIC Admin", timestamp=created + timedelta(days=1),
                                details=f"Revoked batch {batch_id}. Reason: {reason}"))

        db.add_all([
            AIAnalysis(hive_id=1, health_score=94.0, infection_rate=0.013, varroa_count=1, healthy_bee_count=78,
                       image_ref="frame_hive1.jpg", timestamp=now - timedelta(hours=30)),
            AIAnalysis(hive_id=2, health_score=81.0, infection_rate=0.06, varroa_count=4, healthy_bee_count=65,
                       image_ref="frame_hive2.jpg", timestamp=now - timedelta(hours=20)),
            AIAnalysis(hive_id=4, health_score=62.0, infection_rate=0.23, varroa_count=11, healthy_bee_count=48,
                       image_ref="frame_hive4.jpg", timestamp=now - timedelta(hours=6)),
            AIAnalysis(hive_id=8, health_score=91.0, infection_rate=0.024, varroa_count=2, healthy_bee_count=82,
                       image_ref="frame_hive8.jpg", timestamp=now - timedelta(hours=12)),
            AIAnalysis(hive_id=16, health_score=54.0, infection_rate=0.46, varroa_count=16, healthy_bee_count=35,
                       image_ref="frame_hive16.jpg", timestamp=now - timedelta(hours=3)),
        ])

        alerts = [
            Alert(hive_id=4, type="TEMPERATURE", severity="CRITICAL", reason="Hive temperature overheating",
                  message="Temperature reached 38.4°C", source="IoT Telemetry", current_value=38.4,
                  timestamp=now - timedelta(minutes=40)),
            Alert(hive_id=16, type="VARROA", severity="CRITICAL", reason="High Varroa infestation detected",
                  message="16 mites counted on inspected frame", source="AI Vision", current_value=16.0,
                  timestamp=now - timedelta(hours=3)),
            Alert(hive_id=2, type="HUMIDITY", severity="WARNING", reason="Excess moisture detected",
                  message="Humidity reached 72.6%", source="IoT Telemetry", current_value=72.6,
                  timestamp=now - timedelta(hours=1, minutes=10)),
            Alert(hive_id=12, type="WEIGHT", severity="CRITICAL", reason="Rapid weight drop (swarming or robbing)",
                  message="Weight dropped by 2.5 kg", source="IoT Telemetry", current_value=21.4,
                  timestamp=now - timedelta(hours=4)),
            Alert(hive_id=1, type="HARVEST_READY", severity="SUCCESS", reason="Hive crossed harvest threshold",
                  message="Weight crossed 30 kg", source="Rule Engine", current_value=33.2,
                  timestamp=now - timedelta(hours=2)),
            Alert(hive_id=11, type="ANOMALY", severity="WARNING", reason="Multivariate sensor anomaly detected",
                  message="IsolationForest flagged environmental drift", source="Anomaly Engine", current_value=72.1,
                  timestamp=now - timedelta(hours=5)),
            Alert(hive_id=7, type="TEMPERATURE", severity="WARNING", reason="Hive temperature below ideal",
                  message="Temperature dropped to 31.6°C", source="IoT Telemetry", current_value=31.6,
                  timestamp=now - timedelta(days=2), acknowledged=True, resolved=True),
        ]
        db.add_all(alerts)
        for alert in alerts:
            db.add(Notification(message=f"Hive #{alert.hive_id}: {alert.reason}", timestamp=alert.timestamp,
                                is_read=alert.resolved))

        db.add_all([
            AuditLog(action="Apiary Registered", actor="KVIC Admin", timestamp=now - timedelta(days=30),
                     details="Registered 3 apiary clusters in Dehradun, Wayanad and South 24 Parganas"),
            AuditLog(action="AI Frame Inspection", actor="Vision Model", timestamp=now - timedelta(hours=6),
                     details="Analyzed frame for Hive #4 — 11 Varroa mites detected"),
            AuditLog(action="Integrity Verified", actor="Consumer", timestamp=now - timedelta(days=3),
                     details="Verified batch demo-batch-101 authenticity: True"),
        ])
        db.add_all([
            SecurityEvent(event_type="UNAUTHORIZED_ACCESS_ATTEMPT", severity="LOW", actor="192.168.1.45",
                          description="Rejected request to an admin endpoint without a valid token",
                          timestamp=now - timedelta(days=1)),
            SecurityEvent(event_type="BATCH_REVOKED", severity="HIGH", actor="KVIC Admin",
                          description="Batch demo-batch-104 revoked: excess moisture content",
                          timestamp=now - timedelta(days=3)),
        ])
        db.commit()

        for hive in hives:
            refresh_hive_status(db, hive.id)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def seed_if_empty() -> bool:
    db = SessionLocal()
    try:
        empty = db.query(Hive).count() == 0
    finally:
        db.close()
    if empty:
        seed_data()
    return empty
