import React from "react";
import dynamic from "next/dynamic";

const TrackerLeafletMap = dynamic(() => import("../TrackerLeafletMap"), { ssr: false });

export default function LiveMap({ latestByDevice, selectedDeviceId, setSelectedDeviceId }) {
  const deviceIds = Object.keys(latestByDevice || {}).sort();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#374151",
            }}
          >
            Select Device:
          </label>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId?.(e.target.value)}
            style={{
              minWidth: 180,
              maxWidth: 320,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            {deviceIds.length === 0 ? <option value="">No devices available</option> : null}
            {deviceIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          borderRadius: 16,
          overflow: "hidden",
          background: "#ffffff",
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        }}
      >
        <TrackerLeafletMap
          latestByDevice={latestByDevice || {}}
          selectedDeviceId={selectedDeviceId}
          onSelectDeviceId={setSelectedDeviceId}
          selectedPath={[]}
        />
      </div>
    </div>
  );
}
