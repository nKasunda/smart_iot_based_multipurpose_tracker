import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { FiTrash2 } from "react-icons/fi";
import { getHistory } from "../../lib/api";
import { friendlyError } from "../../lib/errors";
import { formatDateTime, useSettings } from "../../context/SettingsContext";

const TrackerLeafletMap = dynamic(() => import("../TrackerLeafletMap"), { ssr: false });

function isoFromDatetimeLocal(value) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString();
}

export default function History({ devices, latestByDevice, selectedDeviceId, setSelectedDeviceId }) {
  const { dateFormat, clockFormat } = useSettings();

  const [from,    setFrom]    = useState("");
  const [to,      setTo]      = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [info,    setInfo]    = useState("");
  const [path,    setPath]    = useState([]);

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
        to:   isoFromDatetimeLocal(to),
        limit: 5000,
      });
      const list = Array.isArray(rows) ? rows.slice() : [];
      list.reverse();
      setPath(list);

      // ── show formatted date range in the info message ──
      const fromLabel = from ? formatDateTime(new Date(from).toISOString(), dateFormat, clockFormat) : "beginning";
      const toLabel   = to   ? formatDateTime(new Date(to).toISOString(),   dateFormat, clockFormat) : "now";
      setInfo(`Loaded ${list.length} points — ${fromLabel} to ${toLabel}`);

    } catch (err) {
      setError(friendlyError(err, "Could not load tracker history. Adjust the filters and try again."));
      setPath([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "var(--font-sans)" }}>
      <div style={{
        borderRadius: 16, background: "#ffffff",
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)", overflow: "hidden",
      }}>
        <div style={{
          padding: 16, borderBottom: "1px solid #e5e7eb",
          background: "#f9fafb", fontWeight: 700, fontSize: 14, color: "#020617",
        }}>
          Filters & Controls
        </div>

        <div className="responsive-history-grid" style={{
          padding: 16, display: "grid",
          gridTemplateColumns: "1.2fr 1fr 1fr 120px 100px",
          gap: 12, alignItems: "end",
        }}>

          {/* Device selector */}
          <div>
            <label style={lbl}>Device</label>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId?.(e.target.value)}
              style={input}
            >
              {deviceIds.length === 0
                ? <option value="">No devices available</option>
                : null}
              {deviceIds.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>

          {/* From date */}
          <div>
            <label style={lbl}>
              From Date
              <span style={fmtBadge}>{dateFormat}</span>
            </label>
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={input}
            />
            {/* show formatted preview below input */}
            {from && (
              <p style={preview}>
                {formatDateTime(new Date(from).toISOString(), dateFormat, clockFormat)}
              </p>
            )}
          </div>

          {/* To date */}
          <div>
            <label style={lbl}>
              To Date
              <span style={fmtBadge}>{dateFormat}</span>
            </label>
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={input}
            />
            {/* show formatted preview below input */}
            {to && (
              <p style={preview}>
                {formatDateTime(new Date(to).toISOString(), dateFormat, clockFormat)}
              </p>
            )}
          </div>

          {/* Load button */}
          <button
            onClick={load}
            disabled={loading || !selectedDeviceId}
            style={{
              padding: "8px 10px", borderRadius: 8, border: "none",
              background: loading || !selectedDeviceId ? "#9ca3af" : "#2563eb",
              color: "#ffffff",
              cursor: loading || !selectedDeviceId ? "not-allowed" : "pointer",
              fontWeight: 700, fontSize: 12,
              transition: "all 0.2s ease", height: 38,
            }}
          >
            {loading ? "Loading…" : "Load"}
          </button>

          {/* Clear button */}
          <button
            onClick={() => { setPath([]); setInfo(""); setError(""); }}
            style={{
              padding: "8px 10px", borderRadius: 8,
              border: "1px solid #e5e7eb", background: "#ffffff",
              cursor: "pointer", fontWeight: 700, fontSize: 12,
              display: "flex", alignItems: "center",
              justifyContent: "center", height: 38,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f3f4f6"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#ffffff"; }}
          >
            <FiTrash2 size={14} />
          </button>
        </div>

        {/* Status messages */}
        {error ? (
          <div style={{ padding: "0 16px 16px", color: "#dc2626", fontWeight: 700, fontSize: 13 }}>
            ❌ {error}
          </div>
        ) : info ? (
          <div style={{ padding: "0 16px 16px", color: "#16a34a", fontWeight: 800, fontSize: 12 }}>
            ✓ {info}
          </div>
        ) : null}
      </div>

      {/* Map */}
      <div className="responsive-map-panel responsive-map-panel--history" style={{
        height: "72vh", borderRadius: 16, overflow: "hidden",
        background: "#ffffff", boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
      }}>
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

// ── small style constants ────────────────────────────────────
const lbl = {
  display: "flex", alignItems: "center", gap: 6,
  fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6,
};

const input = {
  width: "100%", padding: "8px 10px",
  borderRadius: 8, border: "1px solid #e5e7eb",
  fontSize: 13, height: 38, boxSizing: "border-box",
};

const fmtBadge = {
  fontSize: 9, fontWeight: 700, padding: "1px 5px",
  borderRadius: 4, background: "#eff6ff",
  color: "#2563eb", letterSpacing: "0.04em",
};

const preview = {
  margin: "3px 0 0", fontSize: 10,
  color: "#2563eb", fontWeight: 500,
};
