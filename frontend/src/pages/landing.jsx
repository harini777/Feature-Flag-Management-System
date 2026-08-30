import { Link } from "react-router-dom";
import "./landing.css";

function Landing() {
  return (
    <div className="landing-page">

      {/* Background effects */}
      <div className="bg-grid"></div>
      <div className="glow glow-one"></div>
      <div className="glow glow-two"></div>

      {/* =========================
          NAVIGATION
      ========================== */}
      <nav className="landing-nav">

        <div className="brand">
          <div className="brand-icon">⚡</div>
          <span>FeatureFlow</span>
        </div>

        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#about">About</a>

          <Link to="/login" className="nav-login">
            Login
          </Link>

          <Link to="/register" className="nav-register">
            Register
          </Link>
        </div>

      </nav>

      {/* =========================
          HERO SECTION
      ========================== */}
      <main className="hero-section">

        <div className="hero-content">

          <div className="hero-badge">
            <span className="status-dot"></span>
            Release Management Platform
          </div>

          <h1>
            Ship Features
            <span>With Confidence.</span>
          </h1>

          <p className="hero-description">
            Manage feature flags, control releases, target users,
            and monitor every change from one powerful platform.
          </p>

          <div className="hero-buttons">

            <Link to="/register" className="primary-btn">
              Get Started
              <span>→</span>
            </Link>

            <a href="#features" className="secondary-btn">
              Explore Features
            </a>

          </div>

          {/* Statistics */}
          <div className="hero-stats">

            <div>
              <strong>100%</strong>
              <span>Release Control</span>
            </div>

            <div className="stat-divider"></div>

            <div>
              <strong>Real-time</strong>
              <span>Flag Evaluation</span>
            </div>

            <div className="stat-divider"></div>

            <div>
              <strong>Secure</strong>
              <span>Audit Tracking</span>
            </div>

          </div>

        </div>

        {/* =========================
            RIGHT SIDE VISUAL
        ========================== */}
        <div className="hero-visual">

          <div className="visual-card main-card">

            <div className="card-header">

              <div>
                <span className="small-label">
                  FEATURE FLAG
                </span>

                <h3>New Dashboard</h3>
              </div>

              <span className="active-badge">
                ● Active
              </span>

            </div>

            <div className="rollout-section">

              <div className="rollout-header">
                <span>Production Rollout</span>
                <strong>75%</strong>
              </div>

              <div className="progress-bar">
                <div className="progress-fill"></div>
              </div>

            </div>

            <div className="environment-row">

              <div className="environment">
                <span className="env-dot production"></span>
                Production
              </div>

              <div className="environment">
                <span className="env-dot staging"></span>
                Staging
              </div>

              <div className="environment">
                <span className="env-dot development"></span>
                Development
              </div>

            </div>

          </div>

          {/* Floating audit card */}
          <div className="floating-card audit-card">

            <div className="floating-icon">
              ✓
            </div>

            <div>
              <span>Audit Log</span>
              <strong>Change Recorded</strong>
            </div>

          </div>

          {/* Floating targeting card */}
          <div className="floating-card targeting-card">

            <div className="floating-icon target-icon">
              ◎
            </div>

            <div>
              <span>Targeting</span>
              <strong>Users Selected</strong>
            </div>

          </div>

        </div>

      </main>

      {/* =========================
          FEATURES SECTION
      ========================== */}
      <section id="features" className="features-section">

        <div className="section-heading">

          <span>POWERFUL FEATURES</span>

          <h2>
            Everything you need to control releases
          </h2>

          <p>
            Build, release, monitor, and manage application
            features without redeploying your application.
          </p>

        </div>

        <div className="feature-grid">

          <div className="feature-card">

            <div className="feature-icon">
              ⚙
            </div>

            <h3>Feature Flags</h3>

            <p>
              Create and manage application features with
              simple enable and disable controls.
            </p>

          </div>

          <div className="feature-card">

            <div className="feature-icon">
              ◈
            </div>

            <h3>Targeting Rules</h3>

            <p>
              Deliver features to specific users, groups,
              or percentage-based audiences.
            </p>

          </div>

          <div className="feature-card">

            <div className="feature-icon">
              ◉
            </div>

            <h3>Environment Control</h3>

            <p>
              Manage different feature configurations across
              development, staging, and production.
            </p>

          </div>

          <div className="feature-card">

            <div className="feature-icon">
              ⌁
            </div>

            <h3>Audit Logs</h3>

            <p>
              Track every important change with complete
              actor, environment, and timestamp information.
            </p>

          </div>

        </div>

      </section>

      {/* =========================
          ABOUT SECTION
      ========================== */}
      <section id="about" className="about-section">

        <div className="about-content">

          <span className="section-tag">
            BUILT FOR MODERN RELEASES
          </span>

          <h2>
            Release faster.
            <br />
            Stay in control.
          </h2>

          <p>
            FeatureFlow provides a centralized platform for
            managing application releases and feature
            configurations. Make controlled changes without
            continuously redeploying your application.
          </p>

          <div className="about-buttons">

            <Link to="/register" className="about-btn">
              Start Managing Features →
            </Link>

          </div>

        </div>

      </section>

      {/* =========================
          FOOTER
      ========================== */}
      <footer className="landing-footer">

        <div className="brand">

          <div className="brand-icon">
            ⚡
          </div>

          <span>FeatureFlow</span>

        </div>

        <p>
          © 2026 FeatureFlow. Feature Management & Release Control.
        </p>

      </footer>

    </div>
  );
}

export default Landing;