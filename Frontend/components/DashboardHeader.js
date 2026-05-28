//// components/DashboardHeader.js
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiClock, FiLogOut, FiEye, FiEyeOff, FiMonitor, FiMoon, FiSun, FiX } from "react-icons/fi";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { getServerTime, updatePassword, updateProfile } from "../lib/api";
import { friendlyError } from "../lib/errors";

function getInitials(user) {
  const name = (user?.name || "").trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    const first  = parts[0]?.[0] || "";
    const second = parts[1]?.[0] || "";
    return (first + second).toUpperCase() || "U";
  }
  const email = (user?.email || "").trim();
  if (email) return email[0].toUpperCase();
  return "U";
}

function formatTime(date, fmt) {
  if (!date) return "";
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  if (fmt === "24h") return `${String(h).padStart(2, "0")}:${m}:${s}`;
  const ampm = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}:${m}:${s} ${ampm}`;
}

// ── Alerts Tab ───────────────────────────────────────────────
function AlertsTab({ alertEnabled, alertPush, save, togglePush }) {
  return (
    <div>
      <p style={d.sectionLabel}>Alert delivery</p>
      <DRow label="Enable alerts" sub="Receive every alert generated for your trackers">
        <DSwitch checked={alertEnabled} onChange={v => save({ alertEnabled: v })} />
      </DRow>
      <DRow label="Browser push" sub="Show alerts from this browser when alerts are enabled">
        <DSwitch checked={alertEnabled && alertPush} disabled={!alertEnabled} onChange={togglePush} />
      </DRow>
    </div>
  );
}

// ── Profile Dropdown — rendered via portal ───────────────────
function ProfileDropdown({ user, onClose, anchorRef }) {
  const { clockFormat, uiTheme, alertEnabled, alertPush, dateFormat, save } = useSettings();
  const { refresh } = useAuth();

  const [name,         setName]         = useState(user?.name  || "");
  const [email,        setEmail]        = useState(user?.email || "");
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [displayName,  setDisplayName]  = useState(user?.name  || user?.email || "User");
  const [displayEmail, setDisplayEmail] = useState(user?.email || "");

  const [current,     setCurrent]     = useState("");
  const [nextPw,      setNextPw]      = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [pwError,     setPwError]     = useState("");
  const [pwSaved,     setPwSaved]     = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext,    setShowNext]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [tab, setTab] = useState("profile");

  useEffect(() => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setDisplayName(user?.name || user?.email || "User");
    setDisplayEmail(user?.email || "");
  }, [user?.name, user?.email]);

  const [pos, setPos] = useState({ top: 70, right: 24 });
  useEffect(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({
        top:   rect.bottom + 10,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    }
  }, [anchorRef]);

  const saveProfile = async () => {
    setProfileError("");
    try {
      const updated = await updateProfile({ name, email });
      setDisplayName(updated?.name || updated?.email || "User");
      setDisplayEmail(updated?.email || "");
      if (typeof refresh === "function") await refresh();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      setProfileError(friendlyError(err, "Could not save profile. Check your details and try again."));
    }
  };

  const savePassword = async () => {
    setPwError("");
    if (nextPw !== confirm) { setPwError("Passwords do not match.");         return; }
    if (nextPw.length < 8)  { setPwError("Minimum 8 characters required."); return; }
    try {
      await updatePassword({ current, next: nextPw });
      setPwSaved(true);
      setCurrent(""); setNextPw(""); setConfirm("");
      setTimeout(() => setPwSaved(false), 2500);
    } catch (err) {
      setPwError(friendlyError(err, "Could not update password. Check your current password and try again."));
    }
  };

  const togglePush = async (checked) => {
    if (checked) {
      if (typeof Notification === "undefined") {
        alert("This browser does not support notifications.");
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        alert("Permission denied. Enable notifications in browser settings.");
        return;
      }
    }
    save({ alertPush: checked });
  };

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "display", label: "Display" },
    { id: "alerts",  label: "Alerts"  },
  ];

  const panel = (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 99998, background: "transparent" }}
      />

      <div style={{
        position: "fixed", top: pos.top, right: pos.right,
        width: "min(340px, calc(100vw - 24px))", background: "var(--surface-strong)", borderRadius: 14,
        boxShadow: "var(--shadow-popover)",
        border: "1px solid var(--border)", overflow: "hidden", zIndex: 99999,
      }}>

        {/* panel header */}
        <div style={d.panelHead}>
          <div style={d.panelAvatar}>{getInitials({ name: displayName })}</div>
          <div style={{ flex: 1 }}>
            <p style={d.panelName}>{displayName}</p>
            <p style={d.panelEmail}>{displayEmail}</p>
          </div>
          <button style={d.closeBtn} onClick={onClose}>
            <FiX size={16} />
          </button>
        </div>

        {/* tabs */}
        <div style={d.tabs}>
          {tabs.map(t => (
            <button
              key={t.id}
              style={{ ...d.tabBtn, ...(tab === t.id ? d.tabActive : {}) }}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* body */}
        <div style={d.body}>

          {/* ── PROFILE TAB ── */}
          {tab === "profile" && (
            <div>
              <DField label="Full name">
                <input style={d.input} value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your full name" />
              </DField>
              <DField label="Email address">
                <input style={d.input} type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" />
              </DField>
              <div style={d.saveRow}>
                <button style={d.saveBtn} onClick={saveProfile}>Save changes</button>
                {profileSaved && <span style={d.savedMsg}>✓ Saved</span>}
              </div>
              {profileError && <p style={d.error}>{profileError}</p>}

              <div style={d.divider} />
              <p style={d.sectionLabel}>Change password</p>

              <PasswordField
                label="Current password"
                value={current}
                visible={showCurrent}
                onChange={setCurrent}
                onToggle={() => setShowCurrent(v => !v)}
              />
              <PasswordField
                label="New password"
                value={nextPw}
                visible={showNext}
                onChange={setNextPw}
                onToggle={() => setShowNext(v => !v)}
              />
              <PasswordField
                label="Confirm new password"
                value={confirm}
                visible={showConfirm}
                onChange={setConfirm}
                onToggle={() => setShowConfirm(v => !v)}
              />
              {pwError && <p style={d.error}>{pwError}</p>}
              <div style={d.saveRow}>
                <button style={d.saveBtn} onClick={savePassword}>Update password</button>
                {pwSaved && <span style={d.savedMsg}>✓ Updated</span>}
              </div>
            </div>
          )}

          {/* ── DISPLAY TAB ── */}
          {tab === "display" && (
            <div>
              <div style={d.themeChoiceRow}>
                <button
                  style={{ ...d.themeChoice, ...(uiTheme === "light" ? d.themeChoiceOn : {}) }}
                  onClick={() => save({ uiTheme: "light" })}
                >
                  <FiSun size={14} />
                  Light
                </button>
                <button
                  style={{ ...d.themeChoice, ...(uiTheme === "dark" ? d.themeChoiceOn : {}) }}
                  onClick={() => save({ uiTheme: "dark" })}
                >
                  <FiMoon size={14} />
                  Dark
                </button>
                <button
                  style={{ ...d.themeChoice, ...(uiTheme === "device" ? d.themeChoiceOn : {}) }}
                  onClick={() => save({ uiTheme: "device" })}
                >
                  <FiMonitor size={14} />
                  Device
                </button>
              </div>

              <div style={d.divider} />

              <p style={d.sectionLabel}>Clock format</p>
              <p style={d.sectionSub}>Controls the live clock in your dashboard header</p>
              <div style={d.toggleGroup}>
                <button
                  style={{ ...d.toggleBtn, ...(clockFormat === "12h" ? d.toggleOn : {}) }}
                  onClick={() => save({ clockFormat: "12h" })}
                >
                  12-hour
                </button>
                <button
                  style={{ ...d.toggleBtn, ...(clockFormat === "24h" ? d.toggleOn : {}) }}
                  onClick={() => save({ clockFormat: "24h" })}
                >
                  24-hour
                </button>
              </div>

              <div style={d.divider} />

              <p style={d.sectionLabel}>Date format</p>
              <p style={d.sectionSub}>How dates appear on history logs and reports</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                {["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map(fmt => (
                  <div
                    key={fmt}
                    onClick={() => save({ dateFormat: fmt })}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "7px 10px", borderRadius: 7,
                      border:     `1px solid ${dateFormat === fmt ? "var(--primary-ui)" : "var(--border)"}`,
                      cursor:     "pointer", fontSize: 12, fontWeight: 500,
                      color:      dateFormat === fmt ? "var(--primary-ui)" : "var(--text)",
                      background: dateFormat === fmt ? "var(--primary-soft)" : "var(--surface-muted)",
                      transition: "all .15s",
                    }}
                  >
                    <div style={{
                      width: 14, height: 14, borderRadius: "50%",
                      border:     `2px solid ${dateFormat === fmt ? "var(--primary-ui)" : "var(--border-strong)"}`,
                      background: dateFormat === fmt ? "var(--primary-ui)" : "transparent",
                      flexShrink: 0,
                    }} />
                    {fmt}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ALERTS TAB ── */}
          {tab === "alerts" && (
            <AlertsTab
              alertEnabled={alertEnabled}
              alertPush={alertPush}
              save={save}
              togglePush={togglePush}
            />
          )}

        </div>
      </div>
    </>
  );

  if (typeof document === "undefined") return null;
  return createPortal(panel, document.body);
}

// ── Small helpers ────────────────────────────────────────────
function DField({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={d.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

function DRow({ label, sub, children }) {
  return (
    <div style={d.row}>
      <div>
        <p style={d.rowLabel}>{label}</p>
        {sub && <p style={d.rowSub}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function PasswordField({ label, value, visible, onChange, onToggle }) {
  return (
    <DField label={label}>
      <div style={d.inputWrap}>
        <input
          style={d.inputInner}
          type={visible ? "text" : "password"}
          placeholder="••••••••"
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete="new-password"
        />
        <button
          style={d.eyeBtn}
          type="button"
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          title={visible ? "Hide password" : "Show password"}
          onClick={onToggle}
        >
          {visible ? <FiEyeOff size={14} /> : <FiEye size={14} />}
        </button>
      </div>
    </DField>
  );
}

function DSwitch({ checked, defaultChecked, disabled = false, onChange }) {
  const [on, setOn] = useState(checked ?? defaultChecked ?? false);
  useEffect(() => {
    if (checked !== undefined) setOn(checked);
  }, [checked]);
  const toggle = () => {
    if (disabled) return;
    const v = !on;
    setOn(v);
    onChange?.(v);
  };
  return (
    <div onClick={toggle} style={{ ...d.sw, ...(on ? d.swOn : {}), ...(disabled ? d.swDisabled : {}) }}>
      <div style={{ ...d.swThumb, ...(on ? d.swThumbOn : {}) }} />
    </div>
  );
}

// ── Main Header ──────────────────────────────────────────────
function DashboardHeader({ user, onLogout, socketConnected, profileOpen, onToggleProfile }) {
  const { clockFormat } = useSettings();
  const [time,    setTime]    = useState(null);
  const [mounted, setMounted] = useState(false);
  const avatarRef = useRef(null);
  const serverOffsetRef = useRef(0);

  const displayName  = user?.name || user?.email || "User";

  useEffect(() => {
    setMounted(true);
    let alive = true;
    const syncServerTime = async () => {
      try {
        const startedAt = Date.now();
        const data = await getServerTime();
        const serverTime = new Date(data?.iso).getTime();
        if (!alive || !Number.isFinite(serverTime)) return;
        const roundTrip = Date.now() - startedAt;
        const nextOffset = serverTime + roundTrip / 2 - Date.now();
        serverOffsetRef.current = nextOffset;
      } catch {
        if (alive) {
          serverOffsetRef.current = 0;
        }
      }
    };
    syncServerTime();
    const syncInterval = setInterval(syncServerTime, 5 * 60 * 1000);
    const interval = setInterval(() => setTime(new Date(Date.now() + serverOffsetRef.current)), 1000);
    setTime(new Date(Date.now() + serverOffsetRef.current));
    return () => {
      alive = false;
      clearInterval(interval);
      clearInterval(syncInterval);
    };
  }, []);

  const live        = socketConnected !== undefined ? !!socketConnected : true;
  const signalColor = live ? "#16a34a" : "#dc2626";

  if (!mounted) return null;

  return (
    <div className="dashboard-topbar" style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      gap: 16, flexWrap: "wrap",
      padding: "16px 24px", borderBottom: "1px solid var(--border)",
      backgroundColor: "var(--surface-strong)", position: "relative", zIndex: 100,
    }}>

      <h1 className="dashboard-topbar-title" style={{
        margin: 0, fontSize: 18, color: "var(--text)",
        fontWeight: 900, lineHeight: 1.15,
      }}>
        Asset Tracking Dashboard
      </h1>

      <div className="dashboard-topbar-actions" style={{ display: "flex", alignItems: "center", gap: "clamp(10px, 2vw, 20px)", flexWrap: "wrap" }}>

        {/* LIVE badge */}
        <div className="dashboard-live-badge" style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "6px 10px", border: "1px solid var(--border)",
          borderRadius: "8px", backgroundColor: "var(--surface-muted)",
        }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: signalColor }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: live ? "#16a34a" : "#dc2626" }}>
            {live ? "LIVE" : "OFFLINE"}
          </span>
        </div>

        {/* Clock */}
        <div className="dashboard-server-clock" style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--muted)" }}>
          <FiClock />
          <span>{formatTime(time, clockFormat)}</span>
        </div>

        {/* Avatar */}
        {user && (
          <div ref={avatarRef} style={{ position: "relative" }}>
              <div
                onClick={onToggleProfile}
              className="dashboard-profile-trigger"
              style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
              title="Profile & settings"
            >
              <div style={{
                width: 38, height: 38, borderRadius: 999,
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                color: "#ffffff", display: "flex", alignItems: "center",
                justifyContent: "center", fontWeight: 800,
                boxShadow: "0 10px 18px rgba(37,99,235,0.22)", flex: "0 0 auto",
              }}>
                {getInitials({ name: displayName })}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                  {displayName}
                </span>
                {user?.role && (
                  <span style={{
                    fontSize: 10, color: "var(--muted)",
                    fontWeight: 500, letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}>
                    {String(user.role)}
                  </span>
                )}
              </div>
            </div>

            {profileOpen && (
              <ProfileDropdown
                user={user}
                onClose={onToggleProfile}
                anchorRef={avatarRef}
              />
            )}
          </div>
        )}

        {/* Sign out */}
        {typeof onLogout === "function" && (
          <button
            onClick={onLogout}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 12px", borderRadius: 10,
              border: "1px solid var(--border)", background: "var(--surface-strong)",
              cursor: "pointer", fontWeight: 800, fontSize: 12, color: "var(--text)",
            }}
          >
            <FiLogOut />
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────
const d = {
  panelHead:    { display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface-muted)" },
  panelAvatar:  { width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 },
  panelName:    { margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text)" },
  panelEmail:   { margin: 0, fontSize: 11, color: "var(--muted)" },
  closeBtn:     { background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center", marginLeft: "auto", padding: 4 },

  tabs:         { display: "flex", borderBottom: "1px solid var(--border)", padding: "0 16px", overflowX: "auto" },
  tabBtn:       { background: "none", border: "none", padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "var(--muted)", cursor: "pointer", borderBottom: "2px solid transparent", whiteSpace: "nowrap" },
  tabActive:    { color: "var(--primary-ui)", borderBottom: "2px solid var(--primary-ui)" },

  body:         { padding: "14px 16px", maxHeight: "min(440px, calc(100dvh - 190px))", overflowY: "auto" },

  sectionLabel: { fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" },
  sectionSub:   { fontSize: 11, color: "var(--muted)", margin: "0 0 10px" },

  fieldLabel:   { display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-soft)", marginBottom: 3 },
  input:        { width: "100%", padding: "7px 10px", fontSize: 12, borderRadius: 7, border: "1px solid var(--border)", outline: "none", boxSizing: "border-box", fontFamily: "inherit", color: "var(--text)", background: "var(--surface-strong)" },

  inputWrap:    { position: "relative", display: "flex", alignItems: "center" },
  inputInner:   { width: "100%", padding: "7px 30px 7px 10px", fontSize: 12, borderRadius: 7, border: "1px solid var(--border)", outline: "none", boxSizing: "border-box", fontFamily: "inherit", color: "var(--text)", background: "var(--surface-strong)" },
  eyeBtn:       { position: "absolute", right: 8, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center", padding: 0 },

  row:          { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)" },
  rowLabel:     { fontSize: 12, fontWeight: 600, margin: "0 0 1px", color: "var(--text)" },
  rowSub:       { fontSize: 10, color: "var(--muted)", margin: 0 },

  toggleGroup:  { display: "flex", gap: 3, background: "var(--surface-muted)", borderRadius: 8, padding: 3, marginTop: 8 },
  toggleBtn:    { flex: 1, padding: "6px 0", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", background: "transparent", color: "var(--muted)", cursor: "pointer" },
  toggleOn:     { background: "var(--surface-strong)", color: "var(--primary-ui)", border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  themeChoiceRow: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 10 },
  themeChoice: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-muted)", color: "var(--text-soft)", cursor: "pointer", fontSize: 12, fontWeight: 700 },
  themeChoiceOn: { background: "var(--primary-soft)", color: "var(--primary-ui)", border: "1px solid var(--primary-ui)" },

  sw:           { width: 34, height: 18, borderRadius: 9, background: "var(--border-strong)", position: "relative", cursor: "pointer", flexShrink: 0, transition: "background .2s" },
  swOn:         { background: "var(--primary-ui)" },
  swDisabled:   { cursor: "not-allowed", opacity: 0.5 },
  swThumb:      { position: "absolute", width: 12, height: 12, borderRadius: "50%", background: "#fff", top: 3, left: 3, transition: "transform .2s" },
  swThumbOn:    { transform: "translateX(16px)" },

  divider:      { height: 1, background: "var(--border)", margin: "12px 0" },
  saveRow:      { display: "flex", alignItems: "center", gap: 10, marginTop: 10 },
  saveBtn:      { padding: "7px 16px", fontSize: 12, fontWeight: 700, background: "var(--primary-ui)", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer" },
  savedMsg:     { fontSize: 11, color: "#16a34a", fontWeight: 600 },
  error:        { fontSize: 11, color: "#dc2626", margin: "4px 0", fontWeight: 500 },
};

export default DashboardHeader;
