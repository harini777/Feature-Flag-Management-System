from pydantic import BaseModel


class EnvironmentCreate(BaseModel):
    name: str
    description: str


class EnvironmentUpdate(BaseModel):
    name: str
    description: str