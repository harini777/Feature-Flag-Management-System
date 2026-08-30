import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);

    try {
      // Login API
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      console.log("LOGIN RESPONSE:", response.data);

      // =========================
      // SAVE TOKEN
      // =========================

      localStorage.setItem(
        "token",
        response.data.access_token
      );

      // =========================
      // SAVE COMPLETE USER
      // =========================

      const loggedInUser = {
        user_id: response.data.user.user_id,
        name: response.data.user.name,
        email: response.data.user.email,
      };

      localStorage.setItem(
        "user",
        JSON.stringify(loggedInUser)
      );

      console.log(
        "SAVED USER:",
        loggedInUser
      );

      // Go to dashboard
      navigate("/dashboard");

    } catch (err) {

      console.error(
        "LOGIN ERROR:",
        err
      );

      setError(
        err.response?.data?.detail ||
        "Invalid email or password"
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">

      {/* Background effects */}
      <div className="login-grid"></div>

      <div className="login-glow login-glow-one"></div>

      <div className="login-glow login-glow-two"></div>


      {/* Login Form */}
      <form
        className="login-form"
        onSubmit={handleSubmit}
      >

        {/* Logo */}
        <div className="login-icon">
          ⚡
        </div>


        {/* Title */}
        <h2 className="login-title">
          FeatureFlow
        </h2>


        <p className="login-subtitle">
          Sign in to manage your feature flags
        </p>


        {/* Error */}
        {error && (
          <p className="login-error">
            {error}
          </p>
        )}


        {/* =========================
            EMAIL
        ========================= */}

        <div className="input-group">

          <label htmlFor="email">
            Email
          </label>

          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            required
          />

        </div>


        {/* =========================
            PASSWORD
        ========================= */}

        <div className="input-group">

          <label htmlFor="password">
            Password
          </label>

          <div className="password-input-wrapper">

            <input
              id="password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() =>
                setShowPassword(
                  (previous) => !previous
                )
              }
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword ? "◉" : "◌"}
            </button>

          </div>

        </div>


        {/* =========================
            LOGIN BUTTON
        ========================= */}

        <button
          type="submit"
          className="login-button"
          disabled={loading}
        >
          {loading
            ? "Signing in..."
            : "Login"}
        </button>


        {/* =========================
            REGISTER
        ========================= */}

        <p className="login-footer">

          Don't have an account?{" "}

          <span
            onClick={() =>
              navigate("/register")
            }
          >
            Register
          </span>

        </p>

      </form>

    </div>
  );
}

export default Login;