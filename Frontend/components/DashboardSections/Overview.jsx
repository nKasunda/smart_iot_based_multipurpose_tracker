import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { FiBox, FiCheckCircle, FiAlertTriangle, FiTrendingUp, FiBell } from "react-icons/fi";

const TrackerLeafletMap = dynamic(() => import("../TrackerLeafletMap"), { ssr: false });

export default function Overview({
  devices,
  latestByDevice,
  stats,
  alerts,
  selectedDeviceId,
  setSelectedDeviceId,
  onRefresh,
}) {
  const activeNow = useMemo(() => {
    const now = Date.now();
    return (devices || []).filter((d) => {
      if (!d.lastSeen) return false;
      const t = new Date(d.lastSeen).getTime();
      return Number.isFinite(t) && now - t < 2 * 60 * 1000;
    }).length;
  }, [devices]);

  const warningCount = (alerts?.lowBatteryDevices?.length || 0) + (alerts?.inactiveDevices?.length || 0);

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
        fontFamily: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
          backgroundColor: "#ffffff",
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
        }}
      >
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "8px",
          padding: "10px 20px",
          borderBottom: "1px solid #e5e7eb",
          background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
        }}
      >
        <button
          onClick={() => onRefresh?.()}
          style={{
            padding: "8px 12px",
            borderRadius: "10px",
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            cursor: "pointer",
            fontWeight: 700,
            minWidth: "100px",
            fontSize: "13px",
          }}
        >
          Refresh
        </button>
      </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <TrackerLeafletMap
            latestByDevice={latestByDevice || {}}
            selectedDeviceId={selectedDeviceId}
            onSelectDeviceId={setSelectedDeviceId}
            selectedPath={[]}
          />
        </div>
      </div>

      <div
        style={{
          width: "100%",
          borderRadius: "16px",
          overflow: "hidden",
          backgroundColor: "#ffffff",
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
            background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
          }}
        >
          <FiBell size={20} color="#ef4444" />
          <span style={{ fontWeight: "800", fontSize: "16px", color: "#0f172a" }}>Alerts</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, padding: 20 }}>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Low battery</div>
            {(alerts?.lowBatteryDevices || []).length === 0 ? (
              <div style={{ color: "#6b7280", fontSize: 14 }}>None</div>
            ) : (
              (alerts?.lowBatteryDevices || []).slice(0, 10).map((d) => (
                <div
                  key={d.device_uid}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    marginBottom: 10,
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{d.device_uid}</span>
                  <span style={{ fontWeight: 800, color: "#dc2626" }}>{d.battery}%</span>
                </div>
              ))
            )}
          </div>

          <div>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Inactive</div>
            {(alerts?.inactiveDevices || []).length === 0 ? (
              <div style={{ color: "#6b7280", fontSize: 14 }}>None</div>
            ) : (
              (alerts?.inactiveDevices || []).slice(0, 10).map((d) => (
                <div
                  key={d.device_uid}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    marginBottom: 10,
                    gap: 10,
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{d.device_uid}</span>
                  <span style={{ color: "#6b7280", fontSize: 13 }}>
                    {d.lastSeen ? new Date(d.lastSeen).toLocaleString() : "—"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

