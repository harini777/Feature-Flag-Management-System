from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func

from app.database.base import Base


class UserGroupMembership(Base):
    __tablename__ = "user_group_memberships"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        String(100),
        nullable=False
    )

    group_name = Column(
        String(100),
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )