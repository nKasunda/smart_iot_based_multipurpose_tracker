import React, { useEffect, useState } from "react";
import {
  FiBox,
  FiCheckCircle,
  FiAlertTriangle,
  FiTrendingUp,
  FiBell,
} from "react-icons/fi";
import axios from "axios";
import GoogleMapView from "@/components/DashboardSections/GoogleMapView";

export default function Overview() {
  const [statsData, setStatsData] = useState({
    totalAssets: 0,
    activeNow: 0,
    warnings: 0,
    inTransit: 0,
  });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [mapType, setMapType] = useState("Standard");

  // Fetch dashboard stats and alerts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await axios.get("http://localhost:5000/api/tracker/stats");
        setStatsData(statsRes.data);

        const alertsRes = await axios.get("http://localhost:5000/api/tracker/alerts");
        setRecentAlerts(alertsRes.data);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const stats = [
    {
      label: "Total Assets",
      value: statsData.totalAssets,
      icon: <FiBox size={28} color="#d1d5db" />,
      bgColor: "#2563eb",
    },
    {
      label: "Active Now",
      value: statsData.activeNow,
      icon: <FiCheckCircle size={28} color="#d1d5db" />,
      bgColor: "#15803d",
    },
    {
      label: "Warnings",
      value: statsData.warnings,
      icon: <FiAlertTriangle size={28} color="#d1d5db" />,
      bgColor: "#b91c1c",
    },
    {
      label: "In-Transit",
      value: statsData.inTransit,
      icon: <FiTrendingUp size={28} color="#d1d5db" />,
      bgColor: "#d97706",
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        marginTop: "16px",
        minHeight: "100vh",
        overflowY: "auto",
        padding: "16px",
      }}
    >
      {/* Stats Cards */}
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              flex: "1 1 200px",
              minHeight: "180px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "flex-start",
              padding: "20px",
              borderRadius: "16px",
              backgroundColor: stat.bgColor,
              fontWeight: "700",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              cursor: "default",
              transition: "transform 0.15s ease",
            }}
          >
            <div style={{ marginBottom: "12px" }}>{stat.icon}</div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "#fff", marginBottom: "8px" }}>
              {stat.value}
            </div>
            <div style={{ fontSize: "14px", color: "#d1d5db" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Map Card */}
      <div
        style={{
          width: "100%",
          height: "500px",
          borderRadius: "16px",
          overflow: "hidden",
          backgroundColor: "#ffffff",
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Map Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 20px",
            borderBottom: "1px solid #e5e7eb",
            backgroundColor: "#f9fafb",
          }}
        >
          <div style={{ fontWeight: "700", fontSize: "16px", color: "#0f172a" }}>Map View</div>

          <div style={{ display: "flex", gap: "10px" }}>
            {["Standard", "Satellite", "Hybrid"].map((type) => (
              <button
                key={type}
                onClick={() => setMapType(type)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: mapType === type ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  backgroundColor: mapType === type ? "#e0f2fe" : "#f1f5f9",
                  cursor: "pointer",
                  fontWeight: mapType === type ? "700" : "500",
                  color: "#0f172a",
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Map Container */}
        <div style={{ flex: 1, position: "relative" }}>
          <GoogleMapView mapType={mapType.toLowerCase()} style={{ width: "100%", height: "100%" }} />

          {/* Legend */}
          <div
            style={{
              position: "absolute",
              bottom: "12px",
              left: "12px",
              backgroundColor: "rgba(255,255,255,0.9)",
              color: "#0f172a",
              padding: "8px 12px",
              borderRadius: "12px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              display: "flex",
              gap: "16px",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#16a34a" }} />
              Active
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#facc15" }} />
              Warning
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#ef4444" }} />
              Offline
            </div>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
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
            backgroundColor: "#f9fafb",
          }}
        >
          <FiBell size={20} color="#ef4444" />
          <span style={{ fontWeight: "700", fontSize: "16px", color: "#0f172a" }}>Recent Alerts</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {recentAlerts.map((alert, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                padding: "12px 20px",
                borderBottom: index !== recentAlerts.length - 1 ? "1px solid #e5e7eb" : "none",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: "600", color: "#1f2937" }}>{alert.device}</span>
                <span style={{ fontSize: "14px", color: "#6b7280" }}>{alert.type}</span>
              </div>
              <div style={{ fontSize: "12px", fontWeight: "500", color: "#9ca3af" }}>
                {new Date(alert.time).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
