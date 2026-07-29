from sqlalchemy import Column, Integer, String
from app.database.base import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True)
    action = Column(String(100))
    performed_by = Column(String(100))
    details = Column(String(255))