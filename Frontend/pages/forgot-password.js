import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FaArrowLeft, FaEnvelope } from "react-icons/fa";
import { forgotPassword } from "../lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const initialEmail = typeof router.query.email === "string" ? router.query.email : "";
  const [email, setEmail] = useState(initialEmail);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await forgotPassword(email);
      setMessage(res?.message || "If an account exists for that email, reset instructions will be sent.");
    } catch (err) {
      setError(err?.response?.data?.error || "Unable to process reset request right now.");
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
          padding: "40px",
          borderRadius: "15px",
          width: "min(100%, 420px)",
          boxShadow: "0 6px 12px rgba(0,0,0,0.5)",
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

        <h1
          style={{
            margin: "0 0 10px",
            color: "black",
            textAlign: "center",
            fontWeight: 800,
            fontSize: 24,
          }}
        >
          Reset your password
        </h1>

        <p
          style={{
            margin: "0 0 28px",
            color: "#4b5563",
            textAlign: "center",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          Enter the email address linked to your TrackA account.
        </p>

        {message ? (
          <div
            style={{
              marginBottom: 18,
              padding: "11px 12px",
              borderRadius: 10,
              background: "rgba(22,163,74,0.1)",
              border: "1px solid rgba(22,163,74,0.24)",
              color: "#14532d",
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
        ) : null}

        {error ? (
          <div
            style={{
              marginBottom: 18,
              padding: "11px 12px",
              borderRadius: 10,
              background: "rgba(220,38,38,0.1)",
              border: "1px solid rgba(220,38,38,0.2)",
              color: "#7f1d1d",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ width: "100%", marginBottom: 24 }}>
          <label
            htmlFor="reset-email"
            style={{
              color: "black",
              fontWeight: 600,
              marginBottom: 8,
              display: "block",
              textAlign: "left",
              fontSize: 15,
            }}
          >
            Email Address
          </label>
          <div style={{ position: "relative" }}>
            <FaEnvelope
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: focused ? "#000080" : "gray",
                pointerEvents: "none",
              }}
            />
            <input
              id="reset-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Enter your email"
              required
              style={{
                width: "100%",
                padding: "12px 10px 12px 40px",
                borderRadius: 8,
                border: `2px solid ${focused ? "#000080" : "gray"}`,
                backgroundColor: "white",
                color: "black",
                outline: "none",
                height: 45,
                boxSizing: "border-box",
                fontWeight: 400,
                fontSize: 14,
              }}
            />
          </div>
        </div>

        <button type="submit" className="reset-button" disabled={loading}>
          {loading ? <span className="spinner" /> : "Send Reset Instructions"}
        </button>

        <p
          style={{
            margin: "18px 0 0",
            color: "#4b5563",
            textAlign: "center",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          Remembered your password?{" "}
          <Link href="/" style={{ color: "#000080", fontWeight: 700, textDecoration: "none" }}>
            Sign in
          </Link>
        </p>

        <style jsx>{`
          input::placeholder {
            color: gray;
            opacity: 1;
          }

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
            box-shadow: 0 4px 8px rgba(0, 123, 255, 0.2);
          }

          .reset-button:hover {
            transform: scale(1.03);
            background-color: #000080;
            box-shadow: 0 6px 14px rgba(0, 123, 255, 0.4);
          }

          .reset-button:active {
            transform: scale(0.97);
          }

          .reset-button:disabled {
            cursor: not-allowed;
            transform: none;
            opacity: 0.82;
          }

          .spinner {
            border: 3px solid white;
            border-top: 3px solid transparent;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            margin: 0 auto;
            display: block;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </form>
    </div>
  );
}
