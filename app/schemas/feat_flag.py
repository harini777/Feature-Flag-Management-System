from pydantic import BaseModel


class FlagCreate(BaseModel):
    environment_id: int
    key: str
    type: str
    default_value: str | None = None
    enabled: bool = False
    description: str | None = None
    owner_team: str | None = None


class FlagUpdate(BaseModel):
    key: str | None = None
    type: str | None = None
    default_value: str | None = None
    enabled: bool | None = None
    description: str | None = None
    owner_team: str | None = None