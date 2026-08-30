import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.cache.redis_client import redis_client
from app.database.session import get_db
from app.models.audit_log import AuditLog
from app.models.environment import Environment
from app.models.flag import Flag
from app.models.targeting_rule import TargetingRule
from app.schemas.environments import EnvironmentCreate, EnvironmentUpdate
from app.schemas.feat_flag import FlagCreate, FlagUpdate
from app.schemas.evaluation import EvaluationRequest
from app.schemas.target import TargetingRuleCreate, TargetingRuleUpdate
from app.services.evaluation_engine import evaluate_flag

router = APIRouter(tags=["Feature Flags"])

notification_preferences = {
    "flag_changes": True
}


def serialize_environment(environment: Environment):
    return {
        "environment_id": environment.id,
        "id": environment.id,
        "name": environment.name,
        "description": environment.description
    }


def serialize_flag(flag: Flag):
    return {
        "flag_id": flag.id,
        "id": flag.id,
        "environment_id": flag.environment_id,
        "key": flag.key,
        "type": flag.type,
        "default_value": flag.default_value,
        "enabled": flag.enabled,
        "description": flag.description,
        "owner_team": flag.owner_team,
        "created_at": flag.created_at,
        "updated_at": flag.updated_at
    }


def serialize_targeting_rule(rule: TargetingRule):
    return {
        "rule_id": rule.id,
        "id": rule.id,
        "flag_id": rule.flag_id,
        "attribute": rule.attribute,
        "operator": rule.operator,
        "value": rule.value
    }


def serialize_audit_log(log: AuditLog):
    details = {}

    if log.details:
        try:
            details = json.loads(log.details)
        except json.JSONDecodeError:
            details = {"message": log.details}

    return {
        "audit_id": log.id,
        "id": log.id,
        "action": log.action,
        "actor": log.performed_by or "system",
        "flag_id": details.get("flag_id"),
        "environment_id": details.get("environment_id"),
        "previous_state": details.get("previous_state"),
        "new_state": details.get("new_state"),
        "timestamp": log.created_at
    }


def create_audit_log(
    db: Session,
    action: str,
    details: dict,
    performed_by: str = "system"
):
    audit_log = AuditLog(
        action=action,
        performed_by=performed_by,
        details=json.dumps(details, default=str)
    )

    db.add(audit_log)


def invalidate_flag_cache(environment_name: str | None, flag_key: str):
    if not environment_name:
        return

    cache_pattern = f"{environment_name}:{flag_key}:*"

    try:
        for cache_key in redis_client.scan_iter(cache_pattern):
            redis_client.delete(cache_key)
    except Exception:
        pass


@router.get("/flags")
def get_all_flags(db: Session = Depends(get_db)):
    return [
        serialize_flag(flag)
        for flag in db.query(Flag).all()
    ]


@router.get("/flags/{flag_id}")
def get_flag(flag_id: int, db: Session = Depends(get_db)):
    flag = (
        db.query(Flag)
        .filter(Flag.id == flag_id)
        .first()
    )

    if flag is None:
        return {
            "message": "Feature flag not found"
        }

    return serialize_flag(flag)


@router.post("/flags")
def create_flag(
    request: FlagCreate,
    db: Session = Depends(get_db)
):
    flag = Flag(
        environment_id=request.environment_id,
        key=request.key,
        type=request.type,
        default_value=request.default_value,
        enabled=request.enabled,
        description=request.description,
        owner_team=request.owner_team
    )

    db.add(flag)
    db.flush()

    create_audit_log(
        db=db,
        action="CREATE",
        details={
            "flag_id": flag.id,
            "environment_id": flag.environment_id,
            "new_state": serialize_flag(flag)
        }
    )

    db.commit()
    db.refresh(flag)

    return serialize_flag(flag)


@router.put("/flags/{flag_id}")
def update_flag(
    flag_id: int,
    request: FlagUpdate,
    db: Session = Depends(get_db)
):
    flag = (
        db.query(Flag)
        .filter(Flag.id == flag_id)
        .first()
    )

    if flag is None:
        return {
            "message": "Feature flag not found"
        }

    previous_state = serialize_flag(flag)
    previous_flag_key = flag.key
    environment = (
        db.query(Environment)
        .filter(Environment.id == flag.environment_id)
        .first()
    )

    update_data = request.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(flag, field, value)

    db.flush()

    create_audit_log(
        db=db,
        action="UPDATE",
        details={
            "flag_id": flag.id,
            "environment_id": flag.environment_id,
            "previous_state": previous_state,
            "new_state": serialize_flag(flag)
        }
    )

    db.commit()
    invalidate_flag_cache(
        environment.name if environment else None,
        previous_flag_key
    )
    invalidate_flag_cache(
        environment.name if environment else None,
        flag.key
    )
    db.refresh(flag)

    return serialize_flag(flag)


@router.delete("/flags/{flag_id}")
def delete_flag(
    flag_id: int,
    db: Session = Depends(get_db)
):
    flag = (
        db.query(Flag)
        .filter(Flag.id == flag_id)
        .first()
    )

    if flag is None:
        return {
            "message": "Feature flag not found"
        }

    previous_state = serialize_flag(flag)
    flag_key = flag.key
    environment = (
        db.query(Environment)
        .filter(Environment.id == flag.environment_id)
        .first()
    )

    create_audit_log(
        db=db,
        action="DELETE",
        details={
            "flag_id": flag.id,
            "environment_id": flag.environment_id,
            "previous_state": previous_state
        }
    )

    db.delete(flag)
    db.commit()
    invalidate_flag_cache(
        environment.name if environment else None,
        flag_key
    )

    return {
        "message": "Feature flag deleted successfully"
    }


@router.get("/targeting-rules")
def get_all_targeting_rules(db: Session = Depends(get_db)):
    return [
        serialize_targeting_rule(rule)
        for rule in db.query(TargetingRule).all()
    ]


@router.get("/targeting-rules/{rule_id}")
def get_targeting_rule(
    rule_id: int,
    db: Session = Depends(get_db)
):
    rule = (
        db.query(TargetingRule)
        .filter(TargetingRule.id == rule_id)
        .first()
    )

    if rule is None:
        return {
            "message": "Targeting Rule not found"
        }

    return serialize_targeting_rule(rule)


@router.post("/targeting-rules")
def create_targeting_rule(
    request: TargetingRuleCreate,
    db: Session = Depends(get_db)
):
    rule = TargetingRule(
        flag_id=request.flag_id,
        attribute=request.attribute,
        operator=request.operator,
        value=request.value
    )

    db.add(rule)
    db.flush()

    flag = (
        db.query(Flag)
        .filter(Flag.id == rule.flag_id)
        .first()
    )
    environment = None

    if flag:
        environment = (
            db.query(Environment)
            .filter(Environment.id == flag.environment_id)
            .first()
        )

    create_audit_log(
        db=db,
        action="TARGETING_RULE_CREATE",
        details={
            "flag_id": rule.flag_id,
            "environment_id": flag.environment_id if flag else None,
            "new_state": serialize_targeting_rule(rule)
        }
    )

    db.commit()
    invalidate_flag_cache(
        environment.name if environment else None,
        flag.key if flag else ""
    )
    db.refresh(rule)

    return serialize_targeting_rule(rule)


@router.put("/targeting-rules/{rule_id}")
def update_targeting_rule(
    rule_id: int,
    request: TargetingRuleUpdate,
    db: Session = Depends(get_db)
):
    rule = (
        db.query(TargetingRule)
        .filter(TargetingRule.id == rule_id)
        .first()
    )

    if rule is None:
        return {
            "message": "Targeting Rule not found"
        }

    previous_state = serialize_targeting_rule(rule)
    rule.attribute = request.attribute
    rule.operator = request.operator
    rule.value = request.value

    flag = (
        db.query(Flag)
        .filter(Flag.id == rule.flag_id)
        .first()
    )
    environment = None

    if flag:
        environment = (
            db.query(Environment)
            .filter(Environment.id == flag.environment_id)
            .first()
        )

    create_audit_log(
        db=db,
        action="TARGETING_RULE_UPDATE",
        details={
            "flag_id": rule.flag_id,
            "environment_id": flag.environment_id if flag else None,
            "previous_state": previous_state,
            "new_state": serialize_targeting_rule(rule)
        }
    )

    db.commit()
    invalidate_flag_cache(
        environment.name if environment else None,
        flag.key if flag else ""
    )
    db.refresh(rule)

    return serialize_targeting_rule(rule)


@router.delete("/targeting-rules/{rule_id}")
def delete_targeting_rule(
    rule_id: int,
    db: Session = Depends(get_db)
):
    rule = (
        db.query(TargetingRule)
        .filter(TargetingRule.id == rule_id)
        .first()
    )

    if rule is None:
        return {
            "message": "Targeting Rule not found"
        }

    previous_state = serialize_targeting_rule(rule)
    flag = (
        db.query(Flag)
        .filter(Flag.id == rule.flag_id)
        .first()
    )
    environment = None

    if flag:
        environment = (
            db.query(Environment)
            .filter(Environment.id == flag.environment_id)
            .first()
        )

    create_audit_log(
        db=db,
        action="TARGETING_RULE_DELETE",
        details={
            "flag_id": rule.flag_id,
            "environment_id": flag.environment_id if flag else None,
            "previous_state": previous_state
        }
    )

    db.delete(rule)
    db.commit()
    invalidate_flag_cache(
        environment.name if environment else None,
        flag.key if flag else ""
    )

    return {
        "message": "Targeting Rule deleted successfully"
    }


@router.get("/environments")
def get_all_environments(db: Session = Depends(get_db)):
    return [
        serialize_environment(environment)
        for environment in db.query(Environment).all()
    ]


@router.get("/environments/{environment_id}")
def get_environment(
    environment_id: int,
    db: Session = Depends(get_db)
):
    environment = (
        db.query(Environment)
        .filter(Environment.id == environment_id)
        .first()
    )

    if environment is None:
        return {
            "message": "Environment not found"
        }

    return serialize_environment(environment)


@router.post("/environments")
def create_environment(
    request: EnvironmentCreate,
    db: Session = Depends(get_db)
):
    environment = Environment(
        name=request.name,
        description=request.description
    )

    db.add(environment)
    db.commit()
    db.refresh(environment)

    return serialize_environment(environment)


@router.put("/environments/{environment_id}")
def update_environment(
    environment_id: int,
    request: EnvironmentUpdate,
    db: Session = Depends(get_db)
):
    environment = (
        db.query(Environment)
        .filter(Environment.id == environment_id)
        .first()
    )

    if environment is None:
        return {
            "message": "Environment not found"
        }

    environment.name = request.name
    environment.description = request.description

    db.commit()
    db.refresh(environment)

    return serialize_environment(environment)


@router.delete("/environments/{environment_id}")
def delete_environment(
    environment_id: int,
    db: Session = Depends(get_db)
):
    environment = (
        db.query(Environment)
        .filter(Environment.id == environment_id)
        .first()
    )

    if environment is None:
        return {
            "message": "Environment not found"
        }

    db.delete(environment)
    db.commit()

    return {
        "message": "Environment deleted successfully"
    }


@router.get("/audit-logs")
def get_audit_logs(db: Session = Depends(get_db)):
    return [
        serialize_audit_log(log)
        for log in (
            db.query(AuditLog)
            .order_by(AuditLog.created_at.desc())
            .all()
        )
    ]


@router.get("/evaluation-analytics")
def get_evaluation_analytics():
    return []


@router.post("/auth/register")
def register_user(request: dict):
    return {
        "message": "User registered successfully",
        "user": {
            "user_id": 1,
            "name": request.get("name", "User"),
            "email": request.get("email", "")
        }
    }


@router.post("/auth/login")
def login_user(request: dict):
    return {
        "access_token": "demo-token",
        "token_type": "bearer",
        "user": {
            "user_id": 1,
            "name": request.get("email", "User").split("@")[0] or "User",
            "email": request.get("email", "")
        }
    }


@router.put("/auth/change-password")
def change_password():
    return {
        "message": "Password changed successfully"
    }


@router.get("/notifications/preferences")
def get_notification_preferences():
    return notification_preferences


@router.put("/notifications/preferences")
def update_notification_preferences(request: dict):
    if "flag_changes" in request:
        notification_preferences["flag_changes"] = bool(
            request["flag_changes"]
        )

    return notification_preferences


@router.post("/evaluate")
def evaluate(
    request: EvaluationRequest,
    db: Session = Depends(get_db)
):
    return evaluate_flag(
        db=db,
        flag_key=request.flag_key,
        environment_name=request.environment_name,
        user_context=request.user_context
    )
