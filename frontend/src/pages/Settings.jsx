import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../api";
import "./settings.css";

function Settings() {
  const navigate = useNavigate();

  /* =========================
     USER
  ========================= */

  const [user, setUser] = useState({
    name: "",
    email: "",
  });

  /* =========================
     APPEARANCE
     DEFAULT = DARK
  ========================= */

  const [appearance, setAppearance] = useState(
    localStorage.getItem("appearance") || "dark"
  );

  /* =========================
     DEFAULT ENVIRONMENT
  ========================= */

  const [environment, setEnvironment] = useState(
    localStorage.getItem("defaultEnvironment") || "Development"
  );

  /* =========================
     FLAG NOTIFICATIONS
  ========================= */

  const [flagNotifications, setFlagNotifications] =
    useState(true);

  const [notificationLoading, setNotificationLoading] =
    useState(true);

  /* =========================
     PASSWORD MODAL
  ========================= */

  const [showPasswordModal, setShowPasswordModal] =
    useState(false);

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [passwordError, setPasswordError] =
    useState("");

  const [passwordSuccess, setPasswordSuccess] =
    useState("");

  const [passwordLoading, setPasswordLoading] =
    useState(false);

  /* =========================
     LOAD USER
  ========================= */

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) return;

    try {
      const parsedUser = JSON.parse(savedUser);

      setUser({
        name: parsedUser.name || "",
        email: parsedUser.email || "",
      });
    } catch (error) {
      console.error(
        "Unable to read saved user:",
        error
      );
    }
  }, []);

  /* =========================
     LOAD FLAG NOTIFICATION
     PREFERENCE FROM BACKEND
  ========================= */

  useEffect(() => {
    const loadNotificationPreferences = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          console.error(
            "No authentication token found."
          );
          setNotificationLoading(false);
          return;
        }

        const response = await api.get(
          "/notifications/preferences",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        /*
         * Only use flag_changes.
         * Audit notifications are no longer used.
         */

        setFlagNotifications(
          response.data.flag_changes !== false
        );

        /*
         * Keep localStorage synchronized.
         * This is important because Flags.jsx
         * reads this value before showing a popup.
         */

        localStorage.setItem(
          "flagNotifications",
          String(response.data.flag_changes !== false)
        );

      } catch (error) {
        console.error(
          "NOTIFICATION PREFERENCES ERROR:",
          error
        );
      } finally {
        setNotificationLoading(false);
      }
    };

    loadNotificationPreferences();
  }, []);

  /* =========================
     APPLY APPEARANCE
  ========================= */

  useEffect(() => {
    const root = document.documentElement;

    localStorage.setItem(
      "appearance",
      appearance
    );

    /* SYSTEM THEME */

    if (appearance === "system") {
      const mediaQuery = window.matchMedia(
        "(prefers-color-scheme: dark)"
      );

      const applySystemTheme = () => {
        root.setAttribute(
          "data-theme",
          mediaQuery.matches
            ? "dark"
            : "light"
        );
      };

      applySystemTheme();

      mediaQuery.addEventListener(
        "change",
        applySystemTheme
      );

      return () => {
        mediaQuery.removeEventListener(
          "change",
          applySystemTheme
        );
      };
    }

    /* DARK / LIGHT */

    root.setAttribute(
      "data-theme",
      appearance
    );
  }, [appearance]);

  /* =========================
     APPEARANCE CHANGE
  ========================= */

  const handleAppearanceChange = (value) => {
    setAppearance(value);
  };

  /* =========================
     ENVIRONMENT CHANGE
  ========================= */

  const handleEnvironmentChange = (e) => {
    const value = e.target.value;

    setEnvironment(value);

    localStorage.setItem(
      "defaultEnvironment",
      value
    );
  };

  /* =========================
     FLAG NOTIFICATIONS
  ========================= */

  const handleFlagNotification = async () => {
    const newValue = !flagNotifications;

    /*
     * Update UI immediately
     */

    setFlagNotifications(newValue);

    /*
     * IMPORTANT:
     * Update localStorage immediately.
     *
     * Flags.jsx checks this value before
     * displaying the notification popup.
     */

    localStorage.setItem(
      "flagNotifications",
      String(newValue)
    );

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Authentication token not found."
        );
      }

      const response = await api.put(
        "/notifications/preferences",
        {
          /*
           * Only flag_changes is relevant.
           *
           * If your backend currently requires
           * audit_activity, we keep its existing
           * value without displaying/managing it
           * in the UI.
           */
          flag_changes: newValue,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const savedValue =
        response.data.flag_changes !== false;

      /*
       * Sync UI with backend
       */

      setFlagNotifications(savedValue);

      /*
       * Sync localStorage with backend
       */

      localStorage.setItem(
        "flagNotifications",
        String(savedValue)
      );

    } catch (error) {
      console.error(
        "FLAG NOTIFICATION UPDATE ERROR:",
        error
      );

      /*
       * Revert UI
       */

      setFlagNotifications(
        !newValue
      );

      /*
       * Revert localStorage
       */

      localStorage.setItem(
        "flagNotifications",
        String(!newValue)
      );
    }
  };

  /* =========================
     OPEN PASSWORD MODAL
  ========================= */

  const openPasswordModal = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);

    setPasswordError("");
    setPasswordSuccess("");

    setShowPasswordModal(true);
  };

  /* =========================
     CLOSE PASSWORD MODAL
  ========================= */

  const closePasswordModal = () => {
    if (passwordLoading) return;

    setShowPasswordModal(false);

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    setPasswordError("");
    setPasswordSuccess("");
  };

  /* =========================
     CHANGE PASSWORD
  ========================= */

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      setPasswordError(
        "Please fill in all password fields."
      );
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(
        "New password must contain at least 6 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        "New passwords do not match."
      );
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError(
        "New password must be different from current password."
      );
      return;
    }

    setPasswordLoading(true);

    try {
      const token = localStorage.getItem("token");

      await api.put(
        "/auth/change-password",
        {
          current_password: currentPassword,
          new_password: newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setPasswordSuccess(
        "Password changed successfully."
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);

    } catch (error) {
      console.error(
        "PASSWORD CHANGE ERROR:",
        error
      );

      setPasswordError(
        error.response?.data?.detail ||
          "Unable to change password."
      );

    } finally {
      setPasswordLoading(false);
    }
  };

  /* =========================
     LOGOUT
  ========================= */

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    navigate("/login");
  };

  /* =========================
     UI
  ========================= */

  return (
    <div className="settings-page">

      {/* =========================
          HEADER
      ========================= */}

      <div className="settings-header">

        <div>
          <h1>Settings</h1>

          <p>
            Manage your FeatureFlow preferences
          </p>
        </div>

        <Link
          to="/dashboard"
          className="back-dashboard-button"
        >
          <i className="fa-solid fa-arrow-left"></i>
          <span>Back to Dashboard</span>
        </Link>

      </div>


      {/* =========================
          PROFILE
      ========================= */}

      <section className="settings-section">

        <div className="settings-section-header">

          <div className="settings-section-icon">
            <i className="fa-solid fa-user"></i>
          </div>

          <div>
            <h2>Profile</h2>

            <p>
              Manage your personal information
            </p>
          </div>

        </div>

        <div className="profile-grid">

          <div className="profile-item">

            <span className="settings-label">
              Name
            </span>

            <span className="settings-value">
              {user.name || "Not available"}
            </span>

          </div>

          <div className="profile-item">

            <span className="settings-label">
              Email
            </span>

            <span className="settings-value">
              {user.email || "Not available"}
            </span>

          </div>

        </div>

      </section>


      {/* =========================
          DEFAULT ENVIRONMENT
      ========================= */}

      <section className="settings-section">

        <div className="settings-section-header">

          <div className="settings-section-icon">
            <i className="fa-solid fa-globe"></i>
          </div>

          <div>
            <h2>Default Environment</h2>

            <p>
              Choose the environment used by default
            </p>
          </div>

        </div>

        <div className="setting-control">

          <label htmlFor="environment">
            Environment
          </label>

          <select
            id="environment"
            value={environment}
            onChange={handleEnvironmentChange}
          >
            <option value="Development">
              Development
            </option>

            <option value="Staging">
              Staging
            </option>

            <option value="Production">
              Production
            </option>
          </select>

        </div>

      </section>


      {/* =========================
          APPEARANCE
      ========================= */}

      <section className="settings-section">

        <div className="settings-section-header">

          <div className="settings-section-icon">
            <i className="fa-solid fa-palette"></i>
          </div>

          <div>
            <h2>Appearance</h2>

            <p>
              Customize how FeatureFlow looks
            </p>
          </div>

        </div>

        <div className="appearance-control">

          <span className="settings-label">
            Theme
          </span>

          <div className="appearance-options">

            <button
              type="button"
              className={
                appearance === "dark"
                  ? "appearance-option active"
                  : "appearance-option"
              }
              onClick={() =>
                handleAppearanceChange("dark")
              }
            >
              <i className="fa-solid fa-moon"></i>
              <span>Dark</span>
            </button>


            <button
              type="button"
              className={
                appearance === "light"
                  ? "appearance-option active"
                  : "appearance-option"
              }
              onClick={() =>
                handleAppearanceChange("light")
              }
            >
              <i className="fa-solid fa-sun"></i>
              <span>Light</span>
            </button>


            <button
              type="button"
              className={
                appearance === "system"
                  ? "appearance-option active"
                  : "appearance-option"
              }
              onClick={() =>
                handleAppearanceChange("system")
              }
            >
              <i className="fa-solid fa-desktop"></i>
              <span>System</span>
            </button>

          </div>

        </div>

      </section>


      {/* =========================
          NOTIFICATIONS
      ========================= */}

      <section className="settings-section">

        <div className="settings-section-header">

          <div className="settings-section-icon">
            <i className="fa-solid fa-bell"></i>
          </div>

          <div>
            <h2>Notifications</h2>

            <p>
              Manage your notification preferences
            </p>
          </div>

        </div>


        {/* ONLY FLAG CHANGES */}

        <div className="notification-row">

          <div className="notification-info">

            <strong>
              Flag changes
            </strong>

            <p>
              Get notified when feature flags
              are modified
            </p>

          </div>

          <button
            type="button"
            className={
              flagNotifications
                ? "toggle active"
                : "toggle"
            }
            onClick={handleFlagNotification}
            disabled={notificationLoading}
            aria-label={
              flagNotifications
                ? "Disable flag change notifications"
                : "Enable flag change notifications"
            }
          >
            <span></span>
          </button>

        </div>

      </section>


      {/* =========================
          SECURITY
      ========================= */}

      <section className="settings-section">

        <div className="settings-section-header">

          <div className="settings-section-icon">
            <i className="fa-solid fa-shield-halved"></i>
          </div>

          <div>
            <h2>Security</h2>

            <p>
              Manage your account security
            </p>
          </div>

        </div>


        {/* PASSWORD */}

        <div className="security-row">

          <div>
            <strong>
              Password
            </strong>

            <p>
              Update your account password
            </p>
          </div>

          <button
            type="button"
            className="security-button"
            onClick={openPasswordModal}
          >
            <i className="fa-solid fa-key"></i>
            <span>Change Password</span>
          </button>

        </div>


        {/* LOGOUT */}

        <div className="security-row">

          <div>
            <strong>
              Session
            </strong>

            <p>
              Sign out from your current session
            </p>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            <i className="fa-solid fa-right-from-bracket"></i>
            <span>Logout</span>
          </button>

        </div>

      </section>


      {/* =========================
          CHANGE PASSWORD MODAL
      ========================= */}

      {showPasswordModal && (

        <div
          className="password-modal-overlay"
          onClick={closePasswordModal}
        >

          <div
            className="password-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="password-modal-header">

              <div>

                <h2>
                  Change Password
                </h2>

                <p>
                  Update your account password
                </p>

              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closePasswordModal}
                aria-label="Close"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>

            </div>


            {/* CURRENT PASSWORD */}

            <div className="password-field">

              <label htmlFor="current-password">
                Current Password
              </label>

              <div className="password-modal-input">

                <input
                  id="current-password"
                  type={
                    showCurrentPassword
                      ? "text"
                      : "password"
                  }
                  value={currentPassword}
                  onChange={(e) =>
                    setCurrentPassword(
                      e.target.value
                    )
                  }
                  placeholder="Enter current password"
                />

                <button
                  type="button"
                  className="password-eye-button"
                  onClick={() =>
                    setShowCurrentPassword(
                      (previous) => !previous
                    )
                  }
                  aria-label={
                    showCurrentPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  <i
                    className={
                      showCurrentPassword
                        ? "fa-solid fa-eye-slash"
                        : "fa-solid fa-eye"
                    }
                  ></i>
                </button>

              </div>

            </div>


            {/* NEW PASSWORD */}

            <div className="password-field">

              <label htmlFor="new-password">
                New Password
              </label>

              <div className="password-modal-input">

                <input
                  id="new-password"
                  type={
                    showNewPassword
                      ? "text"
                      : "password"
                  }
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(
                      e.target.value
                    )
                  }
                  placeholder="Enter new password"
                />

                <button
                  type="button"
                  className="password-eye-button"
                  onClick={() =>
                    setShowNewPassword(
                      (previous) => !previous
                    )
                  }
                  aria-label={
                    showNewPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  <i
                    className={
                      showNewPassword
                        ? "fa-solid fa-eye-slash"
                        : "fa-solid fa-eye"
                    }
                  ></i>
                </button>

              </div>

            </div>


            {/* CONFIRM PASSWORD */}

            <div className="password-field">

              <label htmlFor="confirm-password">
                Confirm New Password
              </label>

              <div className="password-modal-input">

                <input
                  id="confirm-password"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  placeholder="Confirm new password"
                />

                <button
                  type="button"
                  className="password-eye-button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (previous) => !previous
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  <i
                    className={
                      showConfirmPassword
                        ? "fa-solid fa-eye-slash"
                        : "fa-solid fa-eye"
                    }
                  ></i>
                </button>

              </div>

            </div>


            {/* ERROR */}

            {passwordError && (

              <div className="password-error">

                <i className="fa-solid fa-circle-exclamation"></i>

                <span>
                  {passwordError}
                </span>

              </div>

            )}


            {/* SUCCESS */}

            {passwordSuccess && (

              <div className="password-success">

                <i className="fa-solid fa-circle-check"></i>

                <span>
                  {passwordSuccess}
                </span>

              </div>

            )}


            {/* ACTIONS */}

            <div className="password-modal-actions">

              <button
                type="button"
                className="modal-cancel"
                onClick={closePasswordModal}
                disabled={passwordLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-update"
                onClick={handleChangePassword}
                disabled={passwordLoading}
              >

                <i className="fa-solid fa-lock"></i>

                <span>
                  {passwordLoading
                    ? "Updating..."
                    : "Update Password"}
                </span>

              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default Settings;