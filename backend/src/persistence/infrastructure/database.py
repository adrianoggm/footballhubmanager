from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from persistence.domain.entity import Base
from persistence.persistence.config import initialize_config

config = initialize_config()

# Database URL
DATABASE_URL = f"{config.DB_PROVIDER}://{config.DB_USER}:{config.DB_PASSWORD}@{config.DB_HOST}:{config.DB_PORT}/{config.DB_NAME}"

engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()