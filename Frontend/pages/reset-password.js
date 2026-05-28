import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FaArrowLeft, FaEye, FaEyeSlash, FaLock } from "react-icons/fa";
import { resetPassword } from "../lib/api";
import { friendlyError } from "../lib/errors";

export default function ResetPasswordPage() {
  const router = useRouter();
  const token = typeof router.query.token === "string" ? router.query.token : "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (!token) {
      setError("This reset link is missing a token. Request a new password reset email.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Use a new password with at least 8 characters.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match. Re-enter them and try again.");
      setLoading(false);
      return;
    }

    try {
      const res = await resetPassword(token, password);
      setMessage(res?.message || "Password reset. You can now sign in with your new password.");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(friendlyError(err, "Could not reset your password. Request a new reset email and try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundImage: "url('images/bg1.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'Roboto', sans-serif",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: "white",
          padding: "clamp(22px, 6vw, 40px)",
          borderRadius: "15px",
          width: "min(420px, calc(100vw - 32px))",
          boxShadow: "0 6px 12px rgba(0,0,0,0.5)",
          color: "black",
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "#000080",
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 22,
          }}
        >
          <FaArrowLeft size={12} />
          Back to sign in
        </Link>

        <h1 style={{ margin: "0 0 10px", textAlign: "center", fontWeight: 800, fontSize: 24 }}>
          Choose a new password
        </h1>

        <p style={{ margin: "0 0 24px", color: "#4b5563", textAlign: "center", fontSize: 14, lineHeight: 1.6 }}>
          Enter a new password for your TrackA account. Reset links expire after 1 hour.
        </p>

        {message ? (
          <div style={noticeSuccess}>
            {message}
            <div style={{ marginTop: 8 }}>
              <Link href="/" style={{ color: "#000080", fontWeight: 800 }}>
                Go to sign in
              </Link>
            </div>
          </div>
        ) : null}

        {error ? <div style={noticeError}>{error}</div> : null}

        <PasswordField
          id="new-password"
          label="New Password"
          value={password}
          show={showPassword}
          onChange={setPassword}
          onToggle={() => setShowPassword((v) => !v)}
        />

        <PasswordField
          id="confirm-new-password"
          label="Confirm New Password"
          value={confirmPassword}
          show={showPassword}
          onChange={setConfirmPassword}
          onToggle={() => setShowPassword((v) => !v)}
        />

        <button type="submit" className="reset-button" disabled={loading || !!message}>
          {loading ? "Saving..." : "Reset Password"}
        </button>

        <style jsx>{`
          .reset-button {
            width: 100%;
            padding: 12px;
            background-color: #000080;
            border: none;
            border-radius: 8px;
            color: white;
            cursor: pointer;
            font-weight: 700;
            height: 45px;
            font-size: 15px;
            transition: all 0.3s ease;
          }

          .reset-button:disabled {
            cursor: not-allowed;
            opacity: 0.78;
          }
        `}</style>
      </form>
    </div>
  );
}

function PasswordField({ id, label, value, show, onChange, onToggle }) {
  return (
    <div style={{ width: "100%", marginBottom: 18 }}>
      <label htmlFor={id} style={{ color: "black", fontWeight: 600, marginBottom: 8, display: "block", fontSize: 15 }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <FaLock style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "gray" }} />
        <input
          id={id}
          className="auth-input"
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={label}
          required
          style={{
            width: "100%",
            padding: "12px 40px",
            borderRadius: 8,
            border: "2px solid gray",
            backgroundColor: "white",
            color: "black",
            outline: "none",
            height: 45,
            boxSizing: "border-box",
            fontSize: 14,
          }}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            border: "none",
            background: "transparent",
            color: "gray",
            cursor: "pointer",
            padding: 4,
          }}
        >
          {show ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>
    </div>
  );
}

const noticeSuccess = {
  marginBottom: 18,
  padding: "11px 12px",
  borderRadius: 10,
  background: "rgba(22,163,74,0.1)",
  border: "1px solid rgba(22,163,74,0.24)",
  color: "#14532d",
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.5,
};

const noticeError = {
  marginBottom: 18,
  padding: "11px 12px",
  borderRadius: 10,
  background: "rgba(220,38,38,0.1)",
  border: "1px solid rgba(220,38,38,0.2)",
  color: "#7f1d1d",
  fontSize: 13,
  fontWeight: 700,
};
