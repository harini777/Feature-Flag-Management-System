import { useState } from "react";
import api from "../api";
import "./AddTargetingRuleModel.css";

function EditTargetingRuleModal({
  rule,
  flagName,
  onClose,
  onRuleUpdated,
}) {
  const [formData, setFormData] = useState({
    attribute: rule.attribute || "",
    operator: rule.operator || "=",
    value: rule.value || "",
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

    if (!formData.attribute.trim()) {
      setError("Attribute is required.");
      return;
    }

    if (!formData.value.trim()) {
      setError("Value is required.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        attribute: formData.attribute.trim(),
        operator: formData.operator,
        value: formData.value.trim(),
      };

      await api.put(
        `/targeting-rules/${rule.rule_id}`,
        payload
      );

      onRuleUpdated();

      onClose();

    } catch (error) {
      console.error(
        "Failed to update targeting rule:",
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
          "Failed to update targeting rule."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="targeting-modal-overlay"
      onClick={onClose}
    >

      <div
        className="targeting-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        {/* Header */}

        <div className="targeting-modal-header">

          <div>

            <h2>
              Edit Targeting Rule
            </h2>

            <p>
              Update the targeting rule for{" "}
              <strong>{flagName}</strong>.
            </p>

          </div>

          <button
            type="button"
            className="targeting-close-button"
            onClick={onClose}
          >
            ×
          </button>

        </div>

        {/* Form */}

        <form onSubmit={handleSubmit}>

          {/* Error */}

          {error && (
            <div className="targeting-form-error">
              {error}
            </div>
          )}

          {/* Attribute */}

          <div className="targeting-form-group">

            <label>
              Attribute
            </label>

            <input
              type="text"
              name="attribute"
              placeholder="e.g. user_id, country"
              value={formData.attribute}
              onChange={handleChange}
            />

          </div>

          {/* Operator */}

          <div className="targeting-form-group">

            <label>
              Operator
            </label>

            <select
              name="operator"
              value={formData.operator}
              onChange={handleChange}
            >

              <option value="=">
                Equals (=)
              </option>

              <option value="!=">
                Not Equals (!=)
              </option>

              <option value="contains">
                Contains
              </option>

              <option value="starts_with">
                Starts With
              </option>

              <option value="ends_with">
                Ends With
              </option>

              <option value="in">
                In (comma-separated list)
              </option>

            </select>

          </div>

          {/* Value */}

          <div className="targeting-form-group">

            <label>
              Value
            </label>

            <input
              type="text"
              name="value"
              placeholder="e.g. 101, India"
              value={formData.value}
              onChange={handleChange}
            />

          </div>

          {/* Buttons */}

          <div className="targeting-modal-actions">

            <button
              type="button"
              className="targeting-cancel-button"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="targeting-create-button"
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

export default EditTargetingRuleModal;
