import os
import sys
import uuid
import hashlib
from datetime import datetime, timedelta
import random

os.environ["DATABASE_URL"] = "sqlite:///./honeychain.db"
os.environ["BLOCKCHAIN_MODE"] = "demo"

from app.database import engine, Base, SessionLocal
from app.models import User, Cluster, Hive, Telemetry, Batch, Alert, AIAnalysis, Notification, AuditLog, SecurityEvent

def reset_db():
    print("Dropping old tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating new tables...")
    Base.metadata.create_all(bind=engine)

def seed_data():
    db = SessionLocal()
    
    print("Seeding Users & Apiary Clusters...")
    admin = User(id=1, wallet_address="0xKVICAdmin8829103849102", role="ADMIN", name="KVIC National Honey Board")
    beekeeper = User(id=2, wallet_address="0xBeekeeper771928340129", role="BEEKEEPER", name="Ramesh Sharma (Master Beekeeper)")
    
    c1 = Cluster(id=1, name="Himalayan Foothills Apiary", region="Dehradun, Uttarakhand")
    c2 = Cluster(id=2, name="Nilgiri Biosphere Hub", region="Wayanad, Kerala")
    c3 = Cluster(id=3, name="Sundarbans Mangrove Cluster", region="West Bengal")
    
    db.add_all([admin, beekeeper, c1, c2, c3])
    db.commit()

    print("Seeding 18 Hives across 3 Apiaries...")
    hives = []
    # Cluster 1: Hives 1-7
    c1_coords = [(30.3165 + (i*0.005), 78.0322 + (i*0.004)) for i in range(7)]
    for idx, (lat, lng) in enumerate(c1_coords, start=1):
        status = "CRITICAL" if idx == 4 else ("ATTENTION_REQUIRED" if idx == 2 else "ACTIVE")
        hives.append(Hive(id=idx, owner_id=2, cluster_id=1, gps_lat=round(lat,4), gps_long=round(lng,4), status=status))

    # Cluster 2: Hives 8-13
    c2_coords = [(11.6854 + (i*0.006), 76.1320 + (i*0.005)) for i in range(6)]
    for idx, (lat, lng) in enumerate(c2_coords, start=8):
        status = "ATTENTION_REQUIRED" if idx == 11 else "ACTIVE"
        hives.append(Hive(id=idx, owner_id=2, cluster_id=2, gps_lat=round(lat,4), gps_long=round(lng,4), status=status))

    # Cluster 3: Hives 14-18
    c3_coords = [(21.9497 + (i*0.007), 88.9007 + (i*0.006)) for i in range(5)]
    for idx, (lat, lng) in enumerate(c3_coords, start=14):
        status = "CRITICAL" if idx == 16 else "ACTIVE"
        hives.append(Hive(id=idx, owner_id=2, cluster_id=3, gps_lat=round(lat,4), gps_long=round(lng,4), status=status))

    db.add_all(hives)
    db.commit()
    
    print("Seeding Telemetry history for all hives...")
    now = datetime.utcnow()
    for hive in hives:
        # Generate 15 telemetry points per hive
        base_temp = 38.2 if hive.id in [4, 16] else 34.5
        base_hum = 72.0 if hive.id in [2, 11] else 52.0
        base_weight = 32.5 if hive.id in [1, 8, 14] else 24.0 + (hive.id * 0.5)

        for t_step in range(15):
            ts = now - timedelta(hours=15 - t_step)
            temp = round(base_temp + random.uniform(-0.4, 0.4), 1)
            hum = round(base_hum + random.uniform(-1.5, 1.5), 1)
            weight = round(base_weight + (t_step * 0.25) + random.uniform(-0.1, 0.1), 1)
            
            db.add(Telemetry(hive_id=hive.id, temperature=temp, humidity=hum, weight=weight, timestamp=ts))

    db.commit()

    print("Seeding Pre-Minted Sample Honey Batches...")
    batches_data = [
        ("demo-batch-101", 1, "1001", "Wildflower Honey", 32.5, 94.0, False, None),
        ("demo-batch-102", 8, "1002", "Eucalyptus Honey", 34.0, 91.0, False, None),
        ("demo-batch-103", 14, "1003", "Sundarbans Mangrove Honey", 29.5, 88.0, False, None),
        ("demo-batch-104", 2, "1004", "Acacia Honey", 31.0, 78.0, True, "Quality inspection failure - excess moisture content"),
        ("demo-batch-105", 5, "1005", "Mustard Honey", 33.2, 96.0, False, None)
    ]
    
    for b_id, h_id, tok_id, floral, weight, score, revoked, reason in batches_data:
        canonical_string = f"{h_id}_{floral}_{weight}_{score}"
        mock_hash = "0x" + hashlib.sha256(canonical_string.encode()).hexdigest()
        ipfs_cid = f"ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6{tok_id}"

        b = Batch(
            batch_id=b_id,
            hive_id=h_id,
            token_id=tok_id,
            ipfs_cid=ipfs_cid,
            tx_hash=mock_hash,
            health_score=score,
            floral_source=floral,
            weight_kg=weight,
            is_revoked=revoked,
            revocation_reason=reason,
            blockchain_mode="demo",
            created_at=now - timedelta(days=random.randint(1, 10))
        )
        db.add(b)

    print("Seeding AI Vision Analyses...")
    ai_records = [
        AIAnalysis(hive_id=1, health_score=94.0, infection_rate=0.02, varroa_count=1, healthy_bee_count=78, image_ref="frame_sample_1.jpg"),
        AIAnalysis(hive_id=2, health_score=81.0, infection_rate=0.07, varroa_count=4, healthy_bee_count=65, image_ref="frame_sample_2.jpg"),
        AIAnalysis(hive_id=4, health_score=62.0, infection_rate=0.18, varroa_count=11, healthy_bee_count=48, image_ref="frame_sample_4.jpg"),
        AIAnalysis(hive_id=8, health_score=91.0, infection_rate=0.03, varroa_count=2, healthy_bee_count=82, image_ref="frame_sample_8.jpg"),
        AIAnalysis(hive_id=16, health_score=54.0, infection_rate=0.25, varroa_count=16, healthy_bee_count=35, image_ref="frame_sample_16.jpg")
    ]
    db.add_all(ai_records)

    print("Seeding Alerts...")
    alerts = [
        Alert(hive_id=4, type="TEMPERATURE", severity="CRITICAL", reason="Hive temperature overheating (38.2°C)", message="Temp reached 38.2°C", source="IoT Telemetry", current_value=38.2),
        Alert(hive_id=16, type="DISEASE", severity="CRITICAL", reason="High Varroa infestation detected (16 mites)", message="16 mites counted in YOLO frame", source="AI Vision", current_value=16.0),
        Alert(hive_id=2, type="HUMIDITY", severity="WARNING", reason="High internal moisture (72%)", message="Humidity exceeds 65% limit", source="IoT Telemetry", current_value=72.0),
        Alert(hive_id=1, type="HARVEST_READY", severity="SUCCESS", reason="Hive reached harvest weight (32.5 kg)", message="Weight crossed 30kg threshold", source="RuleEngine", current_value=32.5),
        Alert(hive_id=11, type="ANOMALY", severity="WARNING", reason="IsolationForest anomaly detected in environmental stability", message="Multivariate sensor drift", source="Anomaly Engine", current_value=36.8)
    ]
    db.add_all(alerts)

    print("Seeding Notifications & Audit Logs...")
    for alert in alerts:
        db.add(Notification(message=f"Hive #{alert.hive_id}: {alert.reason}"))

    audit_records = [
        AuditLog(action="Apiary Registered", actor="Admin", details="Created 3 Apiary clusters in Dehradun, Wayanad, and West Bengal"),
        AuditLog(action="Telemetry Ingested", actor="IoT Sensor Node #1", details="Ingested 15 historical telemetry cycles"),
        AuditLog(action="AI Frame Inspection", actor="YOLO Vision Model", details="Analyzed Hive #4 frame — 11 Varroa mites detected"),
        AuditLog(action="Batch Minted", actor="Ramesh Sharma", details="Minted Batch #demo-batch-101 (Wildflower Honey 32.5kg)", blockchain_tx="0x6a7b...8f91"),
        AuditLog(action="Batch Verified", actor="Consumer", details="Verified QR & provenance for Batch #demo-batch-101"),
        AuditLog(action="Batch Revoked", actor="KVIC Admin", details="Revoked Batch #demo-batch-104 due to quality compliance failure")
    ]
    db.add_all(audit_records)

    security_events = [
        SecurityEvent(event_type="UNAUTHORIZED_ACCESS_ATTEMPT", severity="LOW", description="Invalid API token attempt on /admin/revoke endpoint", actor="Unknown IP 192.168.1.45"),
        SecurityEvent(event_type="BATCH_TAMPER_SIMULATION", severity="MEDIUM", description="Simulated health score modification on Batch demo-batch-101", actor="Demo System Operator")
    ]
    db.add_all(security_events)

    db.commit()
    print("Demo Data Seeded successfully with V2 Datasets!")
    db.close()

if __name__ == "__main__":
    reset_db()
    seed_data()

