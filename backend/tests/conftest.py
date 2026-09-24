"""Shared test fixtures and helpers for Honey Chain tests."""
import os

# Must be set before importing app modules
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_honeychain.db")
os.environ.setdefault("BLOCKCHAIN_MODE", "demo")

from app.auth import create_access_token
from app.models import User


def get_auth_header(role: str = "BEEKEEPER", user_id: int = 1, name: str = "Test User") -> dict:
    """Generate a Bearer token header for the given role."""
    token = create_access_token(data={"sub": str(user_id), "role": role, "name": name})
    return {"Authorization": f"Bearer {token}"}


def beekeeper_headers() -> dict:
    """Auth headers for a BEEKEEPER user."""
    return get_auth_header(role="BEEKEEPER", user_id=1, name="Ramesh Kumar")


def kvic_headers() -> dict:
    """Auth headers for a KVIC_ADMIN user."""
    return get_auth_header(role="KVIC_ADMIN", user_id=2, name="KVIC Admin")


def admin_headers() -> dict:
    """Auth headers for an ADMIN user."""
    return get_auth_header(role="ADMIN", user_id=2, name="Admin User")


def seed_test_users(db):
    """Seed minimal users for test authentication."""
    if not db.query(User).filter(User.id == 1).first():
        db.add(User(id=1, wallet_address="0xTestBeekeeper", role="BEEKEEPER", name="Ramesh Kumar"))
    if not db.query(User).filter(User.id == 2).first():
        db.add(User(id=2, wallet_address="0xTestKVIC", role="KVIC_ADMIN", name="KVIC Admin"))
    db.commit()
