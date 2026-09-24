import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

# Default SQLite file lives in backend/ regardless of the working directory.
_DEFAULT_SQLITE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "honeychain.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{_DEFAULT_SQLITE}")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def migrate():
    """Create missing tables, then add any model columns missing from existing tables.

    create_all() never alters existing tables, so databases created by older versions
    would otherwise fail on new columns. Added columns are nullable (defaults are applied
    by the ORM on insert), which keeps this safe for existing rows.
    """
    from . import models  # noqa: F401  (register all tables on Base.metadata)

    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if not inspector.has_table(table.name):
                continue
            existing = {c["name"] for c in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name not in existing:
                    ddl_type = column.type.compile(dialect=engine.dialect)
                    conn.execute(text(f'ALTER TABLE {table.name} ADD COLUMN "{column.name}" {ddl_type}'))
                    default = column.default.arg if column.default is not None and column.default.is_scalar else None
                    if default is not None:
                        conn.execute(text(f'UPDATE {table.name} SET "{column.name}" = :v WHERE "{column.name}" IS NULL'), {"v": default})


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
