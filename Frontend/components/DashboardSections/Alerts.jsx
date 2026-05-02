import React from "react";

export default function Alerts({ alerts, onRefresh }) {
  const low = alerts?.lowBatteryDevices || [];
  const inactive = alerts?.inactiveDevices || [];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        fontFamily: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
        {/* Low Battery Alert */}
        <div
          style={{
            borderRadius: 16,
            overflow: "hidden",
            background: "#ffffff",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          }}
        >
          <div
            style={{
              padding: 16,
              borderBottom: "1px solid #e5e7eb",
              background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
              fontWeight: 700,
              fontSize: 14,
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Low Battery ({low.length})
          </div>
          <div
            style={{
              maxHeight: "calc(100vh - 200px)",
              overflowY: "auto",
            }}
          >
            {low.length === 0 ? (
              <div style={{ padding: 16, color: "#6b7280", fontSize: 13 }}>All devices have sufficient battery</div>
            ) : null}
            {low.map((d) => (
              <div
                key={d.device_uid}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  margin: "10px 16px",
                  fontSize: 13,
                }}
              >
                <span style={{ fontWeight: 600, color: "#020617" }}>{d.device_uid}</span>
                <span style={{ fontWeight: 800, color: "#dc2626" }}>{d.battery ?? "—"}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Inactive Devices Alert */}
        <div
          style={{
            borderRadius: 16,
            overflow: "hidden",
            background: "#ffffff",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          }}
        >
          <div
            style={{
              padding: 16,
              borderBottom: "1px solid #e5e7eb",
              background: "linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)",
              fontWeight: 700,
              fontSize: 14,
              color: "#ea580c",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Inactive Devices ({inactive.length})
          </div>
          <div
            style={{
              maxHeight: "calc(100vh - 200px)",
              overflowY: "auto",
            }}
          >
            {inactive.length === 0 ? (
              <div style={{ padding: 16, color: "#6b7280", fontSize: 13 }}>All devices are reporting normally</div>
            ) : null}
            {inactive.map((d) => (
              <div
                key={d.device_uid}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #fed7aa",
                  background: "#fef3f2",
                  margin: "10px 16px",
                  fontSize: 13,
                }}
              >
                <span style={{ fontWeight: 600, color: "#020617" }}>{d.device_uid}</span>
                <span style={{ color: "#64748b" }}>
                  {d.lastSeen ? new Date(d.lastSeen).toLocaleString() : "Never reported"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

