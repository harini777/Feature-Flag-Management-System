import "./EnvironmentDetailsModal.css";

function EnvironmentDetailsModal({ environment, onClose }) {
  if (!environment) {
    return null;
  }

  return (
    <div
      className="environment-modal-overlay"
      onClick={onClose}
    >
      <div
        className="environment-modal"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="environment-modal-header">

          <div>
            <h2>Environment Details</h2>

            <p>
              View information about this environment
            </p>
          </div>

          <button
            className="environment-modal-x"
            onClick={onClose}
          >
            ×
          </button>

        </div>


        {/* Body */}
        <div className="environment-modal-body">

          {/* Environment Name */}
          <div className="environment-detail-box">

            <span className="environment-detail-label">
              Environment Name
            </span>

            <strong>
              {environment.name}
            </strong>

          </div>


          {/* Environment ID */}
          <div className="environment-detail-box">

            <span className="environment-detail-label">
              Environment ID
            </span>

            <strong>
              #{environment.environment_id}
            </strong>

          </div>


          {/* Description */}
          <div className="environment-detail-box">

            <span className="environment-detail-label">
              Description
            </span>

            <strong>
              {environment.description ||
                "No description provided."}
            </strong>

          </div>


          {/* Status */}
          <div className="environment-detail-box">

            <span className="environment-detail-label">
              Status
            </span>

            <strong className="environment-status">
              <span className="environment-status-dot"></span>
              Active
            </strong>

          </div>

        </div>


        {/* Footer */}
        <div className="environment-modal-footer">

          <button
            className="environment-modal-close-button"
            onClick={onClose}
          >
            Close
          </button>

        </div>

      </div>
    </div>
  );
}

export default EnvironmentDetailsModal;