import React from "react";
import {
  FiMapPin,
  FiBarChart2,
  FiMap,
  FiList,
  FiBell,
  FiSettings,
  FiActivity,
} from "react-icons/fi";

function SideMenu({ isOpen, toggle, activeItem, onSelect }) {
  return (
    <aside
      style={{
        width: isOpen ? "230px" : "60px",
        transition: "width 0.25s ease",
        backgroundColor: "#ffffff",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          height: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: isOpen ? "space-between" : "center",
          padding: isOpen ? "0 14px" : "0",
        }}
      >
        {isOpen && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FiMapPin size={34} color="#dc2626" />
            <span
              style={{
                fontSize: "26px",
                fontWeight: "800",
                color: "#0f172a",
              }}
            >
              TrackA
            </span>
          </div>
        )}

        <button onClick={toggle} style={iconButtonStyle}>
          {isOpen ? "✕" : "☰"}
        </button>
      </div>

      <nav
        style={{
          padding: isOpen ? "14px" : "12px 0",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          alignItems: isOpen ? "stretch" : "center",
        }}
      >
        {menuItems.map((item) => {
          const isActive = activeItem === item.label;

          return (
            <div
              key={item.label}
              title={!isOpen ? item.label : undefined}
              onClick={() => onSelect(item.label)}
              style={{
                ...menuItemStyle,
                ...(isActive ? activeMenuItemStyle : {}),
                justifyContent: isOpen ? "flex-start" : "center",
                padding: isOpen ? "10px 12px" : "10px",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  position: "relative",
                  color: isActive ? "#020617" : "#475569",
                }}
              >
                {item.icon}
                {item.badge && <span style={badgeStyle}>{item.badge}</span>}
              </span>

              {isOpen && (
                <span style={{ fontWeight: isActive ? "600" : "500" }}>
                  {item.label}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {isOpen && (
        <div style={statusCardStyle}>
          <div style={statusTitleStyle}>
            <FiActivity size={16} />
            <span>System Status</span>
          </div>

          <div style={statusItemStyle}>
            <span style={labelStyle}>Active Devices</span>
            <strong style={valueStyle}>12</strong>
          </div>

          <div style={statusItemStyle}>
            <span style={labelStyle}>Data Sync</span>
            <strong style={{ ...valueStyle, color: "#16a34a" }}>Live</strong>
          </div>

          <div style={statusItemStyle}>
            <span style={labelStyle}>Server Health</span>
            <strong style={valueStyle}>98%</strong>
          </div>
        </div>
      )}
    </aside>
  );
}

const menuItems = [
  { label: "Overview", icon: <FiBarChart2 size={18} /> },
  { label: "Live Map", icon: <FiMap size={18} /> },
  { label: "Asset List", icon: <FiList size={18} /> },
  { label: "Alerts", icon: <FiBell size={18} />, badge: 3 },
  { label: "Settings", icon: <FiSettings size={18} /> },
];

const iconButtonStyle = {
  background: "none",
  border: "none",
  color: "#334155",
  fontSize: "20px",
  cursor: "pointer",
};

const menuItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  borderRadius: "6px",
  cursor: "pointer",
  color: "#1e293b",
  fontSize: "14px",
  fontWeight: "500",
  transition: "background 0.15s ease, transform 0.1s ease",
};

const activeMenuItemStyle = {
  backgroundColor: "#f1f5f9",
  borderLeft: "3px solid #020617",
};

const badgeStyle = {
  position: "absolute",
  top: "-6px",
  right: "-10px",
  backgroundColor: "#dc2626",
  color: "#fff",
  fontSize: "10px",
  fontWeight: "700",
  padding: "2px 5px",
  borderRadius: "999px",
};

const statusCardStyle = {
  margin: "12px 14px",
  padding: "12px",
  borderRadius: "10px",
  background: "rgba(248, 250, 252, 0.85)",
  backdropFilter: "blur(8px)",
  border: "1px solid rgba(0,0,0,0.06)",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  fontSize: "13px",
  color: "#0f172a",
};

const statusTitleStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontWeight: "700",
  marginBottom: "4px",
  color: "#020617",
};

const statusItemStyle = {
  display: "flex",
  justifyContent: "space-between",
};

const labelStyle = {
  color: "#64748b",
};

const valueStyle = {
  color: "#020617",
  fontWeight: "600",
};

export default SideMenu;
