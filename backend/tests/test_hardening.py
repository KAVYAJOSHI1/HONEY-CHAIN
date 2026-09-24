import io
import os

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ["DATABASE_URL"] = "sqlite:///./test_honeychain.db"
os.environ["BLOCKCHAIN_MODE"] = "demo"

from app.database import Base, get_db
from app.main import app
from app.models import Cluster, Hive, Telemetry

engine = create_engine(os.environ["DATABASE_URL"], connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    db.add(Cluster(id=1, name="Test Apiary", region="Test Region"))
    db.add(Hive(id=1, owner_id=1, cluster_id=1, gps_lat=30.0, gps_long=78.0))
    for step in range(3):
        db.add(Telemetry(hive_id=1, temperature=34.5, humidity=50.0, weight=26.0 + step))
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


def png_bytes(color=(200, 150, 50)):
    buf = io.BytesIO()
    Image.new("RGB", (64, 48), color).save(buf, format="PNG")
    return buf.getvalue()


def mint(**overrides):
    body = {"hive_id": 1, "floral_source": "Wildflower", "weight": 12.5, "health_score": 90.0}
    body.update(overrides)
    return client.post("/mint-batch/", json=body)


def test_system_health_reports_database_online():
    data = client.get("/system-health").json()
    assert data["database"] == "ONLINE"
    assert data["isolation_forest"] == "TRAINED"


def test_timestamps_are_marked_utc():
    rows = client.get("/hives/1/telemetry").json()
    assert rows and rows[0]["timestamp"].endswith("Z")


def test_mint_rejects_unknown_hive_and_bad_weight():
    assert mint(hive_id=999).status_code == 404
    assert mint(weight=-5).status_code == 422
    assert mint(floral_source="").status_code == 422


def test_minted_batch_has_origin_qr_and_timeline():
    batch = mint().json()
    assert batch["origin"]["apiary"] == "Test Apiary"
    assert batch["verification_url"].endswith(f"/consumer/{batch['batch_id']}")
    assert client.get(f"/batches/{batch['batch_id']}/qr").json()["qr_code"].startswith("data:image/png;base64,")
    keys = [e["key"] for e in client.get(f"/batches/{batch['batch_id']}/timeline").json()]
    assert "harvest" in keys and "anchored" in keys


def test_revoke_twice_conflicts_and_fails_verification():
    batch_id = mint().json()["batch_id"]
    assert client.post(f"/batches/{batch_id}/revoke", json={"reason": "Residue found"}).status_code == 200
    assert client.post(f"/batches/{batch_id}/revoke", json={"reason": "Again"}).status_code == 409
    result = client.post(f"/batches/{batch_id}/verify-integrity").json()
    assert result["verified"] is False and result["status"] == "REVOKED"


def test_telemetry_for_unknown_hive_is_rejected():
    res = client.post("/telemetry", json={"hive_id": 42, "temperature": 34, "humidity": 50, "weight": 20})
    assert res.status_code == 404


def test_telemetry_updates_hive_status():
    client.post("/telemetry", json={"hive_id": 1, "temperature": 40.0, "humidity": 80.0, "weight": 20.0})
    hive = client.get("/hives/1").json()
    assert hive["status"] in ("WARNING", "CRITICAL")
    assert client.get("/stats/kpis").json()["alerts"] >= 1


def test_resolving_alerts_restores_health():
    client.post("/telemetry", json={"hive_id": 1, "temperature": 39.0, "humidity": 50.0, "weight": 28.0})
    before = client.get("/hives/1/health").json()["factors"]["anomalies"]
    for a in client.get("/alerts?status=open").json():
        client.post(f"/alerts/{a['id']}/resolve")
    after = client.get("/hives/1/health").json()["factors"]["anomalies"]
    assert after > before


def test_analyze_frame_rejects_non_image_bytes():
    res = client.post("/analyze-frame/", files={"file": ("fake.png", b"not an image", "image/png")}, data={"hive_id": 1})
    assert res.status_code == 400


def test_analyze_frame_is_deterministic_and_presets_work():
    img = png_bytes()
    first = client.post("/analyze-frame/", files={"file": ("f.png", img, "image/png")}, data={"hive_id": 1}).json()
    second = client.post("/analyze-frame/", files={"file": ("f.png", img, "image/png")}, data={"hive_id": 1}).json()
    assert first["results"]["mite_count"] == second["results"]["mite_count"]

    varroa = client.post("/analyze-frame/", files={"file": ("f.png", img, "image/png")}, data={"hive_id": 1, "scenario": "varroa"}).json()
    assert varroa["results"]["mite_count"] >= 7
    assert varroa["results"]["health_score"] < 70
    assert all(len(d["bbox_norm"]) == 4 for d in varroa["results"]["detections"])
    assert any(a["type"] == "VARROA" for a in client.get("/alerts").json())


def test_unknown_scenario_is_rejected():
    assert client.post("/simulate-scenario", json={"hive_id": 1, "scenario": "NOPE"}).status_code == 400


def test_weight_increase_scenario_crosses_harvest_threshold():
    res = client.post("/simulate-scenario", json={"hive_id": 1, "scenario": "WEIGHT_INCREASE"}).json()
    assert res["telemetry"]["weight"] >= 30
    assert any(a["type"] == "HARVEST_READY" for a in client.get("/alerts").json())


def test_notifications_mark_read():
    client.post("/telemetry", json={"hive_id": 1, "temperature": 39.0, "humidity": 50.0, "weight": 28.0})
    assert any(not n["is_read"] for n in client.get("/notifications").json())
    client.post("/notifications/read-all")
    assert all(n["is_read"] for n in client.get("/notifications").json())


def test_analytics_uses_real_data():
    mint(floral_source="Acacia", weight=10)
    mint(floral_source="Acacia", weight=5)
    data = client.get("/admin/analytics").json()
    acacia = next(s for s in data["production"]["by_floral_source"] if s["floral_source"] == "Acacia")
    assert acacia == {"floral_source": "Acacia", "weight_kg": 15.0, "batches": 2}
    assert data["hive_health"]["healthy"] + data["hive_health"]["watch"] + data["hive_health"]["warning"] + data["hive_health"]["critical"] == 1


def test_security_detects_tampering():
    batch_id = mint().json()["batch_id"]
    client.post(f"/batches/{batch_id}/tamper", json={"tampered_score": 20})
    status = client.get("/admin/security").json()["security_status"]
    assert status["integrity_mismatches"] == 1
    assert status["database_integrity"] == "MISMATCH"


def test_search_matches_clusters_and_floral_source():
    mint(floral_source="Eucalyptus")
    data = client.get("/search?q=euca").json()
    assert data["batches"] and data["batches"][0]["floral_source"] == "Eucalyptus"
    assert client.get("/search?q=Test Apiary").json()["clusters"][0]["id"] == 1


def test_csv_export_rejects_unknown_type():
    assert client.get("/export/csv/passwords").status_code == 400
    assert "text/csv" in client.get("/export/csv/alerts").headers["content-type"]


def test_reset_demo_seeds_full_dataset():
    assert client.post("/system/reset-demo").status_code == 200
    assert client.get("/stats/kpis").json()["total_hives"] == 18
    verify = client.post("/batches/demo-batch-101/verify-integrity").json()
    assert verify["verified"] is True
    assert client.post("/batches/demo-batch-104/verify-integrity").json()["status"] == "REVOKED"


def test_severe_single_factor_escalates_status():
    # Healthy telemetry but a heavily infested frame must not average out to "healthy".
    db = TestingSessionLocal()
    from app.models import AIAnalysis
    db.add(AIAnalysis(hive_id=1, health_score=40.0, infection_rate=0.3, varroa_count=12, healthy_bee_count=40))
    db.commit()
    db.close()
    health = client.get("/hives/1/health").json()
    assert health["factors"]["disease_risk"] < 30
    assert health["status"] == "CRITICAL"
