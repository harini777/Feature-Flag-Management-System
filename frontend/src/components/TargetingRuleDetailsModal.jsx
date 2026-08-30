import "./TargetingRuleDetailsModal.css";

function TargetingRuleDetailsModal({
  rule,
  flagName,
  onClose,
}) {
  return (
    <div className="targeting-modal-overlay">

      <div className="targeting-modal">

        {/* Header */}
        <div className="targeting-modal-header">

          <div>
            <h2>Targeting Rule Details</h2>

            <p>
              View the configuration of this targeting rule.
            </p>
          </div>

          <button
            className="targeting-modal-close"
            onClick={onClose}
          >
            ×
          </button>

        </div>

        {/* Content */}
        <div className="targeting-modal-content">

          {/* Flag */}
          <div className="targeting-modal-item">
            <span>Feature Flag</span>

            <strong>
              {flagName}
            </strong>
          </div>

          {/* Rule ID */}
          <div className="targeting-modal-item">
            <span>Rule ID</span>

            <strong>
              #{rule.rule_id}
            </strong>
          </div>

          {/* Attribute */}
          <div className="targeting-modal-item">
            <span>Attribute</span>

            <strong>
              {rule.attribute}
            </strong>
          </div>

          {/* Operator */}
          <div className="targeting-modal-item">
            <span>Operator</span>

            <strong>
              {rule.operator}
            </strong>
          </div>

          {/* Value */}
          <div className="targeting-modal-item">
            <span>Value</span>

            <strong>
              {rule.value}
            </strong>
          </div>

          {/* Status */}
          <div className="targeting-modal-item">
            <span>Status</span>

            <strong className="targeting-modal-active">
              <span className="status-dot"></span>
              Active
            </strong>
          </div>

        </div>

        {/* Footer */}
        <div className="targeting-modal-footer">

          <button
            className="targeting-modal-done"
            onClick={onClose}
          >
            Close
          </button>

        </div>

      </div>

    </div>
  );
}

export default TargetingRuleDetailsModal;