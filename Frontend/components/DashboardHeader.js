//// components/DashboardHeader.js
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiClock, FiLogOut, FiEye, FiEyeOff, FiX } from "react-icons/fi";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";

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

// ── read saved profile name/email from localStorage ──────────
function getSavedProfile() {
  try {
    const s = JSON.parse(localStorage.getItem("tracka_settings") || "{}");
    return { name: s.profileName || "", email: s.profileEmail || "" };
  } catch {
    return { name: "", email: "" };
  }
}

// ── Alerts Tab ───────────────────────────────────────────────
function AlertsTab({ alertEmail, alertPush, save, togglePush }) {
  const { alertCritical, alertWarning, alertInfo } = useSettings();

  const alertTypes = [
    {
      key:     "critical",
      label:   "Critical",
      sub:     "Requires immediate action",
      dot:     "#dc2626",
      checked: alertCritical,
    },
    {
      key:     "warning",
      label:   "Warnings",
      sub:     "Needs attention soon",
      dot:     "#f59e0b",
      checked: alertWarning,
    },
    {
      key:     "info",
      label:   "Informational",
      sub:     "General updates, no action needed",
      dot:     "#2563eb",
      checked: alertInfo,
    },
  ];

  return (
    <div>
      <p style={d.sectionLabel}>Alert channels</p>
      <DRow label="Email notifications" sub="Sent to your registered email">
        <DSwitch checked={alertEmail} onChange={v => save({ alertEmail: v })} />
      </DRow>
      <DRow label="Browser push" sub="Notified even when tab is in background">
        <DSwitch checked={alertPush} onChange={togglePush} />
      </DRow>

      <div style={d.divider} />
      <p style={d.sectionLabel}>Alert types</p>
      <p style={{ fontSize: 10, color: "#94a3b8", margin: "0 0 8px" }}>
        Choose which alert types you want to receive
      </p>

      {alertTypes.map(({ key, label, sub, dot, checked }) => (
        <div key={key} style={{ marginBottom: 4 }}>
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 12,
            padding: "8px 0", borderBottom: "1px solid #f8fafc",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: dot, flexShrink: 0,
              }} />
              <div>
                <p style={d.rowLabel}>{label}</p>
                <p style={d.rowSub}>{sub}</p>
              </div>
            </div>
            <DSwitch
              checked={checked}
              onChange={v => save({ [`alert${key.charAt(0).toUpperCase() + key.slice(1)}`]: v })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Profile Dropdown — rendered via portal ───────────────────
function ProfileDropdown({ user, onClose, isAdmin, anchorRef }) {
  const { clockFormat, alertEmail, alertPush, dateFormat, save } = useSettings();
  const { refresh } = useAuth();

  const saved = getSavedProfile();
  const [name,         setName]         = useState(saved.name  || user?.name  || "");
  const [email,        setEmail]        = useState(saved.email || user?.email || "");
  const [profileSaved, setProfileSaved] = useState(false);
  const [displayName,  setDisplayName]  = useState(saved.name  || user?.name  || user?.email || "User");
  const [displayEmail, setDisplayEmail] = useState(saved.email || user?.email || "");

  const [current,     setCurrent]     = useState("");
  const [nextPw,      setNextPw]      = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [pwError,     setPwError]     = useState("");
  const [pwSaved,     setPwSaved]     = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext,    setShowNext]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [tab, setTab] = useState("profile");

  const [pos, setPos] = useState({ top: 70, right: 24 });
  useEffect(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({
        top:   rect.bottom + 10,
        right: window.innerWidth - rect.right,
      });
    }
  }, [anchorRef]);

  const saveProfile = async () => {
    try {
      const cur = JSON.parse(localStorage.getItem("tracka_settings") || "{}");
      const next = { ...cur, profileName: name, profileEmail: email };
      localStorage.setItem("tracka_settings", JSON.stringify(next));
      setDisplayName(name || user?.email || "User");
      setDisplayEmail(email);
    } catch { /* ignore */ }
    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      if (typeof refresh === "function") await refresh();
    } catch { /* backend not ready yet */ }
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const savePassword = async () => {
    setPwError("");
    if (nextPw !== confirm) { setPwError("Passwords do not match.");         return; }
    if (nextPw.length < 8)  { setPwError("Minimum 8 characters required."); return; }
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next: nextPw }),
      });
      if (res.ok) {
        setPwSaved(true);
        setCurrent(""); setNextPw(""); setConfirm("");
        setTimeout(() => setPwSaved(false), 2500);
      } else {
        setPwError("Current password is incorrect.");
      }
    } catch {
      setPwError("Something went wrong. Please try again.");
    }
  };

  const togglePush = async (checked) => {
    if (checked) {
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
    ...(isAdmin ? [{ id: "admin", label: "Admin" }] : []),
  ];

  const panel = (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 99998, background: "transparent" }}
      />

      <div style={{
        position: "fixed", top: pos.top, right: pos.right,
        width: 340, background: "#ffffff", borderRadius: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        border: "1px solid #e5e7eb", overflow: "hidden", zIndex: 99999,
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

              <div style={d.divider} />
              <p style={d.sectionLabel}>Change password</p>

              <DField label="Current password">
                <div style={d.inputWrap}>
                  <input style={d.inputInner}
                    type={showCurrent ? "text" : "password"}
                    placeholder="••••••••"
                    value={current} onChange={e => setCurrent(e.target.value)} />
                  <button style={d.eyeBtn} type="button"
                    onClick={() => setShowCurrent(v => !v)}>
                    {showCurrent ? <FiEye size={14} /> : <FiEyeOff size={14} />}
                  </button>
                </div>
              </DField>
              <DField label="New password">
                <div style={d.inputWrap}>
                  <input style={d.inputInner}
                    type={showNext ? "text" : "password"}
                    placeholder="••••••••"
                    value={nextPw} onChange={e => setNextPw(e.target.value)} />
                  <button style={d.eyeBtn} type="button"
                    onClick={() => setShowNext(v => !v)}>
                    {showNext ? <FiEye size={14} /> : <FiEyeOff size={14} />}
                  </button>
                </div>
              </DField>
              <DField label="Confirm new password">
                <div style={d.inputWrap}>
                  <input style={d.inputInner}
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirm} onChange={e => setConfirm(e.target.value)} />
                  <button style={d.eyeBtn} type="button"
                    onClick={() => setShowConfirm(v => !v)}>
                    {showConfirm ? <FiEye size={14} /> : <FiEyeOff size={14} />}
                  </button>
                </div>
              </DField>
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
                      border:     `1px solid ${dateFormat === fmt ? "#2563eb" : "#e2e8f0"}`,
                      cursor:     "pointer", fontSize: 12, fontWeight: 500,
                      color:      dateFormat === fmt ? "#2563eb" : "#0f172a",
                      background: dateFormat === fmt ? "#eff6ff" : "#f8fafc",
                      transition: "all .15s",
                    }}
                  >
                    <div style={{
                      width: 14, height: 14, borderRadius: "50%",
                      border:     `2px solid ${dateFormat === fmt ? "#2563eb" : "#cbd5e1"}`,
                      background: dateFormat === fmt ? "#2563eb" : "transparent",
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
              alertEmail={alertEmail}
              alertPush={alertPush}
              save={save}
              togglePush={togglePush}
            />
          )}

          {/* ── ADMIN TAB ── */}
          {tab === "admin" && isAdmin && (
            <div>
              <p style={d.sectionLabel}>Admin controls</p>
              <DRow label="Allow self-registration" sub="Users can sign up without invite">
                <DSwitch defaultChecked={false} onChange={v => save({ selfRegister: v })} />
              </DRow>
              <DRow label="Force 2FA for all users" sub="Require two-factor on every account">
                <DSwitch defaultChecked={false} onChange={v => save({ force2FA: v })} />
              </DRow>
              <DRow label="Global alert email override" sub="All alerts also go to shared inbox">
                <DSwitch defaultChecked={true} onChange={v => save({ globalAlertEmail: v })} />
              </DRow>
            </div>
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

function DSwitch({ checked, defaultChecked, onChange }) {
  const [on, setOn] = useState(checked ?? defaultChecked ?? false);
  useEffect(() => {
    if (checked !== undefined) setOn(checked);
  }, [checked]);
  const toggle = () => { const v = !on; setOn(v); onChange?.(v); };
  return (
    <div onClick={toggle} style={{ ...d.sw, ...(on ? d.swOn : {}) }}>
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

  const isAdmin = user?.role === "admin";

  const savedProfile = getSavedProfile();
  const displayName  = savedProfile.name || user?.name || user?.email || "User";

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const live        = socketConnected !== undefined ? !!socketConnected : true;
  const signalColor = live ? "#16a34a" : "#dc2626";

  if (!mounted) return null;

  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "16px 24px", borderBottom: "1px solid #e5e7eb",
      backgroundColor: "#ffffff", position: "relative", zIndex: 100,
    }}>

      <h1 style={{
        margin: 0, fontSize: 18, color: "#020617",
        fontWeight: 900, letterSpacing: "-0.01em", lineHeight: 1.15,
      }}>
        Asset Tracking Dashboard
      </h1>

      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>

        {/* LIVE badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "6px 10px", border: "1px solid #e5e7eb",
          borderRadius: "8px", backgroundColor: "#f9fafb",
        }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: signalColor }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: live ? "#16a34a" : "#dc2626" }}>
            {live ? "LIVE" : "OFFLINE"}
          </span>
        </div>

        {/* Clock */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#6b7280" }}>
          <FiClock />
          <span>{formatTime(time, clockFormat)}</span>
        </div>

        {/* Avatar */}
        {user && (
          <div ref={avatarRef} style={{ position: "relative" }}>
            <div
              onClick={onToggleProfile}
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
                <span style={{ fontSize: 13, fontWeight: 700, color: "#020617" }}>
                  {displayName}
                </span>
                {user?.role && (
                  <span style={{
                    fontSize: 10, color: "#94a3b8",
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
                isAdmin={isAdmin}
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
              border: "1px solid #e5e7eb", background: "#ffffff",
              cursor: "pointer", fontWeight: 800, fontSize: 12, color: "#0f172a",
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
  panelHead:    { display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" },
  panelAvatar:  { width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 },
  panelName:    { margin: 0, fontSize: 13, fontWeight: 700, color: "#020617" },
  panelEmail:   { margin: 0, fontSize: 11, color: "#94a3b8" },
  closeBtn:     { background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", marginLeft: "auto", padding: 4 },

  tabs:         { display: "flex", borderBottom: "1px solid #f1f5f9", padding: "0 16px" },
  tabBtn:       { background: "none", border: "none", padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "#94a3b8", cursor: "pointer", borderBottom: "2px solid transparent" },
  tabActive:    { color: "#2563eb", borderBottom: "2px solid #2563eb" },

  body:         { padding: "14px 16px", maxHeight: 440, overflowY: "auto" },

  sectionLabel: { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" },
  sectionSub:   { fontSize: 11, color: "#94a3b8", margin: "0 0 10px" },

  fieldLabel:   { display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 3 },
  input:        { width: "100%", padding: "7px 10px", fontSize: 12, borderRadius: 7, border: "1px solid #e2e8f0", outline: "none", boxSizing: "border-box", fontFamily: "inherit", color: "#020617" },

  inputWrap:    { position: "relative", display: "flex", alignItems: "center" },
  inputInner:   { width: "100%", padding: "7px 30px 7px 10px", fontSize: 12, borderRadius: 7, border: "1px solid #e2e8f0", outline: "none", boxSizing: "border-box", fontFamily: "inherit", color: "#020617" },
  eyeBtn:       { position: "absolute", right: 8, background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", padding: 0 },

  row:          { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid #f8fafc" },
  rowLabel:     { fontSize: 12, fontWeight: 600, margin: "0 0 1px", color: "#0f172a" },
  rowSub:       { fontSize: 10, color: "#94a3b8", margin: 0 },

  toggleGroup:  { display: "flex", gap: 3, background: "#f1f5f9", borderRadius: 8, padding: 3, marginTop: 8 },
  toggleBtn:    { flex: 1, padding: "6px 0", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", background: "transparent", color: "#64748b", cursor: "pointer" },
  toggleOn:     { background: "#ffffff", color: "#2563eb", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },

  sw:           { width: 34, height: 18, borderRadius: 9, background: "#e2e8f0", position: "relative", cursor: "pointer", flexShrink: 0, transition: "background .2s" },
  swOn:         { background: "#2563eb" },
  swThumb:      { position: "absolute", width: 12, height: 12, borderRadius: "50%", background: "#fff", top: 3, left: 3, transition: "transform .2s" },
  swThumbOn:    { transform: "translateX(16px)" },

  divider:      { height: 1, background: "#f1f5f9", margin: "12px 0" },
  saveRow:      { display: "flex", alignItems: "center", gap: 10, marginTop: 10 },
  saveBtn:      { padding: "7px 16px", fontSize: 12, fontWeight: 700, background: "#2563eb", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer" },
  savedMsg:     { fontSize: 11, color: "#16a34a", fontWeight: 600 },
  error:        { fontSize: 11, color: "#dc2626", margin: "4px 0", fontWeight: 500 },
};

export default DashboardHeader;