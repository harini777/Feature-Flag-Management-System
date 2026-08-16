from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.sql import func

from app.database.base import Base


class Flag(Base):
    __tablename__ = "feature_flags"

    id = Column(Integer, primary_key=True, index=True)

    environment_id = Column(
        Integer,
        ForeignKey("environments.id"),
        nullable=False,
        index=True
    )

    key = Column(
        String(100),
        nullable=False,
        index=True
    )

    type = Column(String(20), nullable=False)

    default_value = Column(String(255))

    enabled = Column(Boolean, default=False)

    description = Column(Text)

    owner_team = Column(String(100))

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )