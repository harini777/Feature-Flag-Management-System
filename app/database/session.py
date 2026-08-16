from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.config import DATABASE_URL

# Create engine
engine = create_engine(DATABASE_URL, echo=False)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()