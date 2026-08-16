from pydantic import BaseModel


class TargetingRuleCreate(BaseModel):
    flag_id: int
    attribute: str
    operator: str
    value: str


class TargetingRuleUpdate(BaseModel):
    attribute: str
    operator: str
    value: str