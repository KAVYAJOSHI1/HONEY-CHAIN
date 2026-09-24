import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup test DB
os.environ["DATABASE_URL"] = "sqlite:///./test_honeychain.db"
os.environ["BLOCKCHAIN_MODE"] = "demo"

from app.main import app
from app.database import Base, get_db
from app.models import Hive

engine = create_engine(os.environ["DATABASE_URL"], connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    # Seed a hive for tests
    db = TestingSessionLocal()
    hive = Hive(id=1, owner_id=1, cluster_id=1, gps_lat=40.0, gps_long=-75.0)
    db.add(hive)
    db.commit()
    yield
    Base.metadata.drop_all(bind=engine)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the Honey Chain API"}

def test_telemetry_harvest_logic():
    # Initial telemetry, weight < 30
    res = client.post("/telemetry/", json={"hive_id": 1, "temperature": 35.0, "humidity": 50.0, "weight": 28.0})
    assert res.status_code == 200
    assert res.json()["harvest_ready"] == False
    
    # Weight > 30, but delta is positive
    res2 = client.post("/telemetry/", json={"hive_id": 1, "temperature": 35.0, "humidity": 50.0, "weight": 32.0})
    assert res2.status_code == 200
    assert res2.json()["harvest_ready"] == True

def test_analyze_frame_valid_mock():
    # Create a tiny valid dummy image
    dummy_image = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    res = client.post(
        "/analyze-frame/",
        files={"file": ("test.png", dummy_image, "image/png")},
        data={"hive_id": 1}
    )
    assert res.status_code == 200
    assert "health_score" in res.json()["results"]

def test_analyze_frame_invalid_mime():
    res = client.post(
        "/analyze-frame/",
        files={"file": ("test.txt", b"hello", "text/plain")},
        data={"hive_id": 1}
    )
    assert res.status_code == 400
    assert "Invalid file type" in res.json()["detail"]

def test_mint_batch_and_retrieve():
    # Create batch
    mint_res = client.post("/mint-batch/", json={
        "hive_id": 1,
        "floral_source": "Test Honey",
        "weight": 32.0,
        "health_score": 95.0
    })
    assert mint_res.status_code == 200
    mint_data = mint_res.json()
    batch_id = mint_data["batch_id"]
    
    # Verify response contains critical fields
    assert "qr_code" in mint_data
    assert "ipfs://" in mint_data["ipfs_cid"]
    assert mint_data["blockchain_mode"] == "demo"
    assert mint_data["tx_hash"].startswith("0x")

    # Retrieve batch
    get_res = client.get(f"/batches/{batch_id}")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["batch_id"] == batch_id
    assert get_data["health_score"] == 95.0
    assert get_data["is_revoked"] == False

def test_retrieve_missing_batch():
    res = client.get("/batches/invalid-uuid-123")
    assert res.status_code == 404

def test_revoke_batch():
    mint_res = client.post("/mint-batch/", json={
        "hive_id": 1,
        "floral_source": "Test Honey 2",
        "weight": 31.0,
        "health_score": 90.0
    })
    batch_id = mint_res.json()["batch_id"]

    revoke_res = client.post(f"/batches/{batch_id}/revoke", json={"reason": "Test revocation"})
    assert revoke_res.status_code == 200
    
    get_res = client.get(f"/batches/{batch_id}")
    assert get_res.json()["is_revoked"] == True
    assert get_res.json()["revocation_reason"] == "Test revocation"

def test_revoke_missing_batch():
    revoke_res = client.post("/batches/invalid-id/revoke", json={"reason": "test"})
    assert revoke_res.status_code == 404

def test_qr_code_integrity():
    mint_res = client.post("/mint-batch/", json={
        "hive_id": 1,
        "floral_source": "Test QR",
        "weight": 25.0,
        "health_score": 80.0
    })
    batch_id = mint_res.json()["batch_id"]
    qr_code = mint_res.json()["qr_code"]
    
    # 1. Check QR only has public info (doesn't leak DB internals)
    assert "data:image/png;base64," in qr_code
    
def test_verify_integrity_valid():
    mint_res = client.post("/mint-batch/", json={
        "hive_id": 1,
        "floral_source": "Wildflower",
        "weight": 32.5,
        "health_score": 90.0
    })
    batch_id = mint_res.json()["batch_id"]

    res = client.post(f"/batches/{batch_id}/verify-integrity")
    assert res.status_code == 200
    data = res.json()
    assert data["verified"] == True
    assert data["status"] == "Authentic"
    assert data["current_hash"] == data["anchored_hash"]

def test_verify_integrity_tampered():
    mint_res = client.post("/mint-batch/", json={
        "hive_id": 1,
        "floral_source": "Wildflower",
        "weight": 32.5,
        "health_score": 90.0
    })
    batch_id = mint_res.json()["batch_id"]

    # Tamper the DB directly (Simulate hack)
    db = TestingSessionLocal()
    from app.models import Batch
    db_batch = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    db_batch.tx_hash = "0xTAMPEREDHASH123456789"
    db.commit()
    db.close()

    res = client.post(f"/batches/{batch_id}/verify-integrity")
    assert res.status_code == 200
    data = res.json()
    assert data["verified"] == False
    assert data["status"] == "Integrity Mismatch Detected"

def test_new_historical_endpoints():
    # 1. Telemetry
    res_tel = client.get("/hives/1/telemetry")
    assert res_tel.status_code == 200
    assert isinstance(res_tel.json(), list)
    
    # 2. Analyses
    res_an = client.get("/hives/1/analyses")
    assert res_an.status_code == 200
    assert isinstance(res_an.json(), list)
    
    # 3. Alerts
    res_al = client.get("/alerts")
    assert res_al.status_code == 200
    assert isinstance(res_al.json(), list)
    
    # 4. Notifications
    res_notif = client.get("/notifications")
    assert res_notif.status_code == 200
    assert isinstance(res_notif.json(), list)
    
    # 5. KPIs
    res_kpi = client.get("/stats/kpis")
    assert res_kpi.status_code == 200
    data_kpi = res_kpi.json()
    assert "total_hives" in data_kpi
    assert "total_batches" in data_kpi
    assert "alerts" in data_kpi

def test_search_endpoint():
    res_search = client.get("/search?q=1")
    assert res_search.status_code == 200
    data = res_search.json()
    assert "hives" in data
    assert "batches" in data
    # We seeded hive 1, so it should be found
    assert any(h["id"] == 1 for h in data["hives"])

def test_simulate_scenario():
    res = client.post("/simulate-scenario", json={"hive_id": 1, "scenario": "HIGH_TEMPERATURE"})
    assert res.status_code == 200
    assert "telemetry" in res.json()
    assert res.json()["telemetry"]["hive_id"] == 1

def test_tamper_and_restore_batch():
    mint_res = client.post("/mint-batch/", json={
        "hive_id": 1,
        "floral_source": "Wildflower",
        "weight": 32.5,
        "health_score": 90.0
    })
    batch_id = mint_res.json()["batch_id"]

    # Tamper
    t_res = client.post(f"/batches/{batch_id}/tamper", json={"tampered_score": 30.0})
    assert t_res.status_code == 200
    
    # Verify tampered
    v_res = client.post(f"/batches/{batch_id}/verify-integrity")
    assert v_res.json()["verified"] == False
    assert v_res.json()["is_tampered"] == True

    # Restore
    r_res = client.post(f"/batches/{batch_id}/restore")
    assert r_res.status_code == 200

    # Verify restored
    v_res2 = client.post(f"/batches/{batch_id}/verify-integrity")
    assert v_res2.json()["verified"] == True

