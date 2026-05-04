import React, { useEffect, useState } from "react";
import { FiClock, FiLogOut, FiUser } from "react-icons/fi";

function getInitials(user) {
  const name = (user?.name || "").trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "";
    const second = parts[1]?.[0] || "";
    return (first + second).toUpperCase() || "U";
  }
  const email = (user?.email || "").trim();
  if (email) return email[0].toUpperCase();
  return "U";
}

function DashboardHeader({ user, onLogout, socketConnected }) {
  const [time, setTime] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const live = socketConnected !== undefined ? !!socketConnected : true;
  const signalColor = live ? "#16a34a" : "#dc2626";

  if (!mounted) return null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 24px",
        borderBottom: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 18,
            color: "#020617",
            fontWeight: 900,
            letterSpacing: "-0.01em",
            lineHeight: 1.15,
          }}
        >
          Asset Tracking Dashboard
        </h1>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              title={user.email || user.name || "Profile"}
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                letterSpacing: "0.02em",
                boxShadow: "0 10px 18px rgba(37, 99, 235, 0.22)",
                flex: "0 0 auto",
              }}
            >
              {getInitials(user)}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#020617" }}>
                {user?.name || user?.email || "Unknown User"}
              </span>
              {user?.role ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: "1px solid #e5e7eb",
                    background: "#f8fafc",
                    color: "#0f172a",
                    fontWeight: 800,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                  }}
                >
                  {String(user.role)}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 10px",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            backgroundColor: "#f9fafb",
          }}
        >
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: signalColor,
            }}
          />
          <span
            style={{
              fontSize: "12px",
              fontWeight: "600",
              color: live ? "#16a34a" : "#dc2626",
            }}
          >
            {live ? "LIVE" : "OFFLINE"}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "#6b7280",
          }}
        >
          <FiClock />
          <span>{time?.toLocaleTimeString()}</span>
        </div>

        {typeof onLogout === "function" ? (
          <button
            onClick={onLogout}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 12,
              color: "#0f172a",
              transition: "background 0.15s ease, transform 0.1s ease",
            }}
          >
            <FiLogOut />
            Sign out
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default DashboardHeader;
