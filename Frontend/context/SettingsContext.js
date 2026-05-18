/// context/SettingsContext.js
import { createContext, useContext, useState, useEffect } from "react";
import { updateSettings } from "../lib/api";
import { useAuth } from "./AuthContext";

const SettingsContext = createContext();

const DEFAULT_SETTINGS = {
  uiTheme: "light",
  clockFormat: "12h",
  alertEmail: true,
  alertPush: false,
  dateFormat: "DD/MM/YYYY",
  distanceUnit: "km",
  timezone: "Africa/Lilongwe",
  alertCritical: true,
  alertWarning: true,
  alertInfo: false,
  mapStyle: "street",
};

const UI_THEMES = ["light", "dark", "device"];
const MAP_STYLES = ["street", "satellite", "terrain"];

function normalizeUiTheme(value) {
  return UI_THEMES.includes(value) ? value : DEFAULT_SETTINGS.uiTheme;
}

function normalizeMapStyle(value) {
  return MAP_STYLES.includes(value) ? value : DEFAULT_SETTINGS.mapStyle;
}

export function formatDateTime(value, dateFormat = "DD/MM/YYYY", clockFormat = "12h") {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const h = date.getHours();
  const min = String(date.getMinutes()).padStart(2, "0");

  const datePart =
    dateFormat === "MM/DD/YYYY"
      ? `${mm}/${dd}/${yyyy}`
      : dateFormat === "YYYY-MM-DD"
        ? `${yyyy}-${mm}-${dd}`
        : `${dd}/${mm}/${yyyy}`;
  const timePart =
    clockFormat === "24h"
      ? `${String(h).padStart(2, "0")}:${min}`
      : `${h % 12 || 12}:${min} ${h >= 12 ? "pm" : "am"}`;

  return `${datePart} ${timePart}`;
}

export function SettingsProvider({ children }) {
  const auth = useAuth();
  const [clockFormat,   setClockFormat]   = useState(DEFAULT_SETTINGS.clockFormat);
  const [uiTheme,       setUiTheme]       = useState(DEFAULT_SETTINGS.uiTheme);
  const [alertEmail,    setAlertEmail]    = useState(DEFAULT_SETTINGS.alertEmail);
  const [alertPush,     setAlertPush]     = useState(DEFAULT_SETTINGS.alertPush);
  const [dateFormat,    setDateFormat]    = useState(DEFAULT_SETTINGS.dateFormat);
  const [distanceUnit,  setDistanceUnit]  = useState(DEFAULT_SETTINGS.distanceUnit);
  const [timezone,      setTimezone]      = useState(DEFAULT_SETTINGS.timezone);
  const [alertCritical, setAlertCritical] = useState(DEFAULT_SETTINGS.alertCritical);
  const [alertWarning,  setAlertWarning]  = useState(DEFAULT_SETTINGS.alertWarning);
  const [alertInfo,     setAlertInfo]     = useState(DEFAULT_SETTINGS.alertInfo);
  const [preferredColorScheme, setPreferredColorScheme] = useState("light");
  const [mapStyle,      setMapStyle]      = useState(DEFAULT_SETTINGS.mapStyle);
  const effectiveTheme = uiTheme === "device" ? preferredColorScheme : uiTheme;

  const applySettings = (s = {}) => {
    if (s.uiTheme      !== undefined) setUiTheme(normalizeUiTheme(s.uiTheme));
    if (s.clockFormat  !== undefined) setClockFormat(s.clockFormat);
    if (s.mapStyle     !== undefined) setMapStyle(normalizeMapStyle(s.mapStyle));
    if (s.alertEmail   !== undefined) setAlertEmail(s.alertEmail);
    if (s.alertPush    !== undefined) setAlertPush(s.alertPush);
    if (s.dateFormat   !== undefined) setDateFormat(s.dateFormat);
    if (s.distanceUnit !== undefined) setDistanceUnit(s.distanceUnit);
    if (s.timezone     !== undefined) setTimezone(s.timezone);
    if (s.alertCritical !== undefined) setAlertCritical(s.alertCritical);
    if (s.alertWarning  !== undefined) setAlertWarning(s.alertWarning);
    if (s.alertInfo     !== undefined) setAlertInfo(s.alertInfo);
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = effectiveTheme;
    document.documentElement.dataset.themePreference = uiTheme;
    document.documentElement.style.colorScheme = effectiveTheme;
  }, [effectiveTheme, uiTheme]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const syncPreferredScheme = () => setPreferredColorScheme(query.matches ? "dark" : "light");

    syncPreferredScheme();
    if (query.addEventListener) query.addEventListener("change", syncPreferredScheme);
    else query.addListener?.(syncPreferredScheme);
    return () => {
      if (query.removeEventListener) query.removeEventListener("change", syncPreferredScheme);
      else query.removeListener?.(syncPreferredScheme);
    };
  }, []);

  // Load saved settings from localStorage on first render
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tracka_settings");
      if (saved) {
        const s = JSON.parse(saved);
        applySettings(s);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!auth.user?.settings) return;
    const next = { ...DEFAULT_SETTINGS, ...auth.user.settings };
    try {
      localStorage.setItem("tracka_settings", JSON.stringify(next));
    } catch {
      // ignore
    }
    applySettings(next);
  }, [auth.user?.settings]);

  const save = async (patch) => {
    try {
      const current = JSON.parse(localStorage.getItem("tracka_settings") || "{}");
      const next = { ...current, ...patch };
      if (next.uiTheme !== undefined) {
        next.uiTheme = normalizeUiTheme(next.uiTheme);
      }
      if (next.mapStyle !== undefined) {
        next.mapStyle = normalizeMapStyle(next.mapStyle);
      }
      localStorage.setItem("tracka_settings", JSON.stringify(next));
    } catch {
      // ignore
    }
    applySettings(patch);

    if (auth.isAuthed) {
      try {
        const res = await updateSettings(patch);
        if (res?.settings) applySettings(res.settings);
        if (typeof auth.refresh === "function") auth.refresh().catch(() => {});
      } catch {
        // Local settings still apply when offline.
      }
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        clockFormat,
        uiTheme,
        effectiveTheme,
        mapStyle,
        alertEmail,
        alertPush,
        dateFormat,
        distanceUnit,
        timezone,
        alertCritical,
        alertWarning,
        alertInfo,
        preferredColorScheme,
        save,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
