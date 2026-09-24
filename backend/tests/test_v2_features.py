import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ["DATABASE_URL"] = "sqlite:///./test_honeychain.db"
os.environ["BLOCKCHAIN_MODE"] = "demo"

from app.main import app
from app.database import Base, get_db
from app.models import Hive, Cluster, Telemetry, Batch, Alert, AIAnalysis

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
def setup_v2_database():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    cluster = Cluster(id=1, name="Test Apiary Cluster", region="Test Region")
    hive = Hive(id=1, owner_id=1, cluster_id=1, gps_lat=30.3165, gps_long=78.0322, status="ACTIVE")
    db.add(cluster)
    db.add(hive)
    # Seed telemetry
    for t_step in range(5):
        db.add(Telemetry(hive_id=1, temperature=34.5, humidity=50.0, weight=25.0 + t_step))
    db.commit()
    yield
    Base.metadata.drop_all(bind=engine)

def test_explainable_health_score():
    res = client.get("/hives/1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["hive_id"] == 1
    assert "health_score" in data
    assert "status" in data
    assert "factors" in data
    assert "temperature" in data["factors"]
    assert "score_explanation" in data

def test_honey_yield_prediction():
    res = client.get("/hives/1/productivity")
    assert res.status_code == 200
    data = res.json()
    assert data["hive_id"] == 1
    assert "predicted_yield_kg" in data
    assert "trend" in data
    assert "harvest_window" in data
    assert data["label"] == "Estimated Yield (Prototype Model)"

def test_beekeeper_recommendations():
    res = client.get("/hives/1/recommendations")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "priority" in data[0]

def test_ai_insights_dashboard():
    res = client.get("/ai-insights")
    assert res.status_code == 200
    data = res.json()
    assert "hive_intelligence" in data
    assert "disease_intelligence" in data
    assert "productivity_intelligence" in data
    assert "recommendations" in data

def test_alert_center_workflow():
    # 1. Post telemetry that creates an alert
    client.post("/telemetry/", json={"hive_id": 1, "temperature": 39.0, "humidity": 50.0, "weight": 25.0})
    
    # 2. Get alerts
    res_alerts = client.get("/alerts")
    assert res_alerts.status_code == 200
    alerts = res_alerts.json()
    assert len(alerts) > 0
    alert_id = alerts[0]["id"]

    # 3. Acknowledge alert
    res_ack = client.post(f"/alerts/{alert_id}/acknowledge")
    assert res_ack.status_code == 200
    assert res_ack.json()["acknowledged"] == True

    # 4. Resolve alert
    res_res = client.post(f"/alerts/{alert_id}/resolve")
    assert res_res.status_code == 200
    assert res_res.json()["resolved"] == True

def test_audit_logs_and_security():
    res_audit = client.get("/audit-logs")
    assert res_audit.status_code == 200
    assert isinstance(res_audit.json(), list)

    res_sec = client.get("/admin/security")
    assert res_sec.status_code == 200
    data_sec = res_sec.json()
    assert "security_status" in data_sec
    assert "events" in data_sec

def test_analytics_dashboard():
    res = client.get("/admin/analytics")
    assert res.status_code == 200
    data = res.json()
    assert "production" in data
    assert "hive_health" in data
    assert "iot" in data
    assert "blockchain" in data
    assert "consumer" in data

def test_export_endpoints():
    res_csv = client.get("/export/csv/telemetry")
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]

    res_pdf = client.get("/export/pdf/apiary/1")
    assert res_pdf.status_code == 200
    assert "HONEY CHAIN OFFICIAL APIARY REPORT" in res_pdf.text

def test_honeybot_query_engine():
    res = client.post("/honeybot/query", json={"query": "Which hives are unhealthy?"})
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert "chips" in data
