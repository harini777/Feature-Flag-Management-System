import "./FlagDetailsModal.css";

function FlagDetailsModal({ flag, environmentName, onClose }) {
  // If no flag is selected, don't display the modal.
  if (!flag) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>

      {/* Prevent clicking inside the popup from closing it */}
      <div
        className="flag-details-modal"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Modal Header */}
        <div className="modal-header">

          <div>
            <span className="modal-label">
              FEATURE FLAG
            </span>

            <h2>
              {flag.key}
            </h2>
          </div>

          {/* Close Button */}
          <button
            className="modal-close"
            onClick={onClose}
          >
            ×
          </button>

        </div>

        {/* Description */}
        <div className="modal-section">

          <h3>Description</h3>

          <p>
            {flag.description || "No description provided."}
          </p>

        </div>

        {/* Status */}
        <div className="modal-section">

          <h3>Status</h3>

          <span
            className={
              flag.enabled
                ? "modal-status enabled"
                : "modal-status disabled"
            }
          >
            <span className="modal-status-dot"></span>

            {flag.enabled ? "Enabled" : "Disabled"}
          </span>

        </div>

        {/* Flag Information */}
        <div className="modal-section">

          <h3>Flag Information</h3>

          <div className="details-grid">

            <div className="detail-item">
              <span>Flag ID</span>
              <strong>
                #{flag.flag_id}
              </strong>
            </div>

            <div className="detail-item">
              <span>Type</span>
              <strong>
                {flag.type}
              </strong>
            </div>

            <div className="detail-item">
              <span>Environment</span>
              <strong>
                {environmentName || "Unknown"}
              </strong>
            </div>

            <div className="detail-item">
              <span>Owner Team</span>
              <strong>
                {flag.owner_team || "—"}
              </strong>
            </div>

            <div className="detail-item">
              <span>Default Value</span>
              <strong>
                {String(flag.default_value)}
              </strong>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="modal-footer">

          <button
            className="modal-close-button"
            onClick={onClose}
          >
            Close
          </button>

        </div>

      </div>

    </div>
  );
}

export default FlagDetailsModal;