from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    wallet_address = Column(String, unique=True, index=True)
    role = Column(String, default="BEEKEEPER")  # BEEKEEPER, ADMIN, KVIC
    name = Column(String)
    
    hives = relationship("Hive", back_populates="owner")

class Cluster(Base):
    __tablename__ = "clusters"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    region = Column(String)
    
    hives = relationship("Hive", back_populates="cluster")

class Hive(Base):
    __tablename__ = "hives"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    cluster_id = Column(Integer, ForeignKey("clusters.id"))
    gps_lat = Column(Float)
    gps_long = Column(Float)
    installed_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="ACTIVE")
    
    owner = relationship("User", back_populates="hives")
    cluster = relationship("Cluster", back_populates="hives")
    telemetry = relationship("Telemetry", back_populates="hive")

class Telemetry(Base):
    __tablename__ = "telemetry"
    
    id = Column(Integer, primary_key=True, index=True)
    hive_id = Column(Integer, ForeignKey("hives.id"))
    temperature = Column(Float)
    humidity = Column(Float)
    weight = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    hive = relationship("Hive", back_populates="telemetry")

class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String, unique=True, index=True)
    hive_id = Column(Integer, ForeignKey("hives.id"))
    token_id = Column(String)
    ipfs_cid = Column(String)
    tx_hash = Column(String)
    health_score = Column(Float)
    floral_source = Column(String, default="Wildflower Honey")
    weight_kg = Column(Float, default=32.5)
    tampered_health_score = Column(Float, nullable=True)
    is_revoked = Column(Boolean, default=False)
    revocation_reason = Column(String, nullable=True)
    blockchain_mode = Column(String, default="demo")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    hive = relationship("Hive")

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    hive_id = Column(Integer, ForeignKey("hives.id"), index=True)
    type = Column(String, default="ANOMALY", index=True) # TEMPERATURE, HUMIDITY, WEIGHT, DISEASE, VARROA, DEVICE_OFFLINE, HARVEST_READY, ANOMALY, BLOCKCHAIN, SECURITY
    severity = Column(String, index=True) # INFO, WARNING, CRITICAL, SUCCESS
    reason = Column(String)
    message = Column(String, nullable=True)
    source = Column(String, default="SYSTEM") # IoT, AI, RuleEngine, Security, Blockchain
    current_value = Column(Float, nullable=True)
    acknowledged = Column(Boolean, default=False, index=True)
    resolved = Column(Boolean, default=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    hive = relationship("Hive")

class AIAnalysis(Base):
    __tablename__ = "ai_analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    hive_id = Column(Integer, ForeignKey("hives.id"), index=True)
    health_score = Column(Float)
    infection_rate = Column(Float)
    varroa_count = Column(Integer)
    healthy_bee_count = Column(Integer)
    image_ref = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    hive = relationship("Hive")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    message = Column(String)
    is_read = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, index=True)
    actor = Column(String, default="Beekeeper")
    details = Column(String)
    blockchain_tx = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

class SecurityEvent(Base):
    __tablename__ = "security_events"
    
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, index=True)
    severity = Column(String, index=True) # LOW, MEDIUM, HIGH, CRITICAL
    description = Column(String)
    actor = Column(String, default="System")
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

