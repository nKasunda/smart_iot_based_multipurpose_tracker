import React, { useEffect, useState } from "react";
import { FiBox, FiCheckCircle, FiAlertTriangle, FiTrendingUp, FiBell } from "react-icons/fi";
import axios from "axios";
import GoogleMapView from "@/components/DashboardSections/GoogleMapView";

const BASE_URL = "http://localhost:5000";

export default function Overview() {
  const [statsData, setStatsData] = useState({
    totalAssets: 0,
    totalLocations: 0,
    activeNow: 0,
    warnings: 0,
  });

  const [recentAlerts, setRecentAlerts] = useState([]);

  const safeAxiosGet = async (url) => {
    try {
      const res = await axios.get(url);
      return res.data;
    } catch (err) {
      if (err.response) {
        console.error(`[Axios] Server error ${err.response.status} at ${url}:`, err.response.data);
      } else if (err.request) {
        console.error(`[Axios] No response from server at ${url}:`, err.request);
      } else {
        console.error(`[Axios] Request setup error at ${url}:`, err.message);
      }
      return null;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const stats = await safeAxiosGet(`${BASE_URL}/api/tracker/stats`);
      if (stats) setStatsData(stats);

      const alerts = await safeAxiosGet(`${BASE_URL}/api/tracker/alerts`);
      if (alerts) setRecentAlerts(alerts);
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { label: "Total Assets", value: statsData.totalAssets, icon: <FiBox size={28} color="#d1d5db" />, bgColor: "#2563eb" },
    { label: "Locations", value: statsData.totalLocations, icon: <FiTrendingUp size={28} color="#d1d5db" />, bgColor: "#0f766e" },
    { label: "Active Now", value: statsData.activeNow, icon: <FiCheckCircle size={28} color="#d1d5db" />, bgColor: "#15803d" },
    { label: "Warnings", value: statsData.warnings, icon: <FiAlertTriangle size={28} color="#d1d5db" />, bgColor: "#b91c1c" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "16px", minHeight: "100vh", overflowY: "auto", padding: "16px" }}>
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {stats.map((stat) => (
          <div key={stat.label} style={{ flex: "1 1 200px", minHeight: "180px", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start", padding: "20px", borderRadius: "16px", backgroundColor: stat.bgColor, fontWeight: "700", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
            <div style={{ marginBottom: "12px" }}>{stat.icon}</div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "#fff", marginBottom: "8px" }}>{stat.value}</div>
            <div style={{ fontSize: "14px", color: "#d1d5db" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ width: "100%", height: "500px", borderRadius: "16px", overflow: "hidden", backgroundColor: "#ffffff", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column" }}>
        <GoogleMapView />
      </div>

      <div style={{ width: "100%", borderRadius: "16px", overflow: "hidden", backgroundColor: "#ffffff", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 20px", borderBottom: "1px solid #e5e7eb", backgroundColor: "#f9fafb" }}>
          <FiBell size={20} color="#ef4444" />
          <span style={{ fontWeight: "700", fontSize: "16px", color: "#0f172a" }}>Recent Alerts</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {recentAlerts.map((alert, index) => (
            <div key={index} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 20px", borderBottom: index !== recentAlerts.length - 1 ? "1px solid #e5e7eb" : "none" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: "600", color: "#1f2937" }}>{alert.device}</span>
                <span style={{ fontSize: "14px", color: "#6b7280" }}>{alert.type}</span>
              </div>
              <div style={{ fontSize: "12px", fontWeight: "500", color: "#9ca3af" }}>{new Date(alert.time).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
