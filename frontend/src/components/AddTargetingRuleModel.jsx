import { useState } from "react";
import api from "../api";
import "./AddTargetingRuleModel.css";

function AddTargetingRuleModel({
  flags,
  onClose,
  onRuleCreated,
}) {
  const [formData, setFormData] = useState({
    flag_id: "",
    ruleType: "attribute",
    attribute: "",
    operator: "equals",
    value: "",
    rolloutPercentage: 50,
  });

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  /*
   * Handle normal inputs
   */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,

      [name]:
        name === "flag_id"
          ? Number(value)
          : value,
    }));
  };

  /*
   * Handle percentage slider
   */
  const handlePercentageChange = (e) => {
    setFormData((previous) => ({
      ...previous,

      rolloutPercentage: Number(
        e.target.value
      ),
    }));
  };

  /*
   * Handle rule type
   */
  const handleRuleTypeChange = (e) => {
    const ruleType = e.target.value;

    setFormData((previous) => ({
      ...previous,

      ruleType,

      attribute:
        ruleType === "attribute"
          ? previous.attribute
          : "",

      operator:
        ruleType === "attribute"
          ? previous.operator
          : "=",

      value:
        ruleType === "attribute"
          ? previous.value
          : "",
    }));

    setError("");
  };

  /*
   * Submit
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    /*
     * Validate flag
     */
    if (!formData.flag_id) {
      setError(
        "Please select a feature flag."
      );
      return;
    }

    /*
     * Validate percentage
     */
    if (
      formData.ruleType === "percentage"
    ) {
      if (
        formData.rolloutPercentage < 0 ||
        formData.rolloutPercentage > 100
      ) {
        setError(
          "Rollout percentage must be between 0 and 100."
        );
        return;
      }
    }

    /*
     * Validate attribute rule
     */
    if (
      formData.ruleType === "attribute"
    ) {
      if (!formData.attribute.trim()) {
        setError(
          "Attribute is required."
        );
        return;
      }

      if (!formData.value.trim()) {
        setError(
          "Value is required."
        );
        return;
      }
    }

    try {
      setLoading(true);

      let payload;

      /*
       * Percentage rollout
       *
       * This matches your backend:
       *
       * attribute = rollout_percentage
       * operator = =
       * value = percentage
       */
      if (
        formData.ruleType ===
        "percentage"
      ) {
        payload = {
          flag_id: formData.flag_id,
          attribute:
            "rollout_percentage",
          operator: "=",
          value: String(
            formData.rolloutPercentage
          ),
        };
      }

      /*
       * Normal attribute targeting
       */
      else {
        payload = {
          flag_id: formData.flag_id,
          attribute:
            formData.attribute.trim(),
          operator:
            formData.operator,
          value:
            formData.value.trim(),
        };
      }

      console.log(
        "Creating targeting rule:",
        payload
      );

      /*
       * Create rule
       */
      const response = await api.post(
        "/targeting-rules",
        payload
      );

      console.log(
        "Targeting rule created:",
        response.data
      );

      console.log(
        "HTTP status:",
        response.status
      );

      /*
       * We don't directly add response.data
       * to the rules array.
       *
       * Targeting.jsx will reload the
       * rules from the backend.
       */
      onRuleCreated();

    } catch (error) {
      console.error(
        "Failed to create targeting rule:",
        error
      );

      const detail =
        error.response?.data?.detail;

      /*
       * FastAPI validation error
       */
      if (Array.isArray(detail)) {

        const messages =
          detail.map(
            (item) => item.msg
          );

        setError(
          messages.join(", ")
        );

      }

      /*
       * Normal API error
       */
      else if (
        typeof detail === "string"
      ) {

        setError(detail);

      }

      /*
       * Unknown error
       */
      else {

        setError(
          "Failed to create targeting rule."
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
              Add Targeting Rule
            </h2>

            <p>
              Define a condition for a
              feature flag.
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

          {/* Feature Flag */}

          <div className="targeting-form-group">

            <label>
              Feature Flag
            </label>

            <select
              name="flag_id"
              value={formData.flag_id}
              onChange={handleChange}
            >

              <option value="">
                Select a feature flag
              </option>

              {flags.map((flag) => (

                <option
                  key={flag.flag_id}
                  value={flag.flag_id}
                >
                  {flag.key}
                </option>

              ))}

            </select>

          </div>

          {/* Rule Type */}

          <div className="targeting-form-group">

            <label>
              Rule Type
            </label>

            <select
              value={formData.ruleType}
              onChange={
                handleRuleTypeChange
              }
            >

              <option value="attribute">
                User Attribute Targeting
              </option>

              <option value="percentage">
                Percentage Rollout
              </option>

            </select>

          </div>

          {/* Percentage Rollout */}

          {formData.ruleType ===
            "percentage" && (

            <div className="percentage-rollout-section">

              <div className="percentage-rollout-header">

                <label>
                  Rollout Percentage
                </label>

                <strong>
                  {formData.rolloutPercentage}%
                </strong>

              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={
                  formData.rolloutPercentage
                }
                onChange={
                  handlePercentageChange
                }
                className="percentage-slider"
              />

              <div className="percentage-slider-labels">

                <span>
                  0%
                </span>

                <span>
                  100%
                </span>

              </div>

              <p className="percentage-help-text">
                Control what percentage of
                users receive this feature.
              </p>

            </div>

          )}

          {/* Attribute Targeting */}

          {formData.ruleType ===
            "attribute" && (

            <>

              {/* Attribute */}

              <div className="targeting-form-group">

                <label>
                  User Attribute
                </label>

                <input
                  type="text"
                  name="attribute"
                  placeholder="e.g. country"
                  value={
                    formData.attribute
                  }
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
                  value={
                    formData.operator
                  }
                  onChange={handleChange}
                >

                  <option value="equals">
                    Equals
                  </option>

                  <option value="not_equals">
                    Not Equals
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
                  placeholder="e.g. India"
                  value={
                    formData.value
                  }
                  onChange={handleChange}
                />

              </div>

            </>

          )}

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
                ? "Creating..."
                : "Create Rule"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default AddTargetingRuleModel;