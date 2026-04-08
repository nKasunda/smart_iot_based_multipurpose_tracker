import { useEffect, useState } from "react";
import { useAlerts } from "./useAlerts";
import AlertItem from "./AlertItem";
import AlertNotifications from "./AlertNotifications";

export default function AlertPanel() {
  const { alerts, dismissAlert, clearAllAlerts, markAsRead, markAsResolved } = useAlerts();
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [lastCriticalAlert, setLastCriticalAlert] = useState(null);
  const [muteNotifications, setMuteNotifications] = useState(false);

  // Track latest critical alert for toast notification
  useEffect(() => {
    const criticalAlert = alerts.find(a => a.severity === "critical");
    if (criticalAlert && !muteNotifications) {
      setLastCriticalAlert(criticalAlert);
    }
  }, [alerts, muteNotifications]);

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    const typeMatch = filterType === "all" || alert.severity === filterType;
    const searchMatch =
      alert.tracker_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchTerm.toLowerCase());
    return typeMatch && searchMatch;
  });

  // Sort alerts
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.timestamp) - new Date(a.timestamp);
    } else if (sortBy === "oldest") {
      return new Date(a.timestamp) - new Date(b.timestamp);
    } else if (sortBy === "severity") {
      const severityMap = { critical: 3, warning: 2, info: 1 };
      return severityMap[b.severity] - severityMap[a.severity];
    }
    return 0;
  });

  // Count by severity
  const counts = {
    all: alerts.length,
    critical: alerts.filter(a => a.severity === "critical").length,
    warning: alerts.filter(a => a.severity === "warning").length,
    info: alerts.filter(a => a.severity === "info").length
  };

  return (
    <div style={{ padding: "16px", height: "100%", overflowY: "auto" }}>
      {/* Toast Notification for Critical Alerts */}
      {!muteNotifications && <AlertNotifications alert={lastCriticalAlert} />}

      {/* Header with Title and Stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          borderBottom: "2px solid #e0e0e0",
          paddingBottom: "12px"
        }}
      >
        <h3 style={{ margin: 0 }}>Alerts ({counts.all})</h3>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {counts.critical > 0 && (
            <span
              style={{
                background: "#ff4444",
                color: "white",
                padding: "4px 8px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "bold"
              }}
            >
              {counts.critical} Critical
            </span>
          )}
          {counts.warning > 0 && (
            <span
              style={{
                background: "#ff9800",
                color: "white",
                padding: "4px 8px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "bold"
              }}
            >
              {counts.warning} Warning
            </span>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: "12px", display: "flex", gap: "8px", alignItems: "stretch" }}>
        <input
          type="text"
          placeholder="Search by device or message..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setSearchTerm(searchInput.trim());
            }
          }}
          className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none"
        />
        <button
          type="button"
          onClick={() => setSearchTerm(searchInput.trim())}
          className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => {
            setSearchInput("");
            setSearchTerm("");
          }}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
        >
          Clear
        </button>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "12px",
          overflowX: "auto",
          paddingBottom: "8px"
        }}
      >
        {["all", "critical", "warning", "info"].map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            style={{
              padding: "6px 12px",
              border: filterType === type ? "none" : "1px solid #ccc",
              borderRadius: "20px",
              background: filterType === type ? "#2196f3" : "white",
              color: filterType === type ? "white" : "#333",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "500",
              transition: "all 0.2s",
              whiteSpace: "nowrap"
            }}
            onMouseOver={(e) => {
              if (filterType !== type) {
                e.target.style.backgroundColor = "#f5f5f5";
              }
            }}
            onMouseOut={(e) => {
              if (filterType !== type) {
                e.target.style.backgroundColor = "white";
              }
            }}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)} ({counts[type]})
          </button>
        ))}
      </div>

      {/* Sort and Control Options */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "12px",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap"
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <label style={{ fontSize: "12px", color: "#666" }}>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "4px 8px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="severity">By Severity</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <label style={{ fontSize: "12px", color: "#666" }}>
            <input
              type="checkbox"
              checked={muteNotifications}
              onChange={(e) => setMuteNotifications(e.target.checked)}
              style={{ marginRight: "4px", cursor: "pointer" }}
            />
            Mute
          </label>

          {alerts.length > 0 && (
            <button
              onClick={clearAllAlerts}
              style={{
                padding: "6px 12px",
                background: "#f44336",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#d32f2f";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "#f44336";
              }}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Alert Summary Stats */}
      {alerts.length > 0 && (
        <div
          style={{
            background: "#f5f5f5",
            padding: "10px",
            borderRadius: "6px",
            marginBottom: "12px",
            fontSize: "12px",
            color: "#666"
          }}
        >
          Showing {sortedAlerts.length} of {alerts.length} alerts
          {searchTerm && ` (filtered by: "${searchTerm}")`}
        </div>
      )}

      {/* No Alerts Message */}
      {sortedAlerts.length === 0 && alerts.length === 0 && (
        <p
          style={{
            textAlign: "center",
            color: "#999",
            padding: "24px 0",
            fontSize: "14px"
          }}
        >
          ✓ No alerts yet. Everything looks good!
        </p>
      )}

      {/* No Results Message */}
      {sortedAlerts.length === 0 && alerts.length > 0 && (
        <p
          style={{
            textAlign: "center",
            color: "#999",
            padding: "24px 0",
            fontSize: "14px"
          }}
        >
          No alerts match your filters.
        </p>
      )}

      {/* Alerts List */}
      <div>
        {sortedAlerts.map(alert => (
          <AlertItem
            key={alert.id}
            alert={alert}
            onDismiss={dismissAlert}
            onMarkRead={markAsRead}
          />
        ))}
      </div>
    </div>
  );
}