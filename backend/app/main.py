import os
import uuid
import hashlib
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List

from . import models, database
from .ai.vision_model import vision_model
from . import utils

# Initialize DB tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Honey Chain API", version="1.0.0")

# Security Hardening: CORS
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BLOCKCHAIN_MODE = os.getenv("BLOCKCHAIN_MODE", "demo")

# --- Pydantic Schemas ---
class TelemetryCreate(BaseModel):
    hive_id: int
    temperature: float
    humidity: float
    weight: float

class HiveCreate(BaseModel):
    owner_id: int
    cluster_id: int
    gps_lat: float
    gps_long: float

class BatchCreate(BaseModel):
    hive_id: int
    floral_source: str
    weight: float
    health_score: float = Field(..., ge=1, le=100)

class RevokeRequest(BaseModel):
    reason: str

# --- Routes ---
@app.get("/")
def read_root():
    return {"message": "Welcome to the Honey Chain API"}

@app.post("/hives/")
def create_hive(hive: HiveCreate, db: Session = Depends(database.get_db)):
    db_hive = models.Hive(**hive.model_dump())
    db.add(db_hive)
    db.commit()
    db.refresh(db_hive)
    return db_hive

@app.post("/telemetry/")
def create_telemetry(telemetry: TelemetryCreate, db: Session = Depends(database.get_db)):
    last_reading = db.query(models.Telemetry).filter(models.Telemetry.hive_id == telemetry.hive_id)\
                     .order_by(models.Telemetry.timestamp.desc()).first()
    
    weight_delta = 0.0
    if last_reading:
        weight_delta = telemetry.weight - last_reading.weight

    db_telemetry = models.Telemetry(**telemetry.model_dump())
    db.add(db_telemetry)
    db.commit()
    db.refresh(db_telemetry)
    
    harvest_ready = telemetry.weight > 30.0 and weight_delta > 0
    return {
        "telemetry": db_telemetry, 
        "weight_delta": weight_delta,
        "harvest_ready": harvest_ready
    }

MAX_FILE_SIZE = 5 * 1024 * 1024 # 5 MB

@app.post("/analyze-frame/")
async def analyze_hive_frame(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.jpg', '.jpeg', '.png')):
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG/PNG allowed.")
    
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Invalid MIME type.")

    image_bytes = await file.read()
    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")
    
    results = vision_model.analyze_image(image_bytes)
    return {
        "filename": file.filename,
        "results": results,
        "model_status": "prototype_inference"
    }

@app.post("/mint-batch/")
def mint_batch(batch: BatchCreate, db: Session = Depends(database.get_db)):
    # 1. Generate unique identifiers
    batch_uuid = str(uuid.uuid4())
    
    # Generate an incremental token_id (mock logic for demo: count of batches + 1)
    batch_count = db.query(models.Batch).count()
    token_id = str(batch_count + 1000)

    # 2. IPFS Metadata
    metadata = {
        "hive_id": batch.hive_id,
        "floral_source": batch.floral_source,
        "weight_kg": batch.weight,
        "ai_health_score": batch.health_score,
        "timestamp": datetime.utcnow().isoformat()
    }
    ipfs_uri = utils.upload_to_ipfs_mock(metadata)
    
    # 3. Blockchain Tx Hash Generation
    if BLOCKCHAIN_MODE == "sepolia":
        # In a real app, this would use web3.py to call the smart contract
        raise HTTPException(status_code=501, detail="Real Sepolia minting not fully implemented in API yet.")
    else:
        # Deterministic demo hash
        tx_hash = "0x" + hashlib.sha256(batch_uuid.encode()).hexdigest()

    # 4. Save to DB
    db_batch = models.Batch(
        batch_id=batch_uuid,
        hive_id=batch.hive_id,
        token_id=token_id,
        ipfs_cid=ipfs_uri,
        tx_hash=tx_hash,
        health_score=batch.health_score,
        blockchain_mode=BLOCKCHAIN_MODE
    )
    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)

    # 5. Generate QR Code
    qr_base64 = utils.generate_qr_code(batch_id=batch_uuid)
    verification_url = f"https://honeychain.app/consumer/{batch_uuid}"

    return {
        "batch_id": batch_uuid,
        "hive_id": batch.hive_id,
        "token_id": token_id,
        "ipfs_cid": ipfs_uri,
        "tx_hash": tx_hash,
        "blockchain_mode": BLOCKCHAIN_MODE,
        "health_score": batch.health_score,
        "verification_url": verification_url,
        "qr_code": qr_base64
    }

@app.get("/hives/")
def get_hives(db: Session = Depends(database.get_db)):
    return db.query(models.Hive).all()

@app.get("/batches/")
def list_batches(db: Session = Depends(database.get_db)):
    return db.query(models.Batch).order_by(models.Batch.created_at.desc()).all()

@app.get("/batches/{batch_id}")
def get_batch(batch_id: str, db: Session = Depends(database.get_db)):
    db_batch = db.query(models.Batch).filter(models.Batch.batch_id == batch_id).first()
    if not db_batch:
        raise HTTPException(status_code=404, detail="Batch Not Found")
    return db_batch

@app.post("/batches/{batch_id}/revoke")
def revoke_batch(batch_id: str, req: RevokeRequest, db: Session = Depends(database.get_db)):
    db_batch = db.query(models.Batch).filter(models.Batch.batch_id == batch_id).first()
    if not db_batch:
        raise HTTPException(status_code=404, detail="Batch Not Found")
    
    db_batch.is_revoked = True
    db_batch.revocation_reason = req.reason
    db.commit()
    db.refresh(db_batch)
    
    return db_batch

@app.get("/telemetry/{hive_id}")
def get_hive_telemetry(hive_id: int, db: Session = Depends(database.get_db), limit: int = 100):
    records = db.query(models.Telemetry).filter(models.Telemetry.hive_id == hive_id).order_by(models.Telemetry.timestamp.desc()).limit(limit).all()
    return records
