import { useState } from "react";
import api from "../api";
import "./AddFlagModel.css";

function AddFlagModel({
  environments,
  onClose,
  onFlagCreated,
}) {
  const [formData, setFormData] = useState({
    environment_id: "",
    key: "",
    type: "boolean",
    default_value: "false",
    enabled: true,
    description: "",
    owner_team: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]:
        name === "environment_id"
          ? Number(value)
          : name === "enabled"
            ? value === "true"
            : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!formData.environment_id) {
      setError("Please select an environment.");
      return;
    }

    if (!formData.key.trim()) {
      setError("Flag key is required.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        environment_id: formData.environment_id,
        key: formData.key.trim(),
        type: formData.type,
        default_value: formData.default_value,
        enabled: formData.enabled,
        description: formData.description.trim() || null,
        owner_team: formData.owner_team.trim() || null,
      };

      console.log("Creating flag:", payload);

      const response = await api.post(
        "/flags",
        payload
      );

      console.log(
        "Flag created successfully:",
        response.data
      );

      onFlagCreated(response.data);

      onClose();

    } catch (error) {
      console.error(
        "Failed to create flag:",
        error
      );

      const detail =
        error.response?.data?.detail;

      if (Array.isArray(detail)) {
        const messages = detail.map(
          (item) => item.msg
        );

        setError(messages.join(", "));
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError(
          "Failed to create feature flag."
        );
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >

      <div
        className="flag-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        {/* HEADER */}

        <div className="modal-header">

          <div>

            <h2>
              Add Feature Flag
            </h2>

            <p>
              Create a new feature flag.
            </p>

          </div>

          <button
            type="button"
            className="close-button"
            onClick={onClose}
          >
            ×
          </button>

        </div>

        {/* FORM */}

        <form onSubmit={handleSubmit}>

          {/* ERROR */}

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          {/* FLAG KEY */}

          <div className="form-group">

            <label>
              Flag Key
            </label>

            <input
              type="text"
              name="key"
              placeholder="e.g. dark_mode"
              value={formData.key}
              onChange={handleChange}
            />

          </div>

          {/* ENVIRONMENT + TYPE */}

          <div className="form-row">

            <div className="form-group">

              <label>
                Environment
              </label>

              <select
                name="environment_id"
                value={
                  formData.environment_id
                }
                onChange={handleChange}
              >

                <option value="">
                  Select environment
                </option>

                {environments.map(
                  (environment) => (

                    <option
                      key={
                        environment.environment_id
                      }
                      value={
                        environment.environment_id
                      }
                    >
                      {environment.name}
                    </option>

                  )
                )}

              </select>

            </div>

            <div className="form-group">

              <label>
                Type
              </label>

              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
              >

                <option value="boolean">
                  Boolean
                </option>

                <option value="percentage">
                  Percentage
                </option>

              </select>

            </div>

          </div>

          {/* DEFAULT VALUE + ENABLED */}

          <div className="form-row">

            <div className="form-group">

              <label>
                Default Value
              </label>

              <select
                name="default_value"
                value={
                  formData.default_value
                }
                onChange={handleChange}
              >

                <option value="true">
                  True
                </option>

                <option value="false">
                  False
                </option>

              </select>

            </div>

            <div className="form-group">

              <label>
                Status
              </label>

              <select
                name="enabled"
                value={String(
                  formData.enabled
                )}
                onChange={handleChange}
              >

                <option value="true">
                  Enabled
                </option>

                <option value="false">
                  Disabled
                </option>

              </select>

            </div>

          </div>

          {/* DESCRIPTION */}

          <div className="form-group">

            <label>
              Description
            </label>

            <textarea
              name="description"
              placeholder="Describe what this feature flag controls..."
              value={
                formData.description
              }
              onChange={handleChange}
              rows="3"
            />

          </div>

          {/* OWNER */}

          <div className="form-group">

            <label>
              Owner Team
            </label>

            <input
              type="text"
              name="owner_team"
              placeholder="e.g. Frontend Team"
              value={
                formData.owner_team
              }
              onChange={handleChange}
            />

          </div>

          {/* BUTTONS */}

          <div className="modal-actions">

            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="create-button"
              disabled={loading}
            >
              {loading
                ? "Creating..."
                : "Create Flag"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default AddFlagModel;