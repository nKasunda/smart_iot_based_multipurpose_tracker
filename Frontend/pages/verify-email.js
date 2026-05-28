import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FaCheckCircle, FaEnvelope, FaExclamationTriangle } from "react-icons/fa";
import { resendVerification } from "../lib/api";
import { friendlyError } from "../lib/errors";
import { useAuth } from "../context/AuthContext";

export default function VerifyEmailPage() {
  const router = useRouter();
  const auth = useAuth();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const codeReady = useMemo(() => code.replace(/\D/g, "").length === 6, [code]);

  useEffect(() => {
    if (!router.isReady) return;
    const queryEmail = typeof router.query.email === "string" ? router.query.email : "";
    const token = typeof router.query.token === "string" ? router.query.token : "";

    if (queryEmail) setEmail(queryEmail);

    if (router.query.sent === "1") {
      setMessage("Account created. Enter the 6-digit verification code sent to your email. Check spam if it is not in your inbox.");
    } else if (router.query.sent === "0") {
      setStatus("error");
      setMessage("Account created, but email delivery is not configured yet. Ask the administrator to configure SMTP, then request a new code.");
    }

    if (token) {
      setStatus("loading");
      auth.verifyEmail(token)
        .then(() => {
          setStatus("success");
          setMessage("Email verified. Opening your dashboard.");
          router.replace("/dashboard");
        })
        .catch((err) => {
          setStatus("error");
          setMessage(friendlyError(err, "Verification failed. Request a new code and try again."));
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.email, router.query.sent, router.query.token]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      await auth.verifyEmail({ email, code: code.replace(/\D/g, "") });
      setStatus("success");
      setMessage("Email verified. Opening your dashboard.");
      router.replace("/dashboard");
    } catch (err) {
      setStatus("error");
      setMessage(friendlyError(err, "The code is invalid or expired. Check the code or request a new one."));
    }
  };

  const handleResend = async () => {
    if (!email) {
      setStatus("error");
      setMessage("Enter your email address first, then request a new code.");
      return;
    }

    setStatus("loading");
    try {
      const res = await resendVerification(email);
      setCode("");
      setStatus("resent");
      setMessage(res?.message || "A new verification code has been sent. Check your inbox and spam folder.");
    } catch (err) {
      setStatus("error");
      setMessage(friendlyError(err, "Could not resend verification. Check the email address and try again."));
    }
  };

  const isSuccess = status === "success";
  const isError = status === "error";

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
        padding: 24,
        fontFamily: "'Roboto', sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "clamp(22px, 6vw, 40px)",
          borderRadius: 15,
          width: "min(100%, 430px)",
          boxShadow: "0 6px 12px rgba(0,0,0,0.5)",
          color: "black",
          textAlign: "center",
        }}
      >
        <div style={{ color: isSuccess ? "#16a34a" : isError ? "#dc2626" : "#000080", fontSize: 42 }}>
          {isSuccess ? <FaCheckCircle /> : isError ? <FaExclamationTriangle /> : <FaEnvelope />}
        </div>

        <h1 style={{ margin: "12px 0 10px", fontSize: 24, fontWeight: 800 }}>
          {isSuccess ? "Email verified" : "Enter verification code"}
        </h1>

        <p style={{ color: "#4b5563", fontSize: 14, lineHeight: 1.6, margin: "0 0 22px" }}>
          {message || "We sent a 6-digit code to your email. Enter it below to activate your account and open the dashboard."}
        </p>

        <form onSubmit={handleVerify} style={{ display: "grid", gap: 12, textAlign: "left" }}>
          <label htmlFor="verify-email" style={labelStyle}>Email Address</label>
          <input
            id="verify-email"
            className="auth-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            style={inputStyle}
          />

          <label htmlFor="verify-code" style={labelStyle}>Verification Code</label>
          <input
            id="verify-code"
            className="auth-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit code"
            required
            style={{
              ...inputStyle,
              textAlign: "center",
              letterSpacing: "0.3em",
              fontSize: 20,
              fontWeight: 800,
            }}
          />

          <button type="submit" className="primary-button" disabled={status === "loading" || !email || !codeReady}>
            {status === "loading" ? "Checking..." : "Verify and Open Dashboard"}
          </button>

          <button type="button" className="secondary-button" onClick={handleResend} disabled={status === "loading"}>
            Resend code
          </button>
        </form>

        <p style={{ margin: "18px 0 0", color: "#4b5563", fontSize: 13, lineHeight: 1.5 }}>
          Already verified?{" "}
          <Link href="/" style={{ color: "#000080", fontWeight: 800, textDecoration: "none" }}>
            Sign in
          </Link>
        </p>

        <style jsx>{`
          .primary-button,
          .secondary-button {
            width: 100%;
            height: 45px;
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            cursor: pointer;
          }

          .primary-button {
            background: #000080;
            color: white;
            border: none;
          }

          .secondary-button {
            background: #ffffff;
            color: #000080;
            border: 2px solid rgba(0, 0, 128, 0.24);
          }

          .primary-button:disabled,
          .secondary-button:disabled {
            opacity: 0.72;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
}

const labelStyle = {
  fontSize: 13,
  fontWeight: 700,
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 8,
  border: "2px solid gray",
  color: "black",
  background: "white",
  outline: "none",
  boxSizing: "border-box",
};
