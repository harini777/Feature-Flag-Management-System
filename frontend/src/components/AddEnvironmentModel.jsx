import { useState } from "react";
import api from "../api";
import "./AddEnvironmentModel.css";

function AddEnvironmentModel({
  onClose,
  onEnvironmentCreated,
}) {
  // Store environment form values
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  // Store loading state
  const [loading, setLoading] = useState(false);

  // Store validation/API errors
  const [error, setError] = useState("");

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Submit the form
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    // Validate environment name
    if (!formData.name.trim()) {
      setError("Environment name is required.");
      return;
    }

    try {
      setLoading(true);

      // Create the request body expected by FastAPI
      const payload = {
        name: formData.name.trim(),
        description:
          formData.description.trim() || null,
      };

      console.log(
        "Creating environment:",
        payload
      );

      // Call POST /environments
      const response = await api.post(
        "/environments",
        payload
      );

      console.log(
        "Environment created:",
        response.data
      );

      // Send the newly created environment
      // back to the parent page
      onEnvironmentCreated(response.data);

    } catch (error) {
      console.error(
        "Failed to create environment:",
        error
      );

      const detail =
        error.response?.data?.detail;

      // Handle FastAPI validation errors
      if (Array.isArray(detail)) {
        const messages = detail.map(
          (item) => item.msg
        );

        setError(messages.join(", "));
      }

      // Handle normal backend error
      else if (typeof detail === "string") {
        setError(detail);
      }

      // Handle unknown error
      else {
        setError(
          "Failed to create environment."
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
              Add Environment
            </h2>

            <p>
              Create a new application environment.
            </p>
          </div>

          {/* Close button */}
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
                ? "Creating..."
                : "Create Environment"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default AddEnvironmentModel;