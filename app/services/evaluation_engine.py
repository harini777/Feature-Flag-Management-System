from sqlalchemy.orm import Session

from app.models.environment import Environment
from app.models.flag import Flag
from app.models.targeting_rule import TargetingRule
from app.models.user_group_membership import UserGroupMembership

from app.cache.redis_client import redis_client
from app.services.rollout_service import is_user_in_rollout


# ---------------------------------------------------------------------------
# CACHE HELPERS
# ---------------------------------------------------------------------------

def _cache_get(cache_key: str):
    try:
        return redis_client.get(cache_key)
    except Exception:
        return None


def _cache_set(cache_key: str, value: str, ttl: int = 60):
    """Cache with a 60-second TTL so stale data is not served indefinitely."""
    try:
        redis_client.set(cache_key, value, ex=ttl)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# OPERATOR EVALUATION
# ---------------------------------------------------------------------------

def _match_operator(
    attribute_value: str,
    operator: str,
    rule_value: str
) -> bool:
    """
    Evaluate a single targeting-rule condition.

    Supported operators (stored in DB by the backend):
        =  / equals          – exact match
        != / not_equals      – not equal
        contains             – substring
        starts_with          – prefix
        ends_with            – suffix
        in                   – comma-separated whitelist
        not_in               – comma-separated blacklist
    """
    op = operator.strip().lower()

    # Normalise aliases produced by the frontend
    if op == "equals":
        op = "="
    elif op == "not_equals":
        op = "!="

    if op in ("=", "=="):
        return attribute_value == rule_value
    elif op == "!=":
        return attribute_value != rule_value
    elif op == "contains":
        return rule_value in attribute_value
    elif op == "starts_with":
        return attribute_value.startswith(rule_value)
    elif op == "ends_with":
        return attribute_value.endswith(rule_value)
    elif op == "in":
        return attribute_value in [v.strip() for v in rule_value.split(",")]
    elif op == "not_in":
        return attribute_value not in [v.strip() for v in rule_value.split(",")]
    else:
        # Unknown operator – default to exact match
        return attribute_value == rule_value


# ---------------------------------------------------------------------------
# MAIN EVALUATION FUNCTION
# ---------------------------------------------------------------------------

def evaluate_flag(
    db: Session,
    flag_key: str,
    environment_name: str,
    user_context: dict | None = None
):
    # ------------------------------------------------------------------
    # 1. Resolve environment
    # ------------------------------------------------------------------
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

    # ------------------------------------------------------------------
    # 2. Resolve flag
    # ------------------------------------------------------------------
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

    # ------------------------------------------------------------------
    # 3. If the flag is globally disabled, short-circuit immediately.
    #    No targeting rule can override a disabled flag.
    # ------------------------------------------------------------------
    if not flag.enabled:
        return {
            "success": True,
            "message": "Flag is disabled",
            "environment": environment.name,
            "flag": flag.key,
            "type": flag.type,
            "enabled": False,
            "value": flag.default_value,
            "user_context": user_context
        }

    # ------------------------------------------------------------------
    # 4. Build cache key
    # ------------------------------------------------------------------
    user_id = (
        str(user_context.get("user_id"))
        if user_context and user_context.get("user_id") is not None
        else "anonymous"
    )

    cache_key = f"{environment.name}:{flag.key}:{user_id}"

    # ------------------------------------------------------------------
    # 5. Redis cache check
    # ------------------------------------------------------------------
    cached_value = _cache_get(cache_key)

    if cached_value is not None:
        enabled_from_cache = cached_value == "true"
        return {
            "success": True,
            "message": "Returned from redis cache",
            "environment": environment.name,
            "flag": flag.key,
            "type": flag.type,
            "enabled": enabled_from_cache,
            "value": flag.default_value,
            "user_context": user_context
        }

    # ------------------------------------------------------------------
    # 6. Load all targeting rules for this flag
    # ------------------------------------------------------------------
    all_rules = (
        db.query(TargetingRule)
        .filter(TargetingRule.flag_id == flag.id)
        .all()
    )

    # ------------------------------------------------------------------
    # 7. Percentage-rollout rule (evaluated first so it can gate access
    #    even when the flag is globally enabled)
    # ------------------------------------------------------------------
    rollout_rule = next(
        (r for r in all_rules if r.attribute == "rollout_percentage"),
        None
    )

    if rollout_rule:
        rollout_percentage = int(rollout_rule.value)

        if user_context and user_context.get("user_id") is not None:
            in_rollout = is_user_in_rollout(
                user_id=str(user_context["user_id"]),
                flag_key=flag.key,
                rollout_percentage=rollout_percentage
            )
        else:
            # No user_id → deny deterministically
            in_rollout = False

        result_enabled = in_rollout
        _cache_set(cache_key, "true" if result_enabled else "false")

        return {
            "success": True,
            "message": (
                "Matched percentage rollout"
                if in_rollout
                else "User not in rollout percentage"
            ),
            "environment": environment.name,
            "flag": flag.key,
            "type": flag.type,
            "enabled": result_enabled,
            "value": flag.default_value,
            "user_context": user_context
        }

    # ------------------------------------------------------------------
    # 8. User-ID targeting rule  (attribute == "user_id")
    # ------------------------------------------------------------------
    if user_context and user_context.get("user_id") is not None:
        uid = str(user_context["user_id"])

        for rule in all_rules:
            if rule.attribute == "user_id":
                if _match_operator(uid, rule.operator, rule.value):
                    _cache_set(cache_key, "true")
                    return {
                        "success": True,
                        "message": "Flag is enabled for this user (user_id rule)",
                        "environment": environment.name,
                        "flag": flag.key,
                        "type": flag.type,
                        "enabled": True,
                        "value": flag.default_value,
                        "user_context": user_context
                    }

    # ------------------------------------------------------------------
    # 9. Group targeting
    #    • Check groups passed directly in user_context["groups"]
    #    • Also fall back to UserGroupMembership table
    # ------------------------------------------------------------------
    if user_context:
        uid = str(user_context.get("user_id", ""))

        # Collect candidate group names
        candidate_groups = set()

        # Groups provided directly in the request context
        context_groups = user_context.get("groups", [])
        if isinstance(context_groups, list):
            candidate_groups.update(str(g) for g in context_groups)

        # Groups from the UserGroupMembership table
        if uid:
            db_memberships = (
                db.query(UserGroupMembership)
                .filter(UserGroupMembership.user_id == uid)
                .all()
            )
            for m in db_memberships:
                candidate_groups.add(m.group_name)

        # Evaluate group rules against candidate groups
        for group_name in candidate_groups:
            for rule in all_rules:
                if rule.attribute == "group_name":
                    if _match_operator(group_name, rule.operator, rule.value):
                        _cache_set(cache_key, "true")
                        return {
                            "success": True,
                            "message": f"Matched group targeting rule (group: {group_name})",
                            "environment": environment.name,
                            "flag": flag.key,
                            "type": flag.type,
                            "enabled": True,
                            "value": flag.default_value,
                            "user_context": user_context
                        }

    # ------------------------------------------------------------------
    # 10. Generic user-attribute targeting
    #     Evaluate any remaining rules against arbitrary user_context keys
    # ------------------------------------------------------------------
    if user_context:
        non_system_attributes = {
            "user_id", "groups", "group_name", "rollout_percentage"
        }
        generic_rules = [
            r for r in all_rules
            if r.attribute not in non_system_attributes
        ]

        for rule in generic_rules:
            ctx_value = user_context.get(rule.attribute)
            if ctx_value is not None:
                if _match_operator(str(ctx_value), rule.operator, rule.value):
                    _cache_set(cache_key, "true")
                    return {
                        "success": True,
                        "message": f"Matched attribute rule ({rule.attribute} {rule.operator} {rule.value})",
                        "environment": environment.name,
                        "flag": flag.key,
                        "type": flag.type,
                        "enabled": True,
                        "value": flag.default_value,
                        "user_context": user_context
                    }

    # ------------------------------------------------------------------
    # 11. Default flag state (flag.enabled is True – reached here meaning
    #     no targeting rule restricted access; serve the flag as enabled)
    # ------------------------------------------------------------------
    _cache_set(cache_key, "true")

    return {
        "success": True,
        "message": "Flag enabled (default state)",
        "environment": environment.name,
        "flag": flag.key,
        "type": flag.type,
        "enabled": flag.enabled,
        "value": flag.default_value,
        "user_context": user_context
    }
