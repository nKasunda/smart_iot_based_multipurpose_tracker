import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { FiTrash2 } from "react-icons/fi";
import { getHistory } from "../../lib/api";
import { friendlyError } from "../../lib/errors";
import { formatDateTime, useSettings } from "../../context/SettingsContext";

const TrackerLeafletMap = dynamic(() => import("../TrackerLeafletMap"), { ssr: false });

function datePlaceholder(dateFormat) {
  if (dateFormat === "MM/DD/YYYY") return "05/28/2026";
  if (dateFormat === "YYYY-MM-DD") return "2026-05-28";
  return "28/05/2026";
}

function formatDateOnly(date, dateFormat) {
  if (!date || !Number.isFinite(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  if (dateFormat === "MM/DD/YYYY") return `${mm}/${dd}/${yyyy}`;
  if (dateFormat === "YYYY-MM-DD") return `${yyyy}-${mm}-${dd}`;
  return `${dd}/${mm}/${yyyy}`;
}

function parseDateOnly(value, dateFormat) {
  const text = String(value || "").trim();
  if (!text) return null;

  const parts = text.match(/^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})$/);
  if (!parts) return null;

  let day;
  let month;
  let year;
  if (dateFormat === "YYYY-MM-DD") {
    year = Number(parts[1]);
    month = Number(parts[2]);
    day = Number(parts[3]);
  } else if (dateFormat === "MM/DD/YYYY") {
    month = Number(parts[1]);
    day = Number(parts[2]);
    year = Number(parts[3]);
  } else {
    day = Number(parts[1]);
    month = Number(parts[2]);
    year = Number(parts[3]);
  }

  if (year < 100) year += 2000;
  const date = new Date(year, month - 1, day);
  if (
    !Number.isFinite(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function isoFromDateAndTime(dateText, timeText, dateFormat, endOfDay = false) {
  if (!dateText) return "";
  const date = parseDateOnly(dateText, dateFormat);
  if (!date) return "";
  const time = String(timeText || "").match(/^(\d{1,2}):(\d{2})$/);
  if (time) {
    date.setHours(Number(time[1]), Number(time[2]), 0, 0);
  } else if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

export default function History({ devices, latestByDevice, selectedDeviceId, setSelectedDeviceId }) {
  const { dateFormat, clockFormat } = useSettings();

  const [fromDate, setFromDate] = useState("");
  const [fromTime, setFromTime] = useState("00:00");
  const [toDate,   setToDate]   = useState("");
  const [toTime,   setToTime]   = useState("23:59");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [info,    setInfo]    = useState("");
  const [path,    setPath]    = useState([]);

  const deviceIds = useMemo(() => (devices || []).map((d) => d.device_uid).sort(), [devices]);

  const load = async () => {
    if (!selectedDeviceId) return;
    if ((fromDate && !parseDateOnly(fromDate, dateFormat)) || (toDate && !parseDateOnly(toDate, dateFormat))) {
      setError(`Enter dates using ${dateFormat}.`);
      setInfo("");
      return;
    }
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const rows = await getHistory({
        device_id: selectedDeviceId,
        from: isoFromDateAndTime(fromDate, fromTime, dateFormat),
        to:   isoFromDateAndTime(toDate, toTime, dateFormat, true),
        limit: 5000,
      });
      const list = Array.isArray(rows) ? rows.slice() : [];
      list.reverse();
      setPath(list);

      // ── show formatted date range in the info message ──
      const fromIso = isoFromDateAndTime(fromDate, fromTime, dateFormat);
      const toIso = isoFromDateAndTime(toDate, toTime, dateFormat, true);
      const fromLabel = fromIso ? formatDateTime(fromIso, dateFormat, clockFormat) : "beginning";
      const toLabel   = toIso   ? formatDateTime(toIso, dateFormat, clockFormat) : "now";
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
            <div style={dateTimeRow}>
              <input
                type="text"
                inputMode="numeric"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                onBlur={() => {
                  const parsed = parseDateOnly(fromDate, dateFormat);
                  if (parsed) setFromDate(formatDateOnly(parsed, dateFormat));
                }}
                placeholder={datePlaceholder(dateFormat)}
                style={input}
              />
              <input
                type="time"
                value={fromTime}
                onChange={(e) => setFromTime(e.target.value)}
                style={{ ...input, maxWidth: 96 }}
              />
            </div>
            {isoFromDateAndTime(fromDate, fromTime, dateFormat) && (
              <p style={preview}>
                {formatDateTime(isoFromDateAndTime(fromDate, fromTime, dateFormat), dateFormat, clockFormat)}
              </p>
            )}
          </div>

          {/* To date */}
          <div>
            <label style={lbl}>
              To Date
              <span style={fmtBadge}>{dateFormat}</span>
            </label>
            <div style={dateTimeRow}>
              <input
                type="text"
                inputMode="numeric"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                onBlur={() => {
                  const parsed = parseDateOnly(toDate, dateFormat);
                  if (parsed) setToDate(formatDateOnly(parsed, dateFormat));
                }}
                placeholder={datePlaceholder(dateFormat)}
                style={input}
              />
              <input
                type="time"
                value={toTime}
                onChange={(e) => setToTime(e.target.value)}
                style={{ ...input, maxWidth: 96 }}
              />
            </div>
            {isoFromDateAndTime(toDate, toTime, dateFormat, true) && (
              <p style={preview}>
                {formatDateTime(isoFromDateAndTime(toDate, toTime, dateFormat, true), dateFormat, clockFormat)}
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
            onClick={() => {
              setFromDate("");
              setFromTime("00:00");
              setToDate("");
              setToTime("23:59");
              setPath([]);
              setInfo("");
              setError("");
            }}
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

const dateTimeRow = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 96px",
  gap: 6,
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
