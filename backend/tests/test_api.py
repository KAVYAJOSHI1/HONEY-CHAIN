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
        files={"file": ("test.png", dummy_image, "image/png")}
    )
    assert res.status_code == 200
    assert "health_score" in res.json()["results"]

def test_analyze_frame_invalid_mime():
    res = client.post(
        "/analyze-frame/",
        files={"file": ("test.txt", b"hello", "text/plain")}
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
