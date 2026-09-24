"""Reset the database and load the demo dataset.

Usage (from backend/):  python seed_demo.py
Uses DATABASE_URL if set, otherwise backend/honeychain.db.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.seed import reset_db, seed_data

if __name__ == "__main__":
    print("Resetting database...")
    reset_db()
    print("Seeding demo data...")
    seed_data()
    print("Demo data seeded.")
