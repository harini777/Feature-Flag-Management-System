from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func

from app.database.base import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)

    action = Column(
        String(100),
        nullable=False
    )

    performed_by = Column(
        String(100)
    )

    details = Column(Text)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )