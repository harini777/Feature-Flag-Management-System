from sqlalchemy import Column, Integer, ForeignKey, String
from app.database.base import Base


class FlagVersion(Base):
    __tablename__ = "flag_versions"

    id = Column(Integer, primary_key=True)
    flag_id = Column(
        Integer,
        ForeignKey("feature_flags.id"),
        nullable=False
    )
    version = Column(Integer)
    changed_by = Column(String(100))