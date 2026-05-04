import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { FiTrash2 } from "react-icons/fi";
import { getHistory } from "../../lib/api";

const TrackerLeafletMap = dynamic(() => import("../TrackerLeafletMap"), { ssr: false });

function isoFromDatetimeLocal(value) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString();
}

export default function History({ devices, latestByDevice, selectedDeviceId, setSelectedDeviceId }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [path, setPath] = useState([]);

  const deviceIds = useMemo(() => (devices || []).map((d) => d.device_uid).sort(), [devices]);

  const load = async () => {
    if (!selectedDeviceId) return;
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const rows = await getHistory({
        device_id: selectedDeviceId,
        from: isoFromDatetimeLocal(from),
        to: isoFromDatetimeLocal(to),
        limit: 5000,
      });
      const list = Array.isArray(rows) ? rows.slice() : [];
      list.reverse();
      setPath(list);
      setInfo(`Loaded ${list.length} points`);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setPath([]);
    } finally {
      setLoading(false);
    }
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
          background: "#ffffff",
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 16,
            borderBottom: "1px solid #e5e7eb",
            background: "#f9fafb",
            fontWeight: 700,
            fontSize: 14,
            color: "#020617",
          }}
        >
          Filters & Controls
        </div>
        <div
          style={{
            padding: 16,
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr 1fr 120px 100px",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Device
            </label>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId?.(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 13,
                height: 38,
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

          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              From Date
            </label>
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 13,
                height: 38,
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              To Date
            </label>
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 13,
                height: 38,
              }}
            />
          </div>

          <button
            onClick={load}
            disabled={loading || !selectedDeviceId}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "none",
              background: loading || !selectedDeviceId ? "#9ca3af" : "#2563eb",
              color: "#ffffff",
              cursor: loading || !selectedDeviceId ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontSize: 12,
              transition: "all 0.2s ease",
              height: 38,
            }}
          >
            {loading ? "Loading…" : "Load"}
          </button>

          <button
            onClick={() => {
              setPath([]);
              setInfo("");
              setError("");
            }}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 12,
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 38,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f3f4f6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ffffff";
            }}
          >
            <FiTrash2 size={14} />
          </button>
        </div>
        {error ? (
          <div style={{ padding: "0 16px 16px", color: "#dc2626", fontWeight: 700, fontSize: 13 }}>
            ❌ {error}
          </div>
        ) : info ? (
          <div style={{ padding: "0 16px 16px", color: "#16a34a", fontWeight: 800, fontSize: 12 }}>
            {info}
          </div>
        ) : null}
      </div>

      <div
        style={{
          height: "72vh",
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
          selectedPath={path}
        />
      </div>
    </div>
  );
}
