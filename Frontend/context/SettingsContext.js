/// context/SettingsContext.js
import { createContext, useContext, useState, useEffect } from "react";

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [clockFormat,   setClockFormat]   = useState("12h");
  const [alertEmail,    setAlertEmail]    = useState(true);
  const [alertPush,     setAlertPush]     = useState(false);
  const [dateFormat,    setDateFormat]    = useState("DD/MM/YYYY");
  const [distanceUnit,  setDistanceUnit]  = useState("km");
  const [timezone,      setTimezone]      = useState("Africa/Lilongwe");
  const [alertCritical,  setAlertCritical]  = useState(false);  // ← default OFF
  const [alertWarning,   setAlertWarning]   = useState(false);  // ← default OFF
  const [alertInfo,      setAlertInfo]      = useState(true);   // ← default ON

  // Load saved settings from localStorage on first render
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tracka_settings");
      if (saved) {
        const s = JSON.parse(saved);
        if (s.clockFormat  !== undefined) setClockFormat(s.clockFormat);
        if (s.alertEmail   !== undefined) setAlertEmail(s.alertEmail);
        if (s.alertPush    !== undefined) setAlertPush(s.alertPush);
        if (s.dateFormat   !== undefined) setDateFormat(s.dateFormat);
        if (s.distanceUnit !== undefined) setDistanceUnit(s.distanceUnit);
        if (s.timezone     !== undefined) setTimezone(s.timezone);
        if (s.alertCritical !== undefined) setAlertCritical(s.alertCritical);
        if (s.alertWarning   !== undefined) setAlertWarning(s.alertWarning);
        if (s.alertInfo      !== undefined) setAlertInfo(s.alertInfo);
      }
    } catch {
      // ignore
    }
  }, []);

  const save = (patch) => {
    try {
      const current = JSON.parse(localStorage.getItem("tracka_settings") || "{}");
      const next = { ...current, ...patch };
      localStorage.setItem("tracka_settings", JSON.stringify(next));
    } catch {
      // ignore
    }
    if (patch.clockFormat  !== undefined) setClockFormat(patch.clockFormat);
    if (patch.alertEmail   !== undefined) setAlertEmail(patch.alertEmail);
    if (patch.alertPush    !== undefined) setAlertPush(patch.alertPush);
    if (patch.dateFormat   !== undefined) setDateFormat(patch.dateFormat);
    if (patch.distanceUnit !== undefined) setDistanceUnit(patch.distanceUnit);
    if (patch.timezone     !== undefined) setTimezone(patch.timezone);
    if (patch.alertCritical !== undefined) setAlertCritical(patch.alertCritical);
    if (patch.alertWarning  !== undefined) setAlertWarning(patch.alertWarning);
    if (patch.alertInfo     !== undefined) setAlertInfo(patch.alertInfo);
  };

  return (
    <SettingsContext.Provider value={{
      clockFormat,
      alertEmail,
      alertPush,
      dateFormat,
      distanceUnit,
      timezone,
      alertCritical,
      alertWarning,
      alertInfo,
      save,
    }}
>      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);