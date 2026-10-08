import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import FlagDetailsModal from "../components/FlagDetailsModal";
import AddFlagModel from "../components/AddFlagModel";
import EditFlagModal from "../components/EditFlagModal";

import api from "../api";

import { useNotification } from "../context/NotificationContext";

import "./Flags.css";

function Flags() {

  // =====================================================
  // NOTIFICATIONS
  // =====================================================

  const { addNotification } = useNotification();

  const [flagNotificationsEnabled, setFlagNotificationsEnabled] =
    useState(true);

  // =====================================================
  // STATE
  // =====================================================

  const [flags, setFlags] = useState([]);
  const [environments, setEnvironments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedFlag, setSelectedFlag] = useState(null);
  const [updatingFlagId, setUpdatingFlagId] = useState(null);

  const [showAddFlagModel, setShowAddFlagModel] =
    useState(false);

  const [editingFlag, setEditingFlag] =
    useState(null);


  // =====================================================
  // LOAD FLAGS + ENVIRONMENTS + NOTIFICATION PREFERENCE
  // =====================================================

  useEffect(() => {

    const loadData = async () => {

      try {

        setLoading(true);

        const token = localStorage.getItem("token");

        const [
          flagsResponse,
          environmentsResponse,
          notificationResponse,
        ] = await Promise.all([

          api.get("/flags"),

          api.get("/environments"),

          api.get(
            "/notifications/preferences",
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          ),

        ]);


        // =================================================
        // FLAGS
        // =================================================

        console.log(
          "FLAGS FROM API:",
          flagsResponse.data
        );

        setFlags(
          flagsResponse.data
        );


        // =================================================
        // ENVIRONMENTS
        // =================================================

        setEnvironments(
          environmentsResponse.data
        );


        // =================================================
        // NOTIFICATION PREFERENCE
        // =================================================

        console.log(
          "NOTIFICATION PREFERENCES:",
          notificationResponse.data
        );

        setFlagNotificationsEnabled(
          notificationResponse.data.flag_changes
        );


      } catch (error) {

        console.error(
          "Failed to load feature flags:",
          error
        );

        setError(
          "Failed to load feature flags."
        );

      } finally {

        setLoading(false);

      }

    };

    loadData();

  }, []);


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
  // TOGGLE FLAG
  // =====================================================

  const handleToggle = async (flag) => {

    const flagId = flag?.flag_id;

    if (!flagId) {

      setError(
        "Unable to update flag: flag ID is missing."
      );

      return;

    }


    try {

      setUpdatingFlagId(flagId);
      setError("");


      // =================================================
      // NEW STATE
      // =================================================

      const newEnabledState = !flag.enabled;


      // =================================================
      // UPDATED FLAG DATA
      // =================================================

      const updatedFlag = {

        key: flag.key,

        type: flag.type,

        default_value:
          flag.default_value !== null &&
          flag.default_value !== undefined
            ? String(flag.default_value)
            : null,

        enabled: newEnabledState,

        description: flag.description,

        owner_team: flag.owner_team,

      };


      // =================================================
      // UPDATE FLAG API
      // =================================================

      await api.put(
        `/flags/${flagId}`,
        updatedFlag
      );


      // =================================================
      // UPDATE UI
      // =================================================

      setFlags((currentFlags) =>
        currentFlags.map((currentFlag) =>
          currentFlag.flag_id === flagId
            ? {
                ...currentFlag,
                enabled: newEnabledState,
              }
            : currentFlag
        )
      );


      // =================================================
      // FLAG CHANGE NOTIFICATION
      // =================================================

      if (flagNotificationsEnabled) {

        addNotification(
          `${flag.key} has been ${
            newEnabledState
              ? "enabled"
              : "disabled"
          }.`,
          "success"
        );

      }


    } catch (error) {

      console.error(
        "Failed to update flag:",
        error.response?.data || error
      );

      setError(
        "Failed to update feature flag."
      );

    } finally {

      setUpdatingFlagId(null);

    }

  };


  // =====================================================
  // FLAG CREATED
  // =====================================================

  const handleFlagCreated = (newFlag) => {

    setFlags((currentFlags) => [
      ...currentFlags,
      newFlag,
    ]);

    setShowAddFlagModel(false);

  };


  // =====================================================
  // FLAG UPDATED
  // =====================================================

  const handleFlagUpdated = (updatedFlag) => {

    setFlags((currentFlags) =>
      currentFlags.map((currentFlag) =>
        currentFlag.flag_id === updatedFlag.flag_id
          ? updatedFlag
          : currentFlag
      )
    );

    setEditingFlag(null);

  };


  // =====================================================
  // FLAG DELETED
  // =====================================================

  const handleDeleteFlag = async (flag) => {

    const confirmed = window.confirm(
      `Are you sure you want to delete "${flag.key}"? This will also remove all its targeting rules.`
    );

    if (!confirmed) return;

    try {

      await api.delete(`/flags/${flag.flag_id}`);

      setFlags((currentFlags) =>
        currentFlags.filter(
          (currentFlag) => currentFlag.flag_id !== flag.flag_id
        )
      );

      if (flagNotificationsEnabled) {
        addNotification(
          `${flag.key} has been deleted.`,
          "error"
        );
      }

    } catch (error) {

      console.error("Failed to delete flag:", error);

      setError(
        error.response?.data?.detail ||
        "Failed to delete feature flag."
      );

    }

  };


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (

      <div className="flags-message">

        <div className="loader"></div>

        <p>
          Loading feature flags...
        </p>

      </div>

    );

  }


  // =====================================================
  // ERROR
  // =====================================================

  if (error && flags.length === 0) {

    return (

      <div className="flags-message error-message">

        <p>
          {error}
        </p>

      </div>

    );

  }


  // =====================================================
  // PAGE
  // =====================================================

  return (

    <div className="flags-page">


      {/* =================================================
          HEADER
      ================================================= */}

      <header className="flags-header">

        <div>

          <h1>
            Feature Flags
          </h1>

          <p>
            Create, manage, and monitor your
            feature flags.
          </p>

        </div>

        <Link
          to="/dashboard"
          className="back-dashboard-button"
        >
          ← Dashboard
        </Link>

      </header>


      {/* =================================================
          ERROR MESSAGE
      ================================================= */}

      {error && (

        <div className="toggle-error-message">
          {error}
        </div>

      )}


      {/* =================================================
          SUMMARY
      ================================================= */}

      <section className="flags-summary">

        <div className="summary-card">

          <span>
            Total Flags
          </span>

          <strong>
            {flags.length}
          </strong>

        </div>


        <div className="summary-card">

          <span>
            Enabled
          </span>

          <strong>

            {
              flags.filter(
                (flag) => flag.enabled
              ).length
            }

          </strong>

        </div>


        <div className="summary-card">

          <span>
            Disabled
          </span>

          <strong>

            {
              flags.filter(
                (flag) => !flag.enabled
              ).length
            }

          </strong>

        </div>

      </section>


      {/* =================================================
          FLAGS TABLE
      ================================================= */}

      <section className="flags-table-section">

        <div className="table-header">

          <div>

            <h2>
              All Feature Flags
            </h2>

            <p>
              Manage your configured feature flags.
            </p>

          </div>


          <button
            type="button"
            className="add-flag-link"
            onClick={() =>
              setShowAddFlagModel(true)
            }
          >
            + Add Flag
          </button>

        </div>


        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {flags.length === 0 ? (

          <div className="empty-state">

            <div className="empty-icon">
              ⚑
            </div>

            <h3>
              No feature flags
            </h3>

            <p>
              Create your first feature flag
              to get started.
            </p>

          </div>

        ) : (

          <div className="table-wrapper">

            <table>

              <thead>

                <tr>

                  <th>
                    Flag
                  </th>

                  <th>
                    Type
                  </th>

                  <th>
                    Environment
                  </th>

                  <th>
                    Owner
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Default
                  </th>

                  <th>
                    Actions
                  </th>

                </tr>

              </thead>


              <tbody>

                {flags.map((flag) => (

                  <tr
                    key={flag.flag_id}
                  >

                    {/* FLAG */}

                    <td>

                      <div className="flag-name">

                        <strong>
                          {flag.key}
                        </strong>

                        <span>
                          {flag.description}
                        </span>

                      </div>

                    </td>


                    {/* TYPE */}

                    <td>

                      <span className="type-badge">
                        {flag.type}
                      </span>

                    </td>


                    {/* ENVIRONMENT */}

                    <td>

                      <span className="environment-badge">

                        {getEnvironmentName(
                          flag.environment_id
                        )}

                      </span>

                    </td>


                    {/* OWNER */}

                    <td>
                      {flag.owner_team || "—"}
                    </td>


                    {/* STATUS */}

                    <td>

                      <div className="flag-status-control">

                        <button
                          type="button"
                          className={`toggle-switch ${
                            flag.enabled
                              ? "on"
                              : "off"
                          }`}
                          onClick={() =>
                            handleToggle(flag)
                          }
                          disabled={
                            updatingFlagId ===
                            flag.flag_id
                          }
                          aria-label={
                            flag.enabled
                              ? `Disable ${flag.key}`
                              : `Enable ${flag.key}`
                          }
                        >

                          <span className="toggle-knob"></span>

                        </button>


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

                    </td>


                    {/* DEFAULT */}

                    <td>

                      {String(
                        flag.default_value
                      )}

                    </td>


                    {/* ACTIONS */}

                    <td>

                      <div className="action-buttons">

                        <button
                          type="button"
                          className="view-action"
                          onClick={() =>
                            setSelectedFlag(flag)
                          }
                        >
                          View
                        </button>

                        <button
                          type="button"
                          className="edit-action"
                          onClick={() =>
                            setEditingFlag(flag)
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="delete-action"
                          onClick={() =>
                            handleDeleteFlag(flag)
                          }
                        >
                          Delete
                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </section>


      {/* =================================================
          FLAG DETAILS MODAL
      ================================================= */}

      {selectedFlag && (

        <FlagDetailsModal

          flag={selectedFlag}

          environmentName={
            getEnvironmentName(
              selectedFlag.environment_id
            )
          }

          onClose={() =>
            setSelectedFlag(null)
          }

        />

      )}


      {/* =================================================
          ADD FLAG MODAL
      ================================================= */}

      {showAddFlagModel && (

        <AddFlagModel

          environments={environments}

          onClose={() =>
            setShowAddFlagModel(false)
          }

          onFlagCreated={
            handleFlagCreated
          }

        />

      )}


      {/* =================================================
          EDIT FLAG MODAL
      ================================================= */}

      {editingFlag && (

        <EditFlagModal

          flag={editingFlag}

          environments={environments}

          onClose={() =>
            setEditingFlag(null)
          }

          onFlagUpdated={
            handleFlagUpdated
          }

        />

      )}

    </div>

  );

}

export default Flags;