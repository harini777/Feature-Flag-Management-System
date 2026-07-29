from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from app.database.base import Base


class Flag(Base):
    __tablename__ = "feature_flags"

    id = Column(Integer, primary_key=True, index=True)
    environment_id = Column(
        Integer,
        ForeignKey("environments.id"),
        nullable=False
    )
    key = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False)
    default_value = Column(String(255))
    enabled = Column(Boolean, default=True)
    description = Column(String(255))
    owner_team = Column(String(100))