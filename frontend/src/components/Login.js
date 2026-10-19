import React, { useState } from "react";
import loginHero from "../assets/login_background.png";

// Temporary stand-in for real authentication until the backend login API exists.
const DEMO_USERNAME = "admin";
const DEMO_PASSWORD = "knowledge123";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Enter both a username and password.");
      return;
    }

    setSubmitting(true);

    // Simulated latency keeps the UX consistent with the eventual network call.
    window.setTimeout(() => {
      if (username.trim() === DEMO_USERNAME && password === DEMO_PASSWORD) {
        onLogin(username.trim());
      } else {
        setError("Invalid username or password.");
      }

      setSubmitting(false);
    }, 350);
  }

  return (
    <div
      className="kb-login-shell"
      style={{ backgroundImage: `url(${loginHero})` }}
    >
      <div className="kb-login-panel">
        <div className="kb-login-brand">
          <div className="brand-mark">KB</div>

          <div>
            <strong>KnowledgeBridge</strong>
            <span>AI-powered business knowledge</span>
          </div>
        </div>

        <span className="kb-login-tag">DEMO ACCESS</span>

        <h1>Sign in</h1>

        <p>Use your workspace credentials to continue.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="login-username">
            Username
            <input
              id="login-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin"
              autoComplete="username"
              autoFocus
            />
          </label>

          <label htmlFor="login-password">
            Password
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          {error && <div className="alert error">{error}</div>}

          <button
            className="primary-button kb-login-submit"
            type="submit"
            disabled={submitting}
          >
            {submitting ? <span className="spinner" aria-label="Signing in" /> : "Sign in"}
          </button>
        </form>

        <div className="kb-login-hint">
          Demo credentials: <code>{DEMO_USERNAME}</code> / <code>{DEMO_PASSWORD}</code>
        </div>
      </div>
    </div>
  );
}

export default Login;
