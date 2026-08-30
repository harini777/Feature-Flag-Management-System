import { useState } from "react";
import api from "../api";
import "./AddFlagModel.css";

function EditFlagModal({
  flag,
  environments,
  onClose,
  onFlagUpdated,
}) {
  const [formData, setFormData] = useState({
    key: flag.key || "",
    type: flag.type || "boolean",
    default_value: flag.default_value || "false",
    enabled: flag.enabled ?? false,
    description: flag.description || "",
    owner_team: flag.owner_team || "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]:
        name === "enabled"
          ? value === "true"
          : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!formData.key.trim()) {
      setError("Flag key is required.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        key: formData.key.trim(),
        type: formData.type,
        default_value: formData.default_value,
        enabled: formData.enabled,
        description: formData.description.trim() || null,
        owner_team: formData.owner_team.trim() || null,
      };

      const response = await api.put(
        `/flags/${flag.flag_id}`,
        payload
      );

      onFlagUpdated(response.data);

      onClose();

    } catch (error) {
      console.error(
        "Failed to update flag:",
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
          "Failed to update feature flag."
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
              Edit Feature Flag
            </h2>

            <p>
              Update the feature flag details.
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

          {/* TYPE + DEFAULT VALUE */}

          <div className="form-row">

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

          </div>

          {/* STATUS */}

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
                ? "Saving..."
                : "Save Changes"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default EditFlagModal;
