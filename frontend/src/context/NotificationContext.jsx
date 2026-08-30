import { createContext, useContext, useState } from "react";
import "./notification.css";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification, type = "info") => {
    const id = Date.now();

    // Support both:
    // addNotification("message", "success")
    // addNotification({ title, message, type })
    let notificationData;

    if (typeof notification === "object") {
      notificationData = {
        title: notification.title || "Notification",
        message: notification.message || "",
        type: notification.type || "info",
      };
    } else {
      notificationData = {
        title: "Notification",
        message: notification,
        type,
      };
    }

    setNotifications((previous) => [
      ...previous,
      {
        id,
        ...notificationData,
      },
    ]);

    // Remove automatically after 4 seconds
    setTimeout(() => {
      setNotifications((previous) =>
        previous.filter(
          (item) => item.id !== id
        )
      );
    }, 4000);
  };

  const removeNotification = (id) => {
    setNotifications((previous) =>
      previous.filter(
        (notification) => notification.id !== id
      )
    );
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
      }}
    >
      {children}

      <div className="notification-container">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification-popup ${notification.type}`}
          >
            <div className="notification-icon">
              🔔
            </div>

            <div className="notification-content">
              <strong>
                {notification.title}
              </strong>

              <p>
                {notification.message}
              </p>
            </div>

            <button
              type="button"
              className="notification-close"
              onClick={() =>
                removeNotification(notification.id)
              }
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}