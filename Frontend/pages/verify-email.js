import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FaCheckCircle, FaEnvelope, FaExclamationTriangle } from "react-icons/fa";
import { resendVerification, verifyEmail } from "../lib/api";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [resendUrl, setResendUrl] = useState("");

  useEffect(() => {
    const token = typeof router.query.token === "string" ? router.query.token : "";
    if (!router.isReady || !token) return;

    setStatus("loading");
    verifyEmail(token)
      .then((res) => {
        setStatus("success");
        setMessage(res?.message || "Email verified. You can now sign in.");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err?.response?.data?.error || "Verification failed.");
      });
  }, [router.isReady, router.query.token]);

  const handleResend = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setResendUrl("");
    try {
      const res = await resendVerification(email);
      setStatus("resent");
      setMessage(res?.message || "If that email needs verification, a new link will be sent.");
      setResendUrl(res?.verificationUrl || "");
    } catch (err) {
      setStatus("error");
      setMessage(err?.response?.data?.error || "Could not resend verification.");
    }
  };

  const isSuccess = status === "success" || status === "resent";

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
          padding: 40,
          borderRadius: 15,
          width: "min(100%, 430px)",
          boxShadow: "0 6px 12px rgba(0,0,0,0.5)",
          color: "black",
          textAlign: "center",
        }}
      >
        <div style={{ color: isSuccess ? "#16a34a" : status === "error" ? "#dc2626" : "#000080", fontSize: 42 }}>
          {isSuccess ? <FaCheckCircle /> : status === "error" ? <FaExclamationTriangle /> : <FaEnvelope />}
        </div>

        <h1 style={{ margin: "12px 0 10px", fontSize: 24, fontWeight: 800 }}>
          {isSuccess ? "Email verified" : "Verify your email"}
        </h1>

        <p style={{ color: "#4b5563", fontSize: 14, lineHeight: 1.6, margin: "0 0 22px" }}>
          {message || "Use the link sent to your email address to activate your account."}
        </p>

        {resendUrl ? (
          <p style={{ margin: "0 0 18px", fontSize: 13 }}>
            <Link href={resendUrl} style={{ color: "#000080", fontWeight: 800 }}>
              Open new verification link
            </Link>
          </p>
        ) : null}

        {status === "success" ? (
          <Link href="/" className="primary-link">
            Go to sign in
          </Link>
        ) : (
          <form onSubmit={handleResend} style={{ display: "grid", gap: 12, textAlign: "left" }}>
            <label htmlFor="verify-email" style={{ fontSize: 13, fontWeight: 700 }}>
              Resend verification email
            </label>
            <input
              id="verify-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 8,
                border: "2px solid gray",
                color: "black",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button type="submit" className="primary-button" disabled={status === "loading"}>
              {status === "loading" ? "Please wait..." : "Resend verification"}
            </button>
          </form>
        )}

        <style jsx>{`
          .primary-link,
          .primary-button {
            width: 100%;
            height: 45px;
            border-radius: 8px;
            background: #000080;
            color: white;
            border: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            font-weight: 800;
            cursor: pointer;
          }

          .primary-button:disabled {
            opacity: 0.75;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
}
