import { useState } from "react";
import api from "../api";
import "./AddEnvironmentModel.css";

function EditEnvironmentModal({
  environment,
  onClose,
  onEnvironmentUpdated,
}) {
  const [formData, setFormData] = useState({
    name: environment.name || "",
    description: environment.description || "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!formData.name.trim()) {
      setError("Environment name is required.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: formData.name.trim(),
        description:
          formData.description.trim() || "",
      };

      const response = await api.put(
        `/environments/${environment.environment_id}`,
        payload
      );

      onEnvironmentUpdated(response.data);

      onClose();

    } catch (error) {
      console.error(
        "Failed to update environment:",
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
          "Failed to update environment."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="environment-modal-overlay"
      onClick={onClose}
    >

      <div
        className="environment-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        {/* Modal Header */}
        <div className="environment-modal-header">

          <div>
            <h2>
              Edit Environment
            </h2>

            <p>
              Update the environment details.
            </p>
          </div>

          <button
            type="button"
            className="environment-close-button"
            onClick={onClose}
          >
            ×
          </button>

        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>

          {/* Error message */}
          {error && (
            <div className="environment-form-error">
              {error}
            </div>
          )}

          {/* Environment Name */}
          <div className="environment-form-group">

            <label>
              Environment Name
            </label>

            <input
              type="text"
              name="name"
              placeholder="e.g. Development"
              value={formData.name}
              onChange={handleChange}
            />

          </div>

          {/* Description */}
          <div className="environment-form-group">

            <label>
              Description
            </label>

            <textarea
              name="description"
              rows="4"
              placeholder="Describe this environment..."
              value={formData.description}
              onChange={handleChange}
            />

          </div>

          {/* Buttons */}
          <div className="environment-modal-actions">

            <button
              type="button"
              className="environment-cancel-button"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="environment-create-button"
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

export default EditEnvironmentModal;
