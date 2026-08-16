from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database.base import Base


class FlagVersion(Base):
    __tablename__ = "flag_versions"

    id = Column(Integer, primary_key=True, index=True)

    flag_id = Column(
        Integer,
        ForeignKey("feature_flags.id"),
        nullable=False
    )

    version = Column(
        Integer,
        nullable=False
    )

    old_value = Column(String(100))

    new_value = Column(String(100))

    changed_by = Column(
        String(100),
        nullable=False
    )

    changed_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )