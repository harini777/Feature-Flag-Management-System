"""
Unit tests for the flag evaluation engine.

Run with:
    PYTHONPATH=. ./venv/bin/pytest tests/ -v
"""
import pytest
from unittest.mock import MagicMock, patch

from app.services.evaluation_engine import evaluate_flag, _match_operator


# ---------------------------------------------------------------------------
# OPERATOR TESTS  (no DB needed)
# ---------------------------------------------------------------------------

class TestMatchOperator:
    def test_equals_symbol(self):
        assert _match_operator("India", "=", "India") is True

    def test_equals_symbol_mismatch(self):
        assert _match_operator("India", "=", "USA") is False

    def test_equals_alias(self):
        assert _match_operator("India", "equals", "India") is True

    def test_not_equals_symbol(self):
        assert _match_operator("India", "!=", "USA") is True

    def test_not_equals_alias(self):
        assert _match_operator("India", "not_equals", "USA") is True

    def test_contains(self):
        assert _match_operator("hello@example.com", "contains", "example") is True

    def test_starts_with(self):
        assert _match_operator("admin_user", "starts_with", "admin") is True

    def test_ends_with(self):
        assert _match_operator("user@corp.io", "ends_with", ".io") is True

    def test_in(self):
        assert _match_operator("beta", "in", "alpha,beta,gamma") is True

    def test_not_in(self):
        assert _match_operator("delta", "not_in", "alpha,beta,gamma") is True

    def test_unknown_operator_falls_back_to_equals(self):
        assert _match_operator("x", "UNKNOWN", "x") is True


# ---------------------------------------------------------------------------
# EVALUATION ENGINE TESTS  (mocked DB + Redis)
# ---------------------------------------------------------------------------

def _make_db_mock(
    environment_name="production",
    flag_key="dark_mode",
    flag_enabled=True,
    rules=None
):
    """
    Build a minimal SQLAlchemy Session mock that returns predictable objects.
    """
    from app.models.environment import Environment
    from app.models.flag import Flag
    from app.models.targeting_rule import TargetingRule
    from app.models.user_group_membership import UserGroupMembership

    env = MagicMock(spec=Environment)
    env.id = 1
    env.name = environment_name

    flag = MagicMock(spec=Flag)
    flag.id = 10
    flag.key = flag_key
    flag.type = "boolean"
    flag.enabled = flag_enabled
    flag.default_value = "true"
    flag.environment_id = 1

    if rules is None:
        rules = []

    db = MagicMock()

    # chain: db.query(X).filter(...).first()
    def query_side_effect(model):
        q = MagicMock()
        if model is Environment:
            q.filter.return_value.first.return_value = env
        elif model is Flag:
            q.filter.return_value.first.return_value = flag
        elif model is TargetingRule:
            q.filter.return_value.all.return_value = rules
            q.filter.return_value.first.return_value = (
                rules[0] if rules else None
            )
        elif model is UserGroupMembership:
            q.filter.return_value.all.return_value = []
        else:
            q.filter.return_value.all.return_value = []
            q.filter.return_value.first.return_value = None
        return q

    db.query.side_effect = query_side_effect
    return db


@patch("app.services.evaluation_engine._cache_get", return_value=None)
@patch("app.services.evaluation_engine._cache_set")
class TestEvaluationEngine:

    def test_environment_not_found(self, mock_set, mock_get):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None

        result = evaluate_flag(db, "dark_mode", "nonexistent")

        assert result["success"] is False
        assert "Environment not found" in result["message"]

    def test_flag_not_found(self, mock_set, mock_get):
        from app.models.environment import Environment
        from app.models.flag import Flag

        db = MagicMock()

        env = MagicMock(spec=Environment)
        env.id = 1
        env.name = "production"

        def query_side_effect(model):
            q = MagicMock()
            if model is Environment:
                q.filter.return_value.first.return_value = env
            elif model is Flag:
                q.filter.return_value.first.return_value = None
            return q

        db.query.side_effect = query_side_effect

        result = evaluate_flag(db, "missing_flag", "production")

        assert result["success"] is False
        assert "not found" in result["message"].lower()

    def test_disabled_flag_returns_false(self, mock_set, mock_get):
        db = _make_db_mock(flag_enabled=False)

        result = evaluate_flag(db, "dark_mode", "production")

        assert result["success"] is True
        assert result["enabled"] is False

    def test_enabled_flag_no_rules_returns_true(self, mock_set, mock_get):
        db = _make_db_mock(flag_enabled=True, rules=[])

        result = evaluate_flag(
            db, "dark_mode", "production",
            user_context={"user_id": 101}
        )

        assert result["success"] is True
        assert result["enabled"] is True

    def test_user_id_targeting_rule_match(self, mock_set, mock_get):
        from app.models.targeting_rule import TargetingRule

        rule = MagicMock(spec=TargetingRule)
        rule.attribute = "user_id"
        rule.operator = "="
        rule.value = "101"

        db = _make_db_mock(flag_enabled=True, rules=[rule])

        result = evaluate_flag(
            db, "dark_mode", "production",
            user_context={"user_id": 101}
        )

        assert result["success"] is True
        assert result["enabled"] is True
        assert "user_id" in result["message"]

    def test_user_id_targeting_rule_no_match(self, mock_set, mock_get):
        from app.models.targeting_rule import TargetingRule

        rule = MagicMock(spec=TargetingRule)
        rule.attribute = "user_id"
        rule.operator = "="
        rule.value = "999"

        db = _make_db_mock(flag_enabled=True, rules=[rule])

        result = evaluate_flag(
            db, "dark_mode", "production",
            user_context={"user_id": 101}
        )

        # No rule matched, but flag is enabled → default state (True)
        assert result["success"] is True
        assert result["enabled"] is True

    def test_group_targeting_from_context(self, mock_set, mock_get):
        from app.models.targeting_rule import TargetingRule

        rule = MagicMock(spec=TargetingRule)
        rule.attribute = "group_name"
        rule.operator = "="
        rule.value = "admin"

        db = _make_db_mock(flag_enabled=True, rules=[rule])

        result = evaluate_flag(
            db, "dark_mode", "production",
            user_context={"user_id": 101, "groups": ["admin"]}
        )

        assert result["success"] is True
        assert result["enabled"] is True
        assert "group" in result["message"].lower()

    def test_generic_attribute_targeting(self, mock_set, mock_get):
        from app.models.targeting_rule import TargetingRule

        rule = MagicMock(spec=TargetingRule)
        rule.attribute = "country"
        rule.operator = "="
        rule.value = "India"

        db = _make_db_mock(flag_enabled=True, rules=[rule])

        result = evaluate_flag(
            db, "dark_mode", "production",
            user_context={"user_id": 101, "country": "India"}
        )

        assert result["success"] is True
        assert result["enabled"] is True
        assert "country" in result["message"]

    def test_percentage_rollout_gating(self, mock_set, mock_get):
        from app.models.targeting_rule import TargetingRule

        rule = MagicMock(spec=TargetingRule)
        rule.attribute = "rollout_percentage"
        rule.operator = "="
        rule.value = "0"   # 0% → nobody in rollout

        db = _make_db_mock(flag_enabled=True, rules=[rule])

        result = evaluate_flag(
            db, "dark_mode", "production",
            user_context={"user_id": 42}
        )

        assert result["success"] is True
        assert result["enabled"] is False  # Not in the 0% rollout

    def test_percentage_rollout_full(self, mock_set, mock_get):
        from app.models.targeting_rule import TargetingRule

        rule = MagicMock(spec=TargetingRule)
        rule.attribute = "rollout_percentage"
        rule.operator = "="
        rule.value = "100"  # 100% → everyone in rollout

        db = _make_db_mock(flag_enabled=True, rules=[rule])

        result = evaluate_flag(
            db, "dark_mode", "production",
            user_context={"user_id": 42}
        )

        assert result["success"] is True
        assert result["enabled"] is True

    def test_cache_hit_returns_early(self, mock_set, mock_get):
        # Override mock_get to simulate a cache hit
        mock_get.return_value = "true"

        db = _make_db_mock(flag_enabled=True, rules=[])

        result = evaluate_flag(
            db, "dark_mode", "production",
            user_context={"user_id": 101}
        )

        assert result["success"] is True
        assert result["enabled"] is True
        assert "cache" in result["message"].lower()

    def test_empty_user_context(self, mock_set, mock_get):
        db = _make_db_mock(flag_enabled=True, rules=[])

        result = evaluate_flag(
            db, "dark_mode", "production",
            user_context=None
        )

        assert result["success"] is True
        assert result["enabled"] is True