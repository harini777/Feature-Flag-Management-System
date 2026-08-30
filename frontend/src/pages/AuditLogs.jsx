import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import "./AuditLogs.css";

function AuditLogs() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [flagFilter, setFlagFilter] = useState("");
  const [environmentFilter, setEnvironmentFilter] = useState("");

  // Load audit logs from backend
  useEffect(() => {
    const loadAuditLogs = async () => {
      try {
        setLoading(true);

        const response = await api.get("/audit-logs");

        setAuditLogs(response.data);
      } catch (error) {
        console.error("Failed to load audit logs:", error);
        setError("Failed to load audit logs.");
      } finally {
        setLoading(false);
      }
    };

    loadAuditLogs();
  }, []);

  // Format timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) {
      return "-";
    }

    return new Date(timestamp).toLocaleString();
  };

  // Display only key and value instead of complete JSON
  const formatState = (state) => {
    if (!state || typeof state !== "object") {
      return "-";
    }

    return Object.entries(state).map(([key, value]) => (
      <div key={key} className="state-change">
        <strong>{key}:</strong>{" "}
        {typeof value === "object"
          ? JSON.stringify(value)
          : String(value)}
      </div>
    ));
  };

  // Get filtered audit logs
  const filteredLogs = auditLogs.filter((log) => {
    const search = searchTerm.toLowerCase().trim();

    const matchesSearch =
      !search ||
      String(log.actor || "").toLowerCase().includes(search) ||
      String(log.action || "").toLowerCase().includes(search) ||
      String(log.flag_id || "").includes(search) ||
      String(log.environment_id || "").includes(search);

    const matchesAction =
      actionFilter === "ALL" ||
      log.action === actionFilter;

    const matchesFlag =
      !flagFilter ||
      String(log.flag_id) === String(flagFilter);

    const matchesEnvironment =
      !environmentFilter ||
      String(log.environment_id) === String(environmentFilter);

    return (
      matchesSearch &&
      matchesAction &&
      matchesFlag &&
      matchesEnvironment
    );
  });

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setActionFilter("ALL");
    setFlagFilter("");
    setEnvironmentFilter("");
  };

  // Loading state
  if (loading) {
    return (
      <div className="audit-page-message">
        <div className="loader"></div>
        <p>Loading audit logs...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="audit-page-message error-message">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="audit-page">

      {/* ================= HEADER ================= */}

      <div className="audit-page-header">

        <div>
          <h1>Audit Logs</h1>

          <p>
            Track all changes made to feature flags and environments.
          </p>
        </div>

        {/* Return to Dashboard */}
        <Link
          to="/dashboard"
          className="back-dashboard-button"
        >
          ← Back to Dashboard
        </Link>

      </div>

      {/* ================= AUDIT CONTENT ================= */}

      <section className="audit-section">

        <div className="section-header">

          <div>
            <h2>Activity History</h2>

            <p>
              View recent changes and actions performed in the system.
            </p>
          </div>

          <span className="audit-count">
            {filteredLogs.length} Records
          </span>

        </div>

        {/* ================= SEARCH & FILTERS ================= */}

        <div className="audit-filters">

          {/* Search */}
          <div className="filter-group search-group">

            <label>
              Search
            </label>

            <input
              type="text"
              placeholder="Search actor, action, flag ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

          </div>

          {/* Action Filter */}
          <div className="filter-group">

            <label>
              Action
            </label>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="ALL">All Actions</option>

              <option value="CREATE">
                CREATE
              </option>

              <option value="UPDATE">
                UPDATE
              </option>

              <option value="DELETE">
                DELETE
              </option>

              <option value="TARGETING_RULE_CREATE">
                TARGETING RULE CREATE
              </option>

              <option value="TARGETING_RULE_UPDATE">
                TARGETING RULE UPDATE
              </option>
            </select>

          </div>

          {/* Flag ID Filter */}
          <div className="filter-group">

            <label>
              Flag ID
            </label>

            <input
              type="number"
              placeholder="Flag ID"
              value={flagFilter}
              onChange={(e) => setFlagFilter(e.target.value)}
            />

          </div>

          {/* Environment ID Filter */}
          <div className="filter-group">

            <label>
              Environment ID
            </label>

            <input
              type="number"
              placeholder="Environment ID"
              value={environmentFilter}
              onChange={(e) =>
                setEnvironmentFilter(e.target.value)
              }
            />

          </div>

          {/* Clear Filters */}
          <button
            className="clear-filters-button"
            onClick={clearFilters}
          >
            Clear Filters
          </button>

        </div>

        {/* ================= TABLE ================= */}

        <div className="audit-table-wrapper">

          {filteredLogs.length === 0 ? (

            <div className="empty-audit">

              <div className="empty-icon">
                📋
              </div>

              <h3>
                {auditLogs.length === 0
                  ? "No Audit Logs"
                  : "No Matching Audit Logs"}
              </h3>

              <p>
                {auditLogs.length === 0
                  ? "No activity has been recorded yet."
                  : "Try changing your search or filters."}
              </p>

            </div>

          ) : (

            <table className="audit-table">

              <thead>

                <tr>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Flag ID</th>
                  <th>Environment ID</th>
                  <th>Previous State</th>
                  <th>New State</th>
                  <th>Timestamp</th>
                </tr>

              </thead>

              <tbody>

                {filteredLogs.map((log) => (

                  <tr key={log.audit_id}>

                    {/* Action */}
                    <td>
                      <span className="action-badge">
                        {log.action}
                      </span>
                    </td>

                    {/* Actor */}
                    <td>

                      <div className="actor">

                        <div className="actor-avatar">
                          {log.actor
                            ? log.actor.charAt(0).toUpperCase()
                            : "?"}
                        </div>

                        <span>
                          {log.actor}
                        </span>

                      </div>

                    </td>

                    {/* Flag ID */}
                    <td>
                      <span className="id-badge">
                        #{log.flag_id}
                      </span>
                    </td>

                    {/* Environment ID */}
                    <td>
                      <span className="id-badge">
                        #{log.environment_id}
                      </span>
                    </td>

                    {/* Previous State */}
                    <td>

                      {log.previous_state ? (

                        <div className="state-box">
                          {formatState(log.previous_state)}
                        </div>

                      ) : (

                        <span className="empty-state">
                          -
                        </span>

                      )}

                    </td>

                    {/* New State */}
                    <td>

                      {log.new_state ? (

                        <div className="state-box">
                          {formatState(log.new_state)}
                        </div>

                      ) : (

                        <span className="empty-state">
                          -
                        </span>

                      )}

                    </td>

                    {/* Timestamp */}
                    <td>
                      <span className="timestamp">
                        {formatDate(log.timestamp)}
                      </span>
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          )}

        </div>

      </section>

    </div>
  );
}

export default AuditLogs;