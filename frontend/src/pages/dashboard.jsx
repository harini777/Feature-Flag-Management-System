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
import AddFlagModel from "../components/AddFlagModel";
import { useNotification } from "../context/NotificationContext";
import "./dashboard.css";

function Dashboard() {
  const [flags, setFlags] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddFlagModel, setShowAddFlagModel] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  
  const { notificationHistory, clearHistory } = useNotification();

  // =====================================================
  // GET LOGGED-IN USER
  // =====================================================

  let userName = "User";

  try {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      const user = JSON.parse(storedUser);

      console.log("Dashboard user:", user);

      /*
        Support different possible user structures.

        Example 1:
        {
          "name": "kokkula Harika"
        }

        Example 2:
        {
          "username": "kokkula Harika"
        }

        Example 3:
        {
          "user": {
            "name": "kokkula Harika"
          }
        }
      */

      const actualUser = user?.user || user;

      userName =
        actualUser?.name ||
        actualUser?.username ||
        actualUser?.full_name ||
        actualUser?.fullName ||
        actualUser?.display_name ||
        actualUser?.displayName ||
        "User";
    }
  } catch (error) {
    console.error(
      "Error reading logged-in user:",
      error
    );
  }

  // First letter for avatar
  const userInitial =
    userName.charAt(0).toUpperCase();

  // =====================================================
  // LOAD DASHBOARD DATA
  // =====================================================

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);

        const [
          flagsResponse,
          environmentsResponse,
        ] = await Promise.all([
          api.get("/flags"),
          api.get("/environments"),
        ]);

        setFlags(flagsResponse.data);
        setEnvironments(
          environmentsResponse.data
        );
      } catch (error) {
        console.error(
          "Dashboard loading failed:",
          error
        );

        setError(
          "Failed to load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // =====================================================
  // FLAG COUNTS
  // =====================================================

  const activeFlags = flags.filter(
    (flag) => flag.enabled
  ).length;

  const disabledFlags = flags.filter(
    (flag) => !flag.enabled
  ).length;

  // =====================================================
  // CHART DATA
  // =====================================================

  const chartData = [
    {
      name: "Total Flags",
      value: flags.length,
    },
    {
      name: "Active Flags",
      value: activeFlags,
    },
    {
      name: "Disabled Flags",
      value: disabledFlags,
    },
    {
      name: "Environments",
      value: environments.length,
    },
  ];

  // =====================================================
  // GET ENVIRONMENT NAME
  // =====================================================

  const getEnvironmentName = (environmentId) => {
    const environment = environments.find(
      (env) =>
        env.environment_id === environmentId
    );

    return environment
      ? environment.name
      : "Unknown";
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="dashboard-message">
        <div className="loader"></div>

        <p>Loading dashboard...</p>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <div className="dashboard-message error-message">
        <p>{error}</p>
      </div>
    );
  }

  // =====================================================
  // DASHBOARD
  // =====================================================

  return (
    <div className="dashboard-container">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="sidebar">

        {/* Logo */}

        <div className="logo">

          <div className="logo-icon">
            <i className="fa-solid fa-bolt"></i>
          </div>

          <div>
            <h2>FlagFlow</h2>

            <span>
              Feature Management
            </span>
          </div>

        </div>

        {/* Navigation */}

        <nav className="sidebar-nav">

          <p className="nav-title">
            MAIN
          </p>

          <Link
            to="/dashboard"
            className="nav-item active"
          >
            <span><i className="fa-solid fa-gauge"></i>  </span>
            Dashboard
          </Link>

          <Link
            to="/flags"
            className="nav-item"
          >
            <span><i className="fa-solid fa-toggle-on"></i> </span>
            Feature Flags
          </Link>

          <Link
            to="/environments"
            className="nav-item"
          >
            <span><i className="fa-solid fa-server"></i> </span>
            Environments
          </Link>

          <Link
            to="/targeting"
            className="nav-item"
          >
            <span><i className="fa-solid fa-sliders"></i> </span>
            Targeting
          </Link>

          <Link to="/evaluation-analytics" className="nav-item">
            <span><i className="fa-solid fa-chart-line"></i> </span>
            Evaluation Analytics
            </Link>

          <Link
            to="/audit-logs"
            className="nav-item"
          >
            <span><i className="fa-solid fa-clock-rotate-left"></i> </span>
            Audit Logs
          </Link>

          <p className="nav-title settings-title">
            SYSTEM
          </p>

          <Link
            to="/settings"
            className="nav-item"
          >
            <span><i className="fa-solid fa-gear"></i> </span>
            Settings
          </Link>

        </nav>

        {/* =================================================
            SIDEBAR USER
        ================================================= */}

        <div className="sidebar-bottom">

          <div className="user-box">

            <div className="user-avatar">
              {userInitial}
            </div>

            <strong>
              {userName}
            </strong>

          </div>

        </div>

      </aside>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main className="main-content">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="top-header">

          <div>

            <h1>
              Dashboard
            </h1>

            <p>
              Manage your feature flags and monitor
              your environments.
            </p>

          </div>

          <div className="header-right">

            <div className="notification-container-relative">
              <button 
                className="notification-button"
                onClick={() => setIsNotificationDropdownOpen(!isNotificationDropdownOpen)}
              >
                <i className="fa-solid fa-bell"></i>
                {notificationHistory?.length > 0 && (
                  <span className="notification-badge">{notificationHistory.length}</span>
                )}
              </button>

              {isNotificationDropdownOpen && (
                <div className="notification-dropdown">
                  <div className="notification-dropdown-header">
                    <h4>Notifications</h4>
                    {notificationHistory?.length > 0 && (
                      <button className="clear-history-button" onClick={clearHistory}>
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="notification-dropdown-body">
                    {notificationHistory?.length > 0 ? (
                      notificationHistory.map((notif) => (
                        <div key={notif.id} className={`notification-dropdown-item ${notif.type}`}>
                          <div className="notif-title">{notif.title}</div>
                          <div className="notif-message">{notif.message}</div>
                          <div className="notif-time">
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="notification-dropdown-empty">
                        No new notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}

            <div className="profile">

              <div className="profile-avatar">
                {userInitial}
              </div>

              <strong>
                {userName}
              </strong>

            </div>

          </div>

        </header>

        {/* =================================================
            FEATURE FLAG OVERVIEW
        ================================================= */}

        <section className="chart-section">

          <div className="chart-header">

            <div>

              <h2>
                Feature Flag Overview
              </h2>

              <p>
                Overview of your feature flags
                and environments.
              </p>

            </div>

          </div>

          <div className="chart-container">

            <ResponsiveContainer
              width="100%"
              height={350}
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
                  dataKey="name"
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

                <Tooltip />

                <Bar
                  dataKey="value"
                  name="Count"
                  fill="#4f46e5"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                  barSize={55}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </section>

        


        {/* =================================================
            FEATURE FLAGS
        ================================================= */}

        <section className="flags-section">

          <div className="section-header">

            <div>

              <h2>
                Feature Flags
              </h2>

              <p>
                View and monitor all configured
                feature flags.
              </p>

            </div>

            <button
              className="add-flag-button"
              onClick={() =>
                setShowAddFlagModel(true)
              }
            >
              + Add Flag
            </button>

          </div>

          {/* Flags Grid */}

          <div className="flags-grid">

            {flags.map((flag) => (

              <div
                className="flag-card"
                key={flag.flag_id}
              >

                {/* Flag Header */}

                <div className="flag-card-header">

                  <div>

                    <h3>
                      {flag.key}
                    </h3>

                    <span className="flag-type">
                      {flag.type}
                    </span>

                  </div>

                  {/* Status */}

                  <span
                    className={
                      flag.enabled
                        ? "status-badge enabled"
                        : "status-badge disabled"
                    }
                  >

                    <span className="status-dot"></span>

                    {flag.enabled
                      ? "Enabled"
                      : "Disabled"}

                  </span>

                </div>

                {/* Description */}

                <p className="flag-description">
                  {flag.description}
                </p>

                {/* Details */}

                <div className="flag-details">

                  <div className="detail">

                    <span className="detail-label">
                      Environment
                    </span>

                    <span className="environment-badge">

                      {getEnvironmentName(
                        flag.environment_id
                      )}

                    </span>

                  </div>

                  <div className="detail">

                    <span className="detail-label">
                      Owner
                    </span>

                    <span className="owner">
                      {flag.owner_team}
                    </span>

                  </div>

                </div>

                {/* Footer */}

                <div className="flag-card-footer">

                  <span>
                    Default:{" "}
                    {String(
                      flag.default_value
                    )}
                  </span>

                </div>

              </div>

            ))}

          </div>

        </section>

      </main>

      {/* =================================================
          ADD FLAG MODAL
      ================================================= */}

      {showAddFlagModel && (

        <AddFlagModel
          environments={environments}

          onClose={() =>
            setShowAddFlagModel(false)
          }

          onFlagCreated={(newFlag) => {

            setFlags(
              (previousFlags) => [
                ...previousFlags,
                newFlag,
              ]
            );

          }}
        />

      )}

    </div>
  );
}

export default Dashboard;