import React from "react";
import { FiArrowRight } from "react-icons/fi";

function RoleCard({ title }) {
  return (
    <article
      style={{
        minWidth: "260px",
        padding: "24px",
        borderRadius: "24px",
        background: "rgba(255, 255, 255, 0.82)",
        color: "#112027",
        border: "1px solid rgba(17, 32, 39, 0.08)",
        boxShadow: "0 18px 40px rgba(15, 45, 53, 0.12)",
        backdropFilter: "blur(16px)",
      }}
    >
      <p
        style={{
          fontSize: "12px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: "#0f766e",
          marginBottom: "14px",
        }}
      >
        Access point
      </p>
      <h3 style={{ fontSize: "24px", marginBottom: "12px" }}>{title}</h3>
      <p style={{ color: "#5f6f77", lineHeight: 1.6, marginBottom: "18px" }}>
        Open the relevant sign-in flow and continue into the tracking workspace.
      </p>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          color: "#0f766e",
          fontWeight: 700,
        }}
      >
        Continue
        <FiArrowRight />
      </span>
    </article>
  );
}

export default RoleCard;
