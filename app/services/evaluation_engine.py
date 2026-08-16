from sqlalchemy.orm import Session

from app.models.environment import Environment
from app.models.flag import Flag
from app.models.targeting_rule import TargetingRule
from app.models.user_group_membership import UserGroupMembership

from app.cache.redis_client import redis_client
from app.services.rollout_service import is_user_in_rollout


def evaluate_flag(
    db: Session,
    flag_key: str,
    environment_name: str,
    user_context: dict | None = None
):
    # Find the environment
    environment = (
        db.query(Environment)
        .filter(Environment.name == environment_name)
        .first()
    )

    if environment is None:
        return {
            "success": False,
            "message": "Environment not found"
        }

    # Find the flag in that environment
    flag = (
        db.query(Flag)
        .filter(
            Flag.key == flag_key,
            Flag.environment_id == environment.id
        )
        .first()
    )

    if flag is None:
        return {
            "success": False,
            "message": "Feature flag not found"
        }

    # Create Redis cache key
    user_id = (
        str(user_context.get("user_id"))
        if user_context and user_context.get("user_id") is not None
        else "default"
    )

    cache_key = f"{environment.name}:{flag.key}:{user_id}"

    # Check Redis cache
    cached_value = redis_client.get(cache_key)

    if cached_value is not None:
        return {
            "success": True,
            "message": "Returned from redis cache",
            "environment": environment.name,
            "flag": flag.key,
            "type": flag.type,
            "enabled": cached_value == "true",
            "value": flag.default_value,
            "user_context": user_context
        }

    # User ID targeting
    if user_context and user_context.get("user_id") is not None:
        user_id = str(user_context.get("user_id"))

        rule = (
            db.query(TargetingRule)
            .filter(
                TargetingRule.flag_id == flag.id,
                TargetingRule.attribute == "user_id",
                TargetingRule.operator == "=",
                TargetingRule.value == user_id
            )
            .first()
        )

        if rule:
            redis_client.set(cache_key, "true")

            return {
                "success": True,
                "message": "Flag is enabled for this user",
                "environment": environment.name,
                "flag": flag.key,
                "type": flag.type,
                "enabled": True,
                "value": flag.default_value,
                "user_context": user_context
            }

    # Group targeting
    if user_context and user_context.get("user_id") is not None:
        user_id = str(user_context.get("user_id"))

        group_membership = (
            db.query(UserGroupMembership)
            .filter(
                UserGroupMembership.user_id == user_id
            )
            .first()
        )

        if group_membership:
            rule = (
                db.query(TargetingRule)
                .filter(
                    TargetingRule.flag_id == flag.id,
                    TargetingRule.attribute == "group_name",
                    TargetingRule.operator == "=",
                    TargetingRule.value == group_membership.group_name
                )
                .first()
            )

            if rule:
                redis_client.set(cache_key, "true")

                return {
                    "success": True,
                    "message": "Matched group targeting rule",
                    "environment": environment.name,
                    "flag": flag.key,
                    "type": flag.type,
                    "enabled": True,
                    "value": flag.default_value,
                    "user_context": user_context
                }

    # Percentage rollout
    if user_context and user_context.get("user_id") is not None:
        user_id = str(user_context.get("user_id"))

        rollout_rule = (
            db.query(TargetingRule)
            .filter(
                TargetingRule.flag_id == flag.id,
                TargetingRule.attribute == "rollout_percentage"
            )
            .first()
        )

        if rollout_rule:
            rollout_percentage = int(rollout_rule.value)

            if is_user_in_rollout(
                user_id=user_id,
                flag_key=flag.key,
                rollout_percentage=rollout_percentage
            ):
                redis_client.set(cache_key, "true")

                return {
                    "success": True,
                    "message": "Matched percentage rollout",
                    "environment": environment.name,
                    "flag": flag.key,
                    "type": flag.type,
                    "enabled": True,
                    "value": flag.default_value,
                    "user_context": user_context
                }

    # Return default flag state
    redis_client.set(
        cache_key,
        str(flag.enabled).lower()
    )

    return {
        "success": True,
        "environment": environment.name,
        "flag": flag.key,
        "type": flag.type,
        "enabled": flag.enabled,
        "value": flag.default_value,
        "user_context": user_context
    }