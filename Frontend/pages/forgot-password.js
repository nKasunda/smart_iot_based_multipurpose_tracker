import React from "react";
import Link from "next/link";
import { FaArrowLeft, FaEnvelope } from "react-icons/fa";

const ADMIN_EMAIL = "kasundanelson@gmail.com";

export default function ForgotPasswordPage() {
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
      <section
        style={{
          backgroundColor: "white",
          padding: "40px",
          borderRadius: "15px",
          width: "min(100%, 420px)",
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

        <div style={{ color: "#000080", fontSize: 38, textAlign: "center", marginBottom: 14 }}>
          <FaEnvelope />
        </div>

        <h1
          style={{
            margin: "0 0 10px",
            color: "black",
            textAlign: "center",
            fontWeight: 800,
            fontSize: 24,
          }}
        >
          Account assistance
        </h1>

        <p
          style={{
            margin: "0 0 22px",
            color: "#4b5563",
            textAlign: "center",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          Password resets and new account access are handled by the administrator.
        </p>

        <a
          href={`mailto:${ADMIN_EMAIL}`}
          style={{
            width: "100%",
            height: 45,
            borderRadius: 8,
            background: "#000080",
            color: "white",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
            fontWeight: 800,
          }}
        >
          Contact {ADMIN_EMAIL}
        </a>
      </section>
    </div>
  );
}
