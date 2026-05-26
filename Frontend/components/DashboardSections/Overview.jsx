import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { FiBox, FiCheckCircle, FiAlertTriangle, FiTrendingUp, FiBell } from "react-icons/fi";
import { formatDateTime, useSettings } from "../../context/SettingsContext";

const TrackerLeafletMap = dynamic(() => import("../TrackerLeafletMap"), { ssr: false });

export default function Overview({
  devices,
  latestByDevice,
  stats,
  alerts,
  selectedDeviceId,
  setSelectedDeviceId,
  selectedPath,
}) {
  const { dateFormat, clockFormat } = useSettings();
  const activeNow = useMemo(() => {
    const now = Date.now();
    return (devices || []).filter((d) => {
      if (!d.lastSeen) return false;
      const t = new Date(d.lastSeen).getTime();
      return Number.isFinite(t) && now - t < 2 * 60 * 1000;
    }).length;
  }, [devices]);

  const warningCount = (alerts?.lowBatteryDevices?.length || 0) + (alerts?.inactiveDevices?.length || 0);

  const alertItems = useMemo(() => {
    if (Array.isArray(alerts?.items)) return alerts.items;
    const low = alerts?.lowBatteryDevices || [];
    const inactive = alerts?.inactiveDevices || [];
    return [
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
  }, [alerts]);

  const typeLabel = (t) => {
    if (t === "low_battery") return "Low battery";
    if (t === "inactive") return "Inactive";
    if (t === "poor_signal") return "Poor signal";
    return String(t || "Unknown");
  };

  const typeColor = (t) => {
    if (t === "low_battery") return { fg: "#dc2626", bg: "#fee2e2", border: "#fecaca" };
    if (t === "inactive") return { fg: "#ea580c", bg: "#ffedd5", border: "#fed7aa" };
    if (t === "poor_signal") return { fg: "#7c3aed", bg: "#ede9fe", border: "#ddd6fe" };
    return { fg: "#334155", bg: "#f1f5f9", border: "#e2e8f0" };
  };

  const statsCards = [
    {
      label: "Total Devices",
      value: stats?.totalDevices ?? devices?.length ?? 0,
      icon: <FiBox size={28} color="#ffffff" />,
      bgColor: "#2563eb",
    },
    {
      label: "Total Locations",
      value: stats?.totalLocations ?? 0,
      icon: <FiTrendingUp size={28} color="#ffffff" />,
      bgColor: "#0891b2",
    },
    {
      label: "Active Now",
      value: activeNow,
      icon: <FiCheckCircle size={28} color="#ffffff" />,
      bgColor: "#16a34a",
    },
    {
      label: "Warnings",
      value: warningCount,
      icon: <FiAlertTriangle size={28} color="#ffffff" />,
      bgColor: "#dc2626",
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Stats Cards */}
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {statsCards.map((stat) => (
          <div
            key={stat.label}
            style={{
              flex: "1 1 170px",
              minHeight: "140px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "flex-start",
              padding: "20px",
              borderRadius: "16px",
              background:
                stat.label === "Total Devices"
                  ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)"
                  : stat.label === "Total Locations"
                  ? "linear-gradient(135deg, #0891b2 0%, #0e7490 100%)"
                  : stat.label === "Active Now"
                  ? "linear-gradient(135deg, #16a34a 0%, #15803d 100%)"
                  : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
              fontWeight: "700",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <div style={{ marginBottom: "12px", opacity: 0.9 }}>{stat.icon}</div>
            <div
              style={{
                fontSize: "32px",
                fontWeight: "800",
                color: "#ffffff",
                marginBottom: "8px",
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "#ffffff",
                  opacity: 0.9,
                  fontFamily: "var(--font-display)",
                }}
              >
                {stat.label}
              </div>
          </div>
        ))}
      </div>

      {/* Map Section */}
      <div
        style={{
          width: "100%",
          height: "540px",
          borderRadius: "16px",
          overflow: "hidden",
          backgroundColor: "var(--surface-strong)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ flex: 1, minHeight: 0 }}>
          <TrackerLeafletMap
            latestByDevice={latestByDevice || {}}
            selectedDeviceId={selectedDeviceId}
            onSelectDeviceId={setSelectedDeviceId}
            selectedPath={selectedPath || []}
          />
        </div>
      </div>

      <div
        style={{
          width: "100%",
          borderRadius: "16px",
          overflow: "hidden",
          backgroundColor: "var(--surface-strong)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 20px",
            borderBottom: "1px solid #e5e7eb",
            background: "var(--surface-muted)",
          }}
        >
          <FiBell size={20} color="#ef4444" />
          <span style={{ fontWeight: "800", fontSize: "16px", color: "var(--text)" }}>Alerts</span>
        </div>

        <div style={{ padding: 20 }}>
          {alertItems.length === 0 ? (
            <div style={{ color: "#6b7280", fontSize: 14 }}>No alerts right now</div>
          ) : (
            alertItems.slice(0, 10).map((a, idx) => {
              const c = typeColor(a.type);
              return (
                <div
                  key={`${a.type}:${a.device_uid}:${idx}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    marginBottom: 10,
                    gap: 10,
                    background: "var(--surface-strong)",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontWeight: 900, color: "#0f172a" }}>{a.device_uid}</span>
                    {a.imei ? (
                      <span
                        style={{
                          color: "#64748b",
                          fontSize: 11,
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                        }}
                      >
                        {String(a.imei)}
                      </span>
                    ) : null}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                      }}
                    >
                      {typeLabel(a.type)}
                    </span>
                    <span style={{ color: "#64748b", fontSize: 12 }}>
                      {a.type === "low_battery"
                        ? `Battery: ${a.battery ?? "—"}%`
                        : a.type === "poor_signal"
                          ? `Signal: ${a.signalStrength ?? "—"}`
                        : a.lastSeen
                          ? formatDateTime(a.lastSeen, dateFormat, clockFormat)
                          : "—"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
