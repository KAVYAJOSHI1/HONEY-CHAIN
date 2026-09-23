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
    is_revoked = Column(Boolean, default=False)
    revocation_reason = Column(String, nullable=True)
    blockchain_mode = Column(String, default="demo")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    hive = relationship("Hive")
