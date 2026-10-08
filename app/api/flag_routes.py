import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.cache.redis_client import redis_client
from app.database.session import get_db
from app.models.audit_log import AuditLog
from app.models.environment import Environment
from app.models.flag import Flag
from app.models.flag_version import FlagVersion
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


# ---------------------------------------------------------------------------
# SERIALIZERS
# ---------------------------------------------------------------------------

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


def serialize_flag_version(v: FlagVersion):
    return {
        "version_id": v.id,
        "flag_id": v.flag_id,
        "version": v.version,
        "old_value": v.old_value,
        "new_value": v.new_value,
        "changed_by": v.changed_by,
        "changed_at": v.changed_at
    }


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

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


def _get_flag_version_number(db: Session, flag_id: int) -> int:
    """Return the next version number for a flag."""
    latest = (
        db.query(FlagVersion)
        .filter(FlagVersion.flag_id == flag_id)
        .order_by(FlagVersion.version.desc())
        .first()
    )
    return (latest.version + 1) if latest else 1


def _record_flag_version(
    db: Session,
    flag_id: int,
    old_value: str | None,
    new_value: str | None,
    changed_by: str = "system"
):
    version_number = _get_flag_version_number(db, flag_id)
    flag_version = FlagVersion(
        flag_id=flag_id,
        version=version_number,
        old_value=old_value,
        new_value=new_value,
        changed_by=changed_by
    )
    db.add(flag_version)


# ---------------------------------------------------------------------------
# ANALYTICS HELPERS
# ---------------------------------------------------------------------------

def _analytics_key(flag_key: str) -> str:
    """Redis key for hourly evaluation analytics."""
    now = datetime.now(tz=timezone.utc)
    return f"eval_analytics:{flag_key}:{now.strftime('%Y-%m-%d')}:{now.hour}"


def _increment_evaluation_count(flag_key: str):
    """Increment the Redis counter for this flag/hour."""
    try:
        key = _analytics_key(flag_key)
        redis_client.incr(key)
        # Keep analytics for 7 days
        redis_client.expire(key, 7 * 24 * 3600)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# FLAG ROUTES
# ---------------------------------------------------------------------------

@router.get("/flags")
def get_all_flags(db: Session = Depends(get_db)):
    return [serialize_flag(flag) for flag in db.query(Flag).all()]


@router.get("/flags/{flag_id}")
def get_flag(flag_id: int, db: Session = Depends(get_db)):
    flag = db.query(Flag).filter(Flag.id == flag_id).first()

    if flag is None:
        raise HTTPException(status_code=404, detail="Feature flag not found")

    return serialize_flag(flag)


@router.post("/flags", status_code=201)
def create_flag(
    request: FlagCreate,
    db: Session = Depends(get_db)
):
    # Validate environment exists
    environment = (
        db.query(Environment)
        .filter(Environment.id == request.environment_id)
        .first()
    )
    if environment is None:
        raise HTTPException(status_code=404, detail="Environment not found")

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
    flag = db.query(Flag).filter(Flag.id == flag_id).first()

    if flag is None:
        raise HTTPException(status_code=404, detail="Feature flag not found")

    previous_state = serialize_flag(flag)
    previous_flag_key = flag.key
    old_enabled_value = str(flag.enabled).lower()

    environment = (
        db.query(Environment)
        .filter(Environment.id == flag.environment_id)
        .first()
    )

    update_data = request.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(flag, field, value)

    db.flush()

    new_enabled_value = str(flag.enabled).lower()

    # Record version if enabled state or default_value changed
    if old_enabled_value != new_enabled_value or "default_value" in update_data:
        _record_flag_version(
            db=db,
            flag_id=flag.id,
            old_value=old_enabled_value,
            new_value=new_enabled_value,
            changed_by="system"
        )

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

    # Invalidate cache for old key and new key (in case key was renamed)
    invalidate_flag_cache(
        environment.name if environment else None,
        previous_flag_key
    )
    if flag.key != previous_flag_key:
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
    flag = db.query(Flag).filter(Flag.id == flag_id).first()

    if flag is None:
        raise HTTPException(status_code=404, detail="Feature flag not found")

    previous_state = serialize_flag(flag)
    flag_key = flag.key

    environment = (
        db.query(Environment)
        .filter(Environment.id == flag.environment_id)
        .first()
    )

    # Delete associated targeting rules and flag versions first to avoid FK errors
    db.query(TargetingRule).filter(TargetingRule.flag_id == flag_id).delete()
    db.query(FlagVersion).filter(FlagVersion.flag_id == flag_id).delete()

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

    return {"message": "Feature flag deleted successfully"}


@router.get("/flags/{flag_id}/versions")
def get_flag_versions(flag_id: int, db: Session = Depends(get_db)):
    flag = db.query(Flag).filter(Flag.id == flag_id).first()

    if flag is None:
        raise HTTPException(status_code=404, detail="Feature flag not found")

    versions = (
        db.query(FlagVersion)
        .filter(FlagVersion.flag_id == flag_id)
        .order_by(FlagVersion.version.desc())
        .all()
    )

    return [serialize_flag_version(v) for v in versions]


# ---------------------------------------------------------------------------
# TARGETING RULE ROUTES
# ---------------------------------------------------------------------------

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
        raise HTTPException(status_code=404, detail="Targeting rule not found")

    return serialize_targeting_rule(rule)


@router.post("/targeting-rules", status_code=201)
def create_targeting_rule(
    request: TargetingRuleCreate,
    db: Session = Depends(get_db)
):
    # Validate flag exists
    flag = db.query(Flag).filter(Flag.id == request.flag_id).first()
    if flag is None:
        raise HTTPException(status_code=404, detail="Feature flag not found")

    # Normalise operator so backend stores canonical form
    operator = request.operator.strip()
    if operator.lower() == "equals":
        operator = "="
    elif operator.lower() == "not_equals":
        operator = "!="

    rule = TargetingRule(
        flag_id=request.flag_id,
        attribute=request.attribute,
        operator=operator,
        value=request.value
    )

    db.add(rule)
    db.flush()

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
        flag.key
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
        raise HTTPException(status_code=404, detail="Targeting rule not found")

    previous_state = serialize_targeting_rule(rule)

    # Normalise operator
    operator = request.operator.strip()
    if operator.lower() == "equals":
        operator = "="
    elif operator.lower() == "not_equals":
        operator = "!="

    rule.attribute = request.attribute
    rule.operator = operator
    rule.value = request.value

    flag = db.query(Flag).filter(Flag.id == rule.flag_id).first()
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
        raise HTTPException(status_code=404, detail="Targeting rule not found")

    previous_state = serialize_targeting_rule(rule)
    flag = db.query(Flag).filter(Flag.id == rule.flag_id).first()
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

    return {"message": "Targeting rule deleted successfully"}


# ---------------------------------------------------------------------------
# ENVIRONMENT ROUTES
# ---------------------------------------------------------------------------

@router.get("/environments")
def get_all_environments(db: Session = Depends(get_db)):
    return [
        serialize_environment(e)
        for e in db.query(Environment).all()
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
        raise HTTPException(status_code=404, detail="Environment not found")

    return serialize_environment(environment)


@router.post("/environments", status_code=201)
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
        raise HTTPException(status_code=404, detail="Environment not found")

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
        raise HTTPException(status_code=404, detail="Environment not found")

    # Delete all flags (and their targeting rules + versions) in this environment
    flags = db.query(Flag).filter(Flag.environment_id == environment_id).all()
    for flag in flags:
        db.query(TargetingRule).filter(TargetingRule.flag_id == flag.id).delete()
        db.query(FlagVersion).filter(FlagVersion.flag_id == flag.id).delete()
        db.delete(flag)

    db.delete(environment)
    db.commit()

    return {"message": "Environment deleted successfully"}


# ---------------------------------------------------------------------------
# AUDIT LOG ROUTES
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# EVALUATION ANALYTICS
# ---------------------------------------------------------------------------

@router.get("/evaluation-analytics")
def get_evaluation_analytics(db: Session = Depends(get_db)):
    """
    Read evaluation counts from Redis (tracked per flag per hour).
    Returns records in the shape the frontend expects:
      { flag_key, flag_id, evaluation_hour, evaluation_count, evaluation_date }
    """
    today = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")
    records = []

    try:
        # Scan all analytics keys for today
        pattern = f"eval_analytics:*:{today}:*"
        for key in redis_client.scan_iter(pattern):
            # key format: eval_analytics:<flag_key>:<date>:<hour>
            parts = key.split(":")
            if len(parts) < 4:
                continue

            flag_key = parts[1]
            eval_date = parts[2]
            eval_hour = int(parts[3])
            count = int(redis_client.get(key) or 0)

            # Look up flag_id for this flag_key
            flag = db.query(Flag).filter(Flag.key == flag_key).first()
            flag_id = flag.id if flag else None

            records.append({
                "flag_key": flag_key,
                "flag_id": flag_id,
                "evaluation_hour": eval_hour,
                "evaluation_count": count,
                "evaluation_date": eval_date
            })
    except Exception:
        # Redis unavailable – return empty list rather than crashing
        pass

    return records


# ---------------------------------------------------------------------------
# AUTH ROUTES (demo / stub)
# ---------------------------------------------------------------------------

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
    return {"message": "Password changed successfully"}


# ---------------------------------------------------------------------------
# NOTIFICATION PREFERENCE ROUTES
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# EVALUATION ENDPOINT
# ---------------------------------------------------------------------------

@router.post("/evaluate")
def evaluate(
    request: EvaluationRequest,
    db: Session = Depends(get_db)
):
    result = evaluate_flag(
        db=db,
        flag_key=request.flag_key,
        environment_name=request.environment_name,
        user_context=request.user_context
    )

    # Track evaluation count in Redis when a real flag was evaluated
    if result.get("success"):
        _increment_evaluation_count(request.flag_key)

    return result
