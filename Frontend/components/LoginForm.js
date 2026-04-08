import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FaEnvelope, FaEye, FaEyeSlash, FaLock } from "react-icons/fa";

const palette = {
  primary: "#123a63",
  primaryDark: "#0d2844",
  accent: "#315980",
  border: "#c9d6e2",
  text: "#10233a",
  muted: "#5f7285",
  surface: "#f8fafc",
  danger: "#c2410c",
  success: "#166534",
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

function LoginForm({ role = "client", portalName = "Client" }) {
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();

  const registerHref = useMemo(
    () => (role === "admin" ? "/AdminSignIn" : "/ClientSignIn"),
    [role]
  );

  const getAccent = (inputName) =>
    focusedInput === inputName ? palette.primary : palette.border;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email")?.toString().trim() || "";
    const password = formData.get("password")?.toString() || "";

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to sign in.");
      }

      const userRole = result.user?.role;
      const isAdmin = userRole === "admin";
      const isClient = userRole === "user" || userRole === "client";

      if (role === "admin" && !isAdmin) {
        throw new Error("This account does not have administrator access.");
      }

      if (role === "client" && !isClient) {
        throw new Error("This account does not have client access.");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("tracker_token", result.token);
        localStorage.setItem("tracker_user", JSON.stringify(result.user));
      }

      setSuccessMessage("Login successful. Redirecting...");

      setTimeout(() => {
        router.push(isAdmin ? "/Dashboard" : "/ClientDashboard");
      }, 700);
    } catch (error) {
      console.error("Login error:", error.message);
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="formCard">
      <div className="headerBlock">
        <span className="eyebrow">{portalName}</span>
        <h2>Sign in to continue</h2>
        <p className="intro">
          Enter your email and password to access your dashboard.
        </p>
      </div>

      <div className="sectionCard">
        <div className="sectionHeader">
          <h3>Account Access</h3>
          <span>Secure sign in</span>
        </div>

        <div className="stack">
          <label htmlFor="email" className="field">
            <span>Email Address</span>
            <div className="inputWrap">
              <FaEnvelope
                className="fieldIcon"
                style={{ color: getAccent("email") }}
              />
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email address"
                onFocus={() => setFocusedInput("email")}
                onBlur={() => setFocusedInput("")}
                required
              />
            </div>
          </label>

          <label htmlFor="password" className="field">
            <span>Password</span>
            <div className="inputWrap">
              <FaLock
                className="fieldIcon"
                style={{ color: getAccent("password") }}
              />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                onFocus={() => setFocusedInput("password")}
                onBlur={() => setFocusedInput("")}
                required
              />
              <button
                type="button"
                className="toggleButton"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </label>
        </div>
      </div>

      {errorMessage ? <p className="message error">{errorMessage}</p> : null}
      {successMessage ? (
        <p className="message success">{successMessage}</p>
      ) : null}

      <button type="submit" className="submitButton" disabled={loading}>
        {loading ? <span className="spinner" /> : "Sign In"}
      </button>

      <div className="footerRow">
        <span>Need an account?</span>
        <Link href={registerHref} className="footerLink">
          Create one here
        </Link>
      </div>

      <style jsx>{`
        .formCard {
          width: min(100%, 520px);
          padding: 32px;
          border-radius: 28px;
          background: linear-gradient(
            180deg,
            rgba(248, 250, 252, 0.97) 0%,
            rgba(241, 246, 251, 0.94) 100%
          );
          color: ${palette.text};
          box-shadow: 0 26px 60px rgba(3, 12, 24, 0.24);
          border: 1px solid rgba(255, 255, 255, 0.45);
          backdrop-filter: blur(12px);
          font-family: "Roboto", sans-serif;
        }

        .headerBlock {
          margin-bottom: 24px;
        }

        .eyebrow {
          display: inline-block;
          margin-bottom: 12px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(18, 58, 99, 0.08);
          border: 1px solid rgba(49, 89, 128, 0.18);
          color: ${palette.accent};
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        h2 {
          margin: 0;
          font-size: clamp(1.9rem, 3vw, 2.5rem);
          line-height: 1.15;
        }

        .intro {
          margin: 12px 0 0;
          color: ${palette.muted};
          line-height: 1.7;
          font-size: 0.98rem;
        }

        .sectionCard {
          padding: 22px;
          margin-top: 18px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.62);
          border: 1px solid rgba(201, 214, 226, 0.9);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
        }

        .sectionHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .sectionHeader h3 {
          margin: 0;
          font-size: 1rem;
        }

        .sectionHeader span {
          color: ${palette.muted};
          font-size: 0.82rem;
          font-weight: 600;
        }

        .stack {
          display: grid;
          gap: 18px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          color: ${palette.text};
          font-size: 0.95rem;
          font-weight: 600;
        }

        .inputWrap {
          position: relative;
        }

        .fieldIcon {
          position: absolute;
          top: 50%;
          left: 16px;
          transform: translateY(-50%);
          pointer-events: none;
        }

        input {
          width: 100%;
          min-height: 54px;
          padding: 14px 46px 14px 46px;
          border-radius: 16px;
          border: 1px solid ${palette.border};
          background: ${palette.surface};
          color: ${palette.text};
          font-size: 0.96rem;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease,
            transform 0.2s ease;
        }

        input:focus {
          border-color: ${palette.primary};
          box-shadow: 0 0 0 4px rgba(18, 58, 99, 0.12);
          transform: translateY(-1px);
        }

        input::placeholder {
          color: #8a9aad;
        }

        .toggleButton {
          position: absolute;
          top: 50%;
          right: 14px;
          transform: translateY(-50%);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: ${palette.accent};
          cursor: pointer;
          font-size: 1rem;
        }

        .message {
          margin: 18px 0 0;
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 0.92rem;
          font-weight: 500;
        }

        .error {
          background: rgba(194, 65, 12, 0.1);
          color: ${palette.danger};
        }

        .success {
          background: rgba(22, 101, 52, 0.11);
          color: ${palette.success};
        }

        .submitButton {
          width: 100%;
          min-height: 54px;
          margin-top: 24px;
          border: none;
          border-radius: 16px;
          background: linear-gradient(
            135deg,
            ${palette.primary} 0%,
            ${palette.primaryDark} 100%
          );
          color: #ffffff;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 16px 30px rgba(18, 58, 99, 0.24);
          transition: transform 0.2s ease, box-shadow 0.2s ease,
            opacity 0.2s ease;
        }

        .submitButton:hover {
          transform: translateY(-1px);
          box-shadow: 0 20px 36px rgba(18, 58, 99, 0.3);
        }

        .submitButton:disabled {
          cursor: wait;
          opacity: 0.85;
          transform: none;
        }

        .spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 3px solid rgba(255, 255, 255, 0.45);
          border-top-color: #ffffff;
          animation: spin 0.8s linear infinite;
        }

        .footerRow {
          margin-top: 18px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          color: ${palette.muted};
          font-size: 0.92rem;
        }

        .footerLink {
          color: ${palette.primary};
          font-weight: 700;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 640px) {
          .formCard {
            padding: 24px 20px;
            border-radius: 22px;
          }

          .sectionCard {
            padding: 18px 16px;
            border-radius: 18px;
          }

          .sectionHeader {
            flex-direction: column;
            margin-bottom: 14px;
          }

          .footerRow {
            flex-direction: column;
          }
        }
      `}</style>
    </form>
  );
}

export default LoginForm;
