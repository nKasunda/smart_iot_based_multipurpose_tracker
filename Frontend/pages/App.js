import React from "react";
import Header from "../components/Header";
import RoleCard from "../components/RoleCard";

function AppPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(15, 118, 110, 0.16), transparent 26%), linear-gradient(180deg, #eef7f3 0%, #f8fbfa 100%)",
      }}
    >
      <Header />

      <main
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "64px 24px",
          display: "grid",
          gap: "24px",
        }}
      >
        <div style={{ maxWidth: "720px" }}>
          <p
            style={{
              color: "#0f766e",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: "14px",
            }}
          >
            Workspace entry
          </p>
          <h1 style={{ fontSize: "48px", lineHeight: 1, marginBottom: "16px", color: "#112027" }}>
            Pick a role and continue into the tracker workspace.
          </h1>
          <p style={{ color: "#5f6f77", fontSize: "18px", lineHeight: 1.7 }}>
            This legacy route now mirrors the refreshed frontend direction and avoids
            client-side router dependencies during server rendering.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "20px",
          }}
        >
          <RoleCard title="Client Account" />
          <RoleCard title="Administrator Account" />
        </div>
      </main>
    </div>
  );
}

export default AppPage;
