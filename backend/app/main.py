from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from . import models, database
from .ai.vision_model import vision_model

# Initialize DB tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Honey Chain API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    # Algorithm: "Harvest Ready" trigger logic
    # Fetch the most recent reading for this hive to calculate weight delta
    last_reading = db.query(models.Telemetry).filter(models.Telemetry.hive_id == telemetry.hive_id)\
                     .order_by(models.Telemetry.timestamp.desc()).first()
    
    weight_delta = 0.0
    if last_reading:
        weight_delta = telemetry.weight - last_reading.weight

    db_telemetry = models.Telemetry(**telemetry.model_dump())
    db.add(db_telemetry)
    db.commit()
    db.refresh(db_telemetry)
    
    # Simple Harvest Ready heuristic: total weight exceeds 30kg and we've been gaining nectar
    harvest_ready = telemetry.weight > 30.0 and weight_delta > 0
    return {
        "telemetry": db_telemetry, 
        "weight_delta": weight_delta,
        "harvest_ready": harvest_ready
    }

@app.post("/analyze-frame/")
async def analyze_hive_frame(file: UploadFile = File(...)):
    """
    Accepts a hive frame image and runs the YOLO Computer Vision model
    to detect Varroa mites and calculate the colony health score.
    """
    if not file.filename.endswith(('.jpg', '.jpeg', '.png')):
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG/PNG allowed.")
        
    image_bytes = await file.read()
    
    # Run the mock YOLO model
    results = vision_model.analyze_image(image_bytes)
    
    return {
        "filename": file.filename,
        "results": results
    }

@app.get("/telemetry/{hive_id}")
def get_hive_telemetry(hive_id: int, db: Session = Depends(database.get_db), limit: int = 100):
    records = db.query(models.Telemetry).filter(models.Telemetry.hive_id == hive_id).order_by(models.Telemetry.timestamp.desc()).limit(limit).all()
    return records
