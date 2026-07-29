from sqlalchemy import Column, Integer, String
from app.database.base import Base


class UserGroupMembership(Base):
    __tablename__ = "user_group_memberships"

    id = Column(Integer, primary_key=True)
    user_id = Column(String(100))
    group_name = Column(String(100))