import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import AddEnvironmentModel from "../components/AddEnvironmentModel";
import EditEnvironmentModal from "../components/EditEnvironmentModal";
import EnvironmentDetailsModal from "../components/EnvironmentDetailsModal";
import "./Environments.css";

function Environments() {
  // Store all environments returned from the backend
  const [environments, setEnvironments] = useState([]);

  // Store loading state
  const [loading, setLoading] = useState(true);

  // Store API error messages
  const [error, setError] = useState("");

  // Control whether the Add Environment modal is visible
  const [showAddEnvironmentModal, setShowAddEnvironmentModal] =
    useState(false);

  // Store the environment selected for viewing
  const [selectedEnvironment, setSelectedEnvironment] =
    useState(null);

  // Store the environment selected for editing
  const [editingEnvironment, setEditingEnvironment] =
    useState(null);

  // Fetch environments when the page loads
  useEffect(() => {
    const loadEnvironments = async () => {
      try {
        setLoading(true);

        // Call the FastAPI GET /environments endpoint
        const response = await api.get("/environments");

        // Store the returned environments
        setEnvironments(response.data);
      } catch (error) {
        console.error(
          "Failed to load environments:",
          error
        );

        setError("Failed to load environments.");
      } finally {
        setLoading(false);
      }
    };

    loadEnvironments();
  }, []);

  // Delete an environment
  const handleDelete = async (environmentId) => {
    // Ask the user for confirmation
    const confirmed = window.confirm(
      "Are you sure you want to delete this environment?"
    );

    if (!confirmed) {
      return;
    }

    try {
      // Call DELETE /environments/{environment_id}
      await api.delete(
        `/environments/${environmentId}`
      );

      // Remove the deleted environment from the UI
      setEnvironments((previousEnvironments) =>
        previousEnvironments.filter(
          (environment) =>
            environment.environment_id !== environmentId
        )
      );
    } catch (error) {
      console.error(
        "Failed to delete environment:",
        error
      );

      // Display backend error if available
      alert(
        error.response?.data?.detail ||
          "Failed to delete environment."
      );
    }
  };

  // Handle environment updated
  const handleEnvironmentUpdated = (updatedEnvironment) => {
    setEnvironments((previousEnvironments) =>
      previousEnvironments.map((env) =>
        env.environment_id === updatedEnvironment.environment_id
          ? updatedEnvironment
          : env
      )
    );

    setEditingEnvironment(null);
  };

  // Show loading screen
  if (loading) {
    return (
      <div className="environment-message">
        <div className="loader"></div>

        <p>
          Loading environments...
        </p>
      </div>
    );
  }

  // Show error message
  if (error) {
    return (
      <div className="environment-message error-message">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="environments-page">

      {/* Page Header */}
      <header className="environments-header">

        <div>
          <h1>
            Environments
          </h1>

          <p>
            Manage the environments where your feature
            flags are deployed.
          </p>
        </div>

        {/* Back to dashboard */}
        <Link
          to="/dashboard"
          className="back-dashboard-button"
        >
          ← Dashboard
        </Link>

      </header>


      {/* Environment Summary */}
      <section className="environment-summary">

        <div className="environment-summary-card">

          <div>
            <span>
              Total Environments
            </span>

            <strong>
              {environments.length}
            </strong>
          </div>

          <div className="summary-icon">
            
          </div>

        </div>

      </section>


      {/* Environment List */}
      <section className="environments-section">

        <div className="section-header">

          <div>
            <h2>
              All Environments
            </h2>

            <p>
              Configure and manage your application
              environments.
            </p>
          </div>


          {/* Open Add Environment modal */}
          <button
            className="add-environment-button"
            onClick={() =>
              setShowAddEnvironmentModal(true)
            }
          >
            + Add Environment
          </button>

        </div>


        {/* Empty state */}
        {environments.length === 0 ? (

          <div className="environment-empty-state">

            <div className="empty-environment-icon">
              
            </div>

            <h3>
              No environments found
            </h3>

            <p>
              Create your first environment to get started.
            </p>

            <button
              className="empty-add-button"
              onClick={() =>
                setShowAddEnvironmentModal(true)
              }
            >
              + Add Environment
            </button>

          </div>

        ) : (

          /* Environment Cards */
          <div className="environments-grid">

            {environments.map((environment) => (

              <div
                className="environment-card"
                key={environment.environment_id}
              >

                {/* Card Header */}
                <div className="environment-card-header">

                  <div className="environment-icon">
                    E
                  </div>

                  <div>
                    <h3>
                      {environment.name}
                    </h3>

                    <span>
                      Environment
                    </span>
                  </div>

                </div>


                {/* Description */}
                <p className="environment-description">
                  {environment.description ||
                    "No description provided."}
                </p>


                {/* Environment Details */}
                <div className="environment-details">

                  <div className="environment-detail">

                    <span>
                      Environment ID
                    </span>

                    <strong>
                      #{environment.environment_id}
                    </strong>

                  </div>


                  <div className="environment-detail">

                    <span>
                      Status
                    </span>

                    <strong className="active-status">
                      <span className="status-dot"></span>
                      Active
                    </strong>

                  </div>

                </div>


                {/* Card Footer */}
                <div className="environment-card-footer">

                  {/* View Environment */}
                  <button
                    className="view-environment-button"
                    onClick={() =>
                      setSelectedEnvironment(environment)
                    }
                  >
                    View
                  </button>


                  {/* Edit Environment */}
                  <button
                    className="edit-environment-button"
                    onClick={() =>
                      setEditingEnvironment(environment)
                    }
                  >
                    Edit
                  </button>


                  {/* Delete Environment */}
                  <button
                    className="delete-environment-button"
                    onClick={() =>
                      handleDelete(
                        environment.environment_id
                      )
                    }
                  >
                    Delete
                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </section>


      {/* Add Environment Modal */}
      {showAddEnvironmentModal && (

        <AddEnvironmentModel

          onClose={() =>
            setShowAddEnvironmentModal(false)
          }

          // Add the newly created environment
          // directly to the UI
          onEnvironmentCreated={(newEnvironment) => {

            setEnvironments(
              (previousEnvironments) => [
                ...previousEnvironments,
                newEnvironment,
              ]
            );

            // Close the modal
            setShowAddEnvironmentModal(false);
          }}

        />

      )}


      {/* Environment Details Modal */}
      {selectedEnvironment && (

        <EnvironmentDetailsModal

          // Pass selected environment to popup
          environment={selectedEnvironment}

          // Close the popup
          onClose={() =>
            setSelectedEnvironment(null)
          }

        />

      )}


      {/* Edit Environment Modal */}
      {editingEnvironment && (

        <EditEnvironmentModal

          environment={editingEnvironment}

          onClose={() =>
            setEditingEnvironment(null)
          }

          onEnvironmentUpdated={
            handleEnvironmentUpdated
          }

        />

      )}

    </div>
  );
}

export default Environments;