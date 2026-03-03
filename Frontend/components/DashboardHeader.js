import React, { useEffect, useState } from "react";
import { FiClock } from "react-icons/fi";

function DashboardHeader() {
  const [time, setTime] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const signalColor = "green";

  // ⛔ Prevent SSR/client mismatch
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
      {/* Left title */}
      <div>
        <h1 style={{ margin: 0, fontSize: "20px", color: "#020617" }}>
          Asset Tracking Dashboard
        </h1>
        <p style={{ margin: 0, fontSize: "14px", color: "#020617" }}>
          Realtime Monitoring
        </p>
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        {/* LIVE status */}
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
              color: "#16a34a",
            }}
          >
            LIVE
          </span>
        </div>

        {/* Time */}
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
      </div>
    </div>
  );
}

export default DashboardHeader;
