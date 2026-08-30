import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import AddTargetingRuleModel from "../components/AddTargetingRuleModel";
import EditTargetingRuleModal from "../components/EditTargetingRuleModal";
import TargetingRuleDetailsModal from "../components/TargetingRuleDetailsModal";
import "./Targeting.css";

function Targeting() {
  // Store all targeting rules
  const [rules, setRules] = useState([]);

  // Store all feature flags
  const [flags, setFlags] = useState([]);

  // Loading state
  const [loading, setLoading] = useState(true);

  // Error message
  const [error, setError] = useState("");

  // Add rule modal
  const [showAddRuleModal, setShowAddRuleModal] =
    useState(false);

  // Selected rule for View
  const [selectedRule, setSelectedRule] = useState(null);

  // Selected rule for Edit
  const [editingRule, setEditingRule] = useState(null);

  /*
   * Load rules and flags
   *
   * We keep this in a separate function so that
   * we can call it again after creating a rule.
   */
  const loadTargetingData = async () => {
    try {
      setError("");

      const [rulesResponse, flagsResponse] =
        await Promise.all([
          api.get("/targeting-rules"),
          api.get("/flags"),
        ]);

      /*
       * Make sure we only store arrays.
       */
      const fetchedRules = Array.isArray(
        rulesResponse.data
      )
        ? rulesResponse.data
        : [];

      const fetchedFlags = Array.isArray(
        flagsResponse.data
      )
        ? flagsResponse.data
        : [];

      setRules(fetchedRules);
      setFlags(fetchedFlags);

    } catch (error) {
      console.error(
        "Failed to load targeting data:",
        error
      );

      setError(
        "Failed to load targeting rules."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Load data when page opens
   */
  useEffect(() => {
    loadTargetingData();
  }, []);

  /*
   * Find feature flag name using flag_id
   */
  const getFlagName = (flagId) => {
    const flag = flags.find(
      (item) =>
        Number(item.flag_id) === Number(flagId)
    );

    return flag
      ? flag.key
      : "Unknown Flag";
  };

  /*
   * Delete targeting rule
   */
  const handleDelete = async (ruleId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this targeting rule?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(
        `/targeting-rules/${ruleId}`
      );

      /*
       * Remove the rule from UI.
       */
      setRules((previousRules) =>
        previousRules.filter(
          (rule) =>
            Number(rule.rule_id) !== Number(ruleId)
        )
      );

    } catch (error) {
      console.error(
        "Failed to delete targeting rule:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to delete targeting rule."
      );
    }
  };

  /*
   * Show loading
   */
  if (loading) {
    return (
      <div className="targeting-message">
        <div className="loader"></div>

        <p>
          Loading targeting rules...
        </p>
      </div>
    );
  }

  /*
   * Show error
   */
  if (error) {
    return (
      <div className="targeting-message error-message">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="targeting-page">

      {/* ================= HEADER ================= */}

      <header className="targeting-header">

        <div>
          <h1>
            Targeting Rules
          </h1>

          <p>
            Control feature flag behavior for
            specific users and conditions.
          </p>
        </div>

        <Link
          to="/dashboard"
          className="back-dashboard-button"
        >
          ← Dashboard
        </Link>

      </header>

      {/* ================= SUMMARY ================= */}

      <section className="targeting-summary">

        <div className="targeting-summary-card">

          <div>
            <span>
              Total Rules
            </span>

            <strong>
              {rules.length}
            </strong>
          </div>

          <div className="targeting-summary-icon">
            T
          </div>

        </div>

        <div className="targeting-summary-card">

          <div>
            <span>
              Feature Flags
            </span>

            <strong>
              {flags.length}
            </strong>
          </div>

          <div className="targeting-summary-icon">
            F
          </div>

        </div>

      </section>

      {/* ================= MAIN SECTION ================= */}

      <section className="targeting-section">

        <div className="section-header">

          <div>
            <h2>
              All Targeting Rules
            </h2>

            <p>
              Configure conditions that control
              feature flag targeting.
            </p>
          </div>

          <button
            className="add-rule-button"
            onClick={() =>
              setShowAddRuleModal(true)
            }
          >
            + Add Rule
          </button>

        </div>

        {/* ================= EMPTY STATE ================= */}

        {rules.length === 0 ? (

          <div className="targeting-empty-state">

            <div className="empty-targeting-icon">
              
            </div>

            <h3>
              No targeting rules
            </h3>

            <p>
              Create your first targeting rule
              to control feature availability.
            </p>

            <button
              className="empty-add-rule-button"
              onClick={() =>
                setShowAddRuleModal(true)
              }
            >
              + Add Rule
            </button>

          </div>

        ) : (

          /* ================= RULE GRID ================= */

          <div className="targeting-grid">

            {rules.map((rule, index) => {

              /*
               * Safety check.
               *
               * Normally rule_id should always exist
               * because it comes from the database.
               */
              const ruleKey =
                rule.rule_id ??
                `${rule.flag_id}-${rule.attribute}-${rule.operator}-${rule.value}-${index}`;

              return (
                <div
                  className="targeting-card"
                  key={ruleKey}
                >

                  {/* Card Header */}

                  <div className="targeting-card-header">

                    <div className="targeting-icon">
                      T
                    </div>

                    <div>

                      <h3>
                        {getFlagName(
                          rule.flag_id
                        )}
                      </h3>

                      <span>
                        {rule.rule_id
                          ? `Rule #${rule.rule_id}`
                          : "New Rule"}
                      </span>

                    </div>

                  </div>

                  {/* Condition */}

                  <div className="rule-condition">

                    <span className="condition-label">
                      Condition
                    </span>

                    <div className="condition-box">

                      <span className="attribute">
                        {rule.attribute}
                      </span>

                      <span className="operator">
                        {rule.operator}
                      </span>

                      <span className="condition-value">
                        {rule.value}
                      </span>

                    </div>

                  </div>

                  {/* Details */}

                  <div className="rule-details">

                    <div className="rule-detail">

                      <span>
                        Flag ID
                      </span>

                      <strong>
                        #{rule.flag_id}
                      </strong>

                    </div>

                    <div className="rule-detail">

                      <span>
                        Status
                      </span>

                      <strong className="rule-active">

                        <span className="status-dot"></span>

                        Active

                      </strong>

                    </div>

                  </div>

                  {/* Footer */}

                  <div className="targeting-card-footer">

                    <button
                      className="view-rule-button"
                      onClick={() =>
                        setSelectedRule(rule)
                      }
                    >
                      View
                    </button>

                    <button
                      className="edit-rule-button"
                      onClick={() =>
                        setEditingRule(rule)
                      }
                    >
                      Edit
                    </button>

                    <button
                      className="delete-rule-button"
                      onClick={() =>
                        handleDelete(
                          rule.rule_id
                        )
                      }
                    >
                      Delete
                    </button>

                  </div>

                </div>
              );
            })}

          </div>

        )}

      </section>

      {/* ================= ADD RULE MODAL ================= */}

      {showAddRuleModal && (

        <AddTargetingRuleModel

          flags={flags}

          onClose={() =>
            setShowAddRuleModal(false)
          }

          /*
           * IMPORTANT:
           *
           * Do NOT do:
           *
           * setRules([...rules, newRule])
           *
           * Instead reload everything from backend.
           */
          onRuleCreated={async () => {

            setShowAddRuleModal(false);

            /*
             * Fetch latest rules + flags.
             *
             * This ensures:
             *
             * 1. rule_id exists
             * 2. flag_id is correctly mapped
             * 3. Unknown Flag disappears
             * 4. UI exactly matches database
             */
            await loadTargetingData();

          }}

        />

      )}

      {/* ================= VIEW MODAL ================= */}

      {selectedRule && (

        <TargetingRuleDetailsModal

          rule={selectedRule}

          flagName={getFlagName(
            selectedRule.flag_id
          )}

          onClose={() =>
            setSelectedRule(null)
          }

        />

      )}

      {/* ================= EDIT MODAL ================= */}

      {editingRule && (

        <EditTargetingRuleModal

          rule={editingRule}

          flagName={getFlagName(
            editingRule.flag_id
          )}

          onClose={() =>
            setEditingRule(null)
          }

          onRuleUpdated={async () => {
            setEditingRule(null);
            await loadTargetingData();
          }}

        />

      )}

    </div>
  );
}

export default Targeting;