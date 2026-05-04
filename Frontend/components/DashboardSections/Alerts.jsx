import React from "react";
import { FiRefreshCcw } from "react-icons/fi";

export default function Alerts({ alerts, onRefresh }) {
  const low = alerts?.lowBatteryDevices || [];
  const inactive = alerts?.inactiveDevices || [];
  const items = Array.isArray(alerts?.items)
    ? alerts.items
    : [
        ...(low || []).map((d) => ({
          type: "low_battery",
          device_uid: d.device_uid,
          imei: d.imei,
          battery: d.battery,
          lastSeen: d.lastSeen,
        })),
        ...(inactive || []).map((d) => ({
          type: "inactive",
          device_uid: d.device_uid,
          imei: d.imei,
          battery: d.battery,
          lastSeen: d.lastSeen,
        })),
      ];

  const typeLabel = (t) => {
    if (t === "low_battery") return "Low battery";
    if (t === "inactive") return "Inactive";
    return String(t || "Unknown");
  };

  const typeColor = (t) => {
    if (t === "low_battery") return { fg: "#dc2626", bg: "#fee2e2", border: "#fecaca" };
    if (t === "inactive") return { fg: "#ea580c", bg: "#ffedd5", border: "#fed7aa" };
    return { fg: "#334155", bg: "#f1f5f9", border: "#e2e8f0" };
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        fontFamily: "var(--font-sans)",
      }}
    >
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
            background: "#f9fafb",
            fontWeight: 900,
            fontSize: 14,
            color: "#020617",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span>Alerts ({items.length})</span>
          {typeof onRefresh === "function" ? (
            <button
              onClick={() => onRefresh?.()}
              aria-label="Refresh alerts"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0f172a",
              }}
            >
              <FiRefreshCcw size={16} />
            </button>
          ) : null}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1.2fr 0.9fr 0.8fr 1.4fr",
            gap: 10,
            padding: "12px 16px",
            fontWeight: 800,
            color: "#475569",
            fontSize: 11,
            background: "#f3f4f6",
          }}
        >
          <span>Device ID</span>
          <span>IMEI</span>
          <span style={{ justifySelf: "center" }}>Type</span>
          <span>Battery</span>
          <span>Last Seen</span>
        </div>

        <div style={{ maxHeight: "calc(100vh - 240px)", overflowY: "auto" }}>
          {items.length === 0 ? (
            <div style={{ padding: 16, color: "#6b7280", fontSize: 13 }}>No alerts right now</div>
          ) : null}
          {items.map((a, idx) => {
            const c = typeColor(a.type);
            return (
              <div
                key={`${a.type}:${a.device_uid}:${idx}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1.2fr 0.9fr 0.8fr 1.4fr",
                  gap: 10,
                  padding: "12px 16px",
                  borderTop: "1px solid #eef2f7",
                  alignItems: "center",
                  fontSize: 12,
                }}
              >
                <span style={{ fontWeight: 900, color: "#0f172a" }}>{a.device_uid || "—"}</span>
                <span
                  style={{
                    color: "#0f172a",
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                    fontSize: 11,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={a.imei || ""}
                >
                  {a.imei || "—"}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: `1px solid ${c.border}`,
                    background: c.bg,
                    color: c.fg,
                    fontWeight: 900,
                    fontSize: 11,
                    justifySelf: "center",
                  }}
                >
                  {typeLabel(a.type)}
                </span>
                <span style={{ fontWeight: 800 }}>{a.battery ?? "—"}%</span>
                <span style={{ color: "#64748b", fontSize: 11 }}>
                  {a.lastSeen ? new Date(a.lastSeen).toLocaleString() : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
