import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import api from "../api";

import "./evaluationAnalytics.css";

function EvaluationAnalytics() {
  const [analytics, setAnalytics] = useState([]);
  const [flags, setFlags] = useState([]);
  const [selectedFlag, setSelectedFlag] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // LOAD ANALYTICS DATA
  // =====================================================

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);

        const [
          analyticsResponse,
          flagsResponse,
        ] = await Promise.all([
          api.get("/evaluation-analytics"),
          api.get("/flags"),
        ]);

        setAnalytics(analyticsResponse.data);
        setFlags(flagsResponse.data);
      } catch (error) {
        console.error(
          "Evaluation analytics loading failed:",
          error
        );

        setError(
          "Failed to load evaluation analytics."
        );
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  // =====================================================
  // REMOVE DUPLICATE FLAGS
  // =====================================================

  const uniqueFlags = flags.filter(
    (flag, index, self) =>
      index ===
      self.findIndex(
        (item) => item.key === flag.key
      )
  );

  // =====================================================
  // FILTER ANALYTICS
  // =====================================================

  const filteredAnalytics =
    selectedFlag === "all"
      ? analytics
      : analytics.filter(
          (item) =>
            String(item.flag_id) ===
            String(selectedFlag)
        );

  // =====================================================
  // TOTAL EVALUATIONS
  // =====================================================

  const totalEvaluations =
    filteredAnalytics.reduce(
      (total, item) =>
        total + Number(item.evaluation_count || 0),
      0
    );

  // =====================================================
  // FLAGS WITH EVALUATIONS
  // =====================================================

  const flagsWithEvaluations =
    new Set(
      filteredAnalytics.map(
        (item) => item.flag_id
      )
    ).size;

  // =====================================================
  // CHART DATA
  // =====================================================

  const chartData = [...filteredAnalytics]
    .sort(
      (a, b) =>
        a.evaluation_hour -
        b.evaluation_hour
    )
    .map((item) => ({
      hour: `${String(
        item.evaluation_hour
      ).padStart(2, "0")}:00`,

      evaluations:
        Number(item.evaluation_count || 0),

      flagId: item.flag_id,

      date: item.evaluation_date,
    }));

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="analytics-message">
        <div className="analytics-loader"></div>

        <p>
          Loading evaluation analytics...
        </p>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <div className="analytics-message analytics-error">
        <p>{error}</p>

        <Link to="/dashboard">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="evaluation-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="evaluation-header">

        <div>
          <h1>
            Evaluation Analytics
          </h1>

          <p>
            Monitor how frequently your feature
            flags are being evaluated over time.
          </p>
        </div>

        <Link
          to="/dashboard"
          className="back-dashboard-button"
        >
          ← Back to Dashboard
        </Link>

      </header>


      {/* =================================================
          WHY THIS ANALYTICS
      ================================================= */}

      <section className="analytics-info">

        <div className="analytics-info-icon">
          <i className="fas fa-chart-line"></i>
        </div>

        <div>

          <h2>
            Why Evaluation Analytics?
          </h2>

          <p>
            Evaluation analytics shows how often
            each feature flag is requested by your
            application. This helps teams understand
            which flags are actively used, identify
            unused flags, and make better decisions
            about feature cleanup and monitoring.
          </p>

        </div>

      </section>


      {/* =================================================
          METRICS
      ================================================= */}

      <section className="analytics-metrics">

        <div className="metric-card">

          <span className="metric-label">
            Total Evaluations
          </span>

          <strong className="metric-value">
            {totalEvaluations}
          </strong>

          <span className="metric-description">
            Recorded evaluations
          </span>

        </div>


        <div className="metric-card">

          <span className="metric-label">
            Analytics Records
          </span>

          <strong className="metric-value">
            {filteredAnalytics.length}
          </strong>

          <span className="metric-description">
            Hourly records
          </span>

        </div>


        <div className="metric-card">

          <span className="metric-label">
            Flags Evaluated
          </span>

          <strong className="metric-value">
            {flagsWithEvaluations}
          </strong>

          <span className="metric-description">
            Flags with recorded activity
          </span>

        </div>

      </section>


      {/* =================================================
          EVALUATION CHART SECTION
      ================================================= */}

      <section className="analytics-section">

        <div className="analytics-section-header">

          <div>

            <h2>
              Evaluation Count
            </h2>

            <p>
              Hourly evaluation activity for
              your feature flags.
            </p>

          </div>


          {/* =================================================
              FEATURE FLAG FILTER
          ================================================= */}

          <div className="flag-filter">

            <label htmlFor="flagFilter">
              Feature Flag
            </label>

            <select
              id="flagFilter"
              value={selectedFlag}
              onChange={(event) =>
                setSelectedFlag(
                  event.target.value
                )
              }
            >

              <option value="all">
                All Flags
              </option>

              {uniqueFlags.map((flag) => (

                <option
                  key={flag.flag_id}
                  value={flag.flag_id}
                >
                  {flag.key}
                </option>

              ))}

            </select>

          </div>

        </div>


        {/* =================================================
            RECHART
        ================================================= */}

        <div className="evaluation-chart">

          {chartData.length === 0 ? (

            <div className="no-analytics">

              <div>
                
              </div>

              <h3>
                No evaluation data available
              </h3>

              <p>
                Evaluate a feature flag to start
                collecting analytics data.
              </p>

            </div>

          ) : (

            <ResponsiveContainer
              width="100%"
              height={400}
            >

              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 10,
                  bottom: 20,
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="hour"
                  tick={{
                    fontSize: 12,
                  }}
                />

                <YAxis
                  allowDecimals={false}
                  tick={{
                    fontSize: 12,
                  }}
                />

                <Tooltip
                  formatter={(value) => [
                    value,
                    "Evaluations",
                  ]}
                  labelFormatter={(label) =>
                    `Hour: ${label}`
                  }
                />

                <Bar
                  dataKey="evaluations"
                  name="Evaluations"
                  fill="#4f46e5"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                  barSize={50}
                />

              </BarChart>

            </ResponsiveContainer>

          )}

        </div>

      </section>


      {/* =================================================
          DATA EXPLANATION
      ================================================= */}

      <section className="analytics-explanation">

        <h2>
          How to read this chart
        </h2>

        <div className="explanation-grid">

          <div>

            <strong>
               High evaluation count
            </strong>

            <p>
              Indicates that the feature flag is
              actively being evaluated by your
              application.
            </p>

          </div>


          <div>

            <strong>
               Low evaluation count
            </strong>

            <p>
              May indicate that a feature is used
              less frequently or has limited traffic.
            </p>

          </div>


          <div>

            <strong>
               Unused flags
            </strong>

            <p>
              Flags with little or no evaluation
              activity can be candidates for cleanup.
            </p>

          </div>

        </div>

      </section>

    </div>
  );
}

export default EvaluationAnalytics;