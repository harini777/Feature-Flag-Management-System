from sqlalchemy import Column, Integer, ForeignKey, String

from app.database.base import Base


class TargetingRule(Base):
    __tablename__ = "targeting_rules"

    id = Column(Integer, primary_key=True, index=True)

    flag_id = Column(
        Integer,
        ForeignKey("feature_flags.id"),
        nullable=False
    )

    attribute = Column(String(100), nullable=False)

    operator = Column(String(50), nullable=False)

    value = Column(String(255), nullable=False)