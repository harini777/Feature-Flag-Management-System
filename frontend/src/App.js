import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Landing from "./pages/landing";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import Flags from "./pages/Flags";
import Environments from "./pages/Environments";
import Targeting from "./pages/Targeting";
import AuditLogs from "./pages/AuditLogs";
import Register from "./pages/Register";
import EvaluationAnalytics from "./pages/EvaluationAnalytics";
import Settings from "./pages/Settings";

import {
  NotificationProvider,
} from "./context/NotificationContext";

function App() {

  // =========================
  // APPLY SAVED THEME GLOBALLY
  // =========================

  useEffect(() => {

    const savedAppearance =
      localStorage.getItem("appearance") || "dark";

    const root = document.documentElement;

    if (savedAppearance === "system") {

      const systemDark =
        window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;

      root.setAttribute(
        "data-theme",
        systemDark ? "dark" : "light"
      );

    } else {

      root.setAttribute(
        "data-theme",
        savedAppearance
      );

    }

  }, []);

  return (
    <BrowserRouter>

      <NotificationProvider>

        <Routes>

          <Route
            path="/"
            element={<Landing />}
          />

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          <Route
            path="/flags"
            element={<Flags />}
          />

          <Route
            path="/environments"
            element={<Environments />}
          />

          <Route
            path="/targeting"
            element={<Targeting />}
          />

          <Route
            path="/audit-logs"
            element={<AuditLogs />}
          />

          <Route
            path="/register"
            element={<Register />}
          />

          <Route
            path="/evaluation-analytics"
            element={<EvaluationAnalytics />}
          />

          <Route
            path="/settings"
            element={<Settings />}
          />

        </Routes>

      </NotificationProvider>

    </BrowserRouter>
  );
}

export default App;