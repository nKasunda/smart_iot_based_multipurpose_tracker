import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { io } from "socket.io-client";

import SideMenu from "../components/SideMenu";
import DashboardHeader from "../components/DashboardHeader";

import Overview from "../components/DashboardSections/Overview";
import LiveMap from "../components/DashboardSections/LiveMap";


import Devices from "../components/DashboardSections/Devices";
import Alerts from "../components/DashboardSections/Alerts";
import History from "../components/DashboardSections/History";

import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { SOCKET_URL } from "../lib/config";
import { getAlerts, getDevices, getLatest, getStats } from "../lib/api";
import { friendlyError } from "../lib/errors";
import { getToken } from "../lib/tokenStorage";

const sectionComponents = {
  Overview,
  "Live Map": LiveMap,

  Devices,
  Alerts,
  History,
};

const LIVE_PATH_TTL_MS = 2 * 60 * 1000;
const LIVE_PATH_MAX_POINTS = 5000;

function isValidGpsCoordinate(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  return !(Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001);
}

function pointFromLocation(location) {
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);
  if (!isValidGpsCoordinate(lat, lng)) return null;

  const timestamp = location?.timestamp || location?.lastSeen || location?.last_seen || new Date().toISOString();
  const time = new Date(timestamp).getTime();
  if (!Number.isFinite(time)) return null;

  return {
    lat,
    lng,
    timestamp,
    time,
    speed: location?.speed ?? null,
  };
}

function isLivePoint(point, now = Date.now()) {
  return !!point && now - point.time < LIVE_PATH_TTL_MS;
}

function sameCoordinate(a, b) {
  if (!a || !b) return false;
  return Math.abs(a.lat - b.lat) < 0.000001 && Math.abs(a.lng - b.lng) < 0.000001;
}

export default function DashboardPage() {
  const router = useRouter();
  const auth   = useAuth();
  const settings = useSettings();

  const [menuOpen,         setMenuOpen]         = useState(true);
  const [profileOpen,      setProfileOpen]      = useState(false);
  const [activeSection,    setActiveSection]    = useState("Overview");

  const [devices,          setDevices]          = useState([]);
  const [latest,           setLatest]           = useState([]);
  const [stats,            setStats]            = useState(null);
  const [alerts,           setAlerts]           = useState(null);
  const [loadError,        setLoadError]        = useState("");
  const [socketConnected,  setSocketConnected]  = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [livePaths,        setLivePaths]        = useState({});

  const socketRef = useRef(null);
  const visibleDeviceIdsRef = useRef(new Set());
  const notifiedAlertsRef = useRef(new Set());

  useEffect(() => {
    if (auth.booting) return;
    if (!auth.isAuthed) router.replace("/");
  }, [auth.booting, auth.isAuthed, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncMenu = () => {
      if (window.innerWidth <= 760) setMenuOpen(false);
    };
    syncMenu();
    window.addEventListener("resize", syncMenu);
    return () => window.removeEventListener("resize", syncMenu);
  }, []);

  const filteredDevices = useMemo(() => {
    if (!auth.user) return devices;
    if (auth.user.role === "admin") return devices;
    return devices.filter((d) => d.userId === auth.user.id || !d.userId);
  }, [devices, auth.user]);

  const filteredLatest = useMemo(() => {
    if (!auth.user) return latest;
    if (auth.user.role === "admin") return latest;
    const deviceIds = new Set(filteredDevices.map((d) => d.device_uid));
    return (latest || []).filter((l) => deviceIds.has(l.device_id));
  }, [latest, filteredDevices, auth.user]);

  const latestByDevice = useMemo(() => {
    const map = {};
    (filteredLatest || []).forEach((row) => { map[row.device_id] = row; });
    return map;
  }, [filteredLatest]);

  const selectedLivePath = useMemo(() => {
    const selectedLatest = selectedDeviceId ? latestByDevice[selectedDeviceId] : null;
    const point = pointFromLocation(selectedLatest);
    if (!isLivePoint(point)) return [];
    return livePaths[selectedDeviceId] || [];
  }, [latestByDevice, livePaths, selectedDeviceId]);

  useEffect(() => {
    visibleDeviceIdsRef.current = new Set((filteredDevices || []).map((d) => d.device_uid));
  }, [filteredDevices]);

  useEffect(() => {
    const rows = Array.isArray(filteredLatest) ? filteredLatest : [];
    const now = Date.now();

    setLivePaths((prev) => {
      const next = {};

      rows.forEach((location) => {
        const deviceId = location?.device_id || location?.device_uid || location?.trackerId;
        const point = pointFromLocation(location);
        if (!deviceId || !isLivePoint(point, now)) return;

        const existing = prev[deviceId] || [];
        const last = existing[existing.length - 1];
        const path = sameCoordinate(last, point)
          ? [...existing.slice(0, -1), { ...last, ...point }]
          : [...existing, point];

        next[deviceId] = path.slice(-LIVE_PATH_MAX_POINTS);
      });

      return next;
    });
  }, [filteredLatest]);

  const activeNow = useMemo(() => {
    const now = Date.now();
    return (filteredDevices || []).filter((d) => {
      if (!d.lastSeen) return false;
      const t = new Date(d.lastSeen).getTime();
      return Number.isFinite(t) && now - t < 2 * 60 * 1000;
    }).length;
  }, [filteredDevices]);

  const warningCount = useMemo(() => {
    if (Number.isFinite(Number(alerts?.total))) return Number(alerts.total);
    if (Array.isArray(alerts?.items)) return alerts.items.length;
    const low        = alerts?.lowBatteryDevices?.length || 0;
    const inactive   = alerts?.inactiveDevices?.length  || 0;
    const poorSignal = alerts?.poorSignalDevices?.length || 0;
    return low + inactive + poorSignal;
  }, [alerts]);

  useEffect(() => {
    const list = filteredDevices || [];
    if (!list.length) return;
    const ids = new Set(list.map((d) => d.device_uid));
    if (!selectedDeviceId || !ids.has(selectedDeviceId)) {
      setSelectedDeviceId(list[0].device_uid);
    }
  }, [filteredDevices, selectedDeviceId]);

  const refreshAll = async () => {
    const results = await Promise.allSettled([
      getDevices(),
      getLatest(),
      getStats(),
      getAlerts(),
    ]);

    const [devicesResult, latestResult, statsResult, alertsResult] = results;

    if (devicesResult.status === "fulfilled") setDevices(devicesResult.value || []);
    if (latestResult.status === "fulfilled") setLatest(latestResult.value || []);
    if (statsResult.status === "fulfilled") setStats(statsResult.value || null);
    if (alertsResult.status === "fulfilled") setAlerts(alertsResult.value || null);

    const failed = results.find((result) => result.status === "rejected");
    if (failed) {
      setLoadError(friendlyError(failed.reason, "Could not load some dashboard data from the backend."));
      throw failed.reason;
    } else {
      setLoadError("");
    }
  };

  useEffect(() => {
    if (!auth.isAuthed) return;
    refreshAll().catch(() => {});
    const interval = setInterval(() => refreshAll().catch(() => {}), 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthed, auth.user?.role]);

  useEffect(() => {
    if (!auth.isAuthed) return;
    const token = getToken();
    if (!token) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: { token },
    });

    socketRef.current = socket;
    socket.on("connect",       () => setSocketConnected(true));
    socket.on("disconnect",    () => setSocketConnected(false));
    socket.on("connect_error", () => setSocketConnected(false));

    socket.on("location:update", ({ location }) => {
      if (!location?.device_id) return;
      if (auth.user?.role !== "admin" && !visibleDeviceIdsRef.current.has(location.device_id)) return;
      setLatest((prev) => {
        const list = Array.isArray(prev) ? [...prev] : [];
        const idx  = list.findIndex((x) => x.device_id === location.device_id);
        if (idx >= 0) list[idx] = location;
        else list.unshift(location);
        return list;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [auth.isAuthed, auth.user?.role]);

  useEffect(() => {
    const items = Array.isArray(alerts?.items) ? alerts.items : [];
    if (!items.length || !settings.alertEnabled || !settings.alertPush) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    items.forEach((item) => {
      const key = item.id
        ? `alert:${item.id}`
        : `${item.type}:${item.device_uid}:${item.receivedAt || item.createdAt || item.lastSeen || item.battery || item.signalStrength || ""}`;
      if (notifiedAlertsRef.current.has(key)) return;
      notifiedAlertsRef.current.add(key);
      new Notification(`TrackA ${item.type?.replace(/_/g, " ") || "alert"}`, {
        body: item.message || `${item.device_uid || "Device"} needs attention`,
        tag: key,
      });
    });
  }, [
    alerts,
    settings.alertEnabled,
    settings.alertPush,
  ]);

  const ActiveComponent = sectionComponents[activeSection] || Overview;

  if (auth.booting)   return null;
  if (!auth.isAuthed) return null;

  return (
    <div className="dashboard-app-shell">

      {/* ── Sidebar ───────────────────────────────────────── */}
      <SideMenu
        isOpen={menuOpen}
        toggle={() => setMenuOpen(!menuOpen)}
        activeItem={activeSection}
        stats={{
          totalDevices: stats?.totalDevices ?? devices.length,
          activeNow,
          warningCount,
          socketConnected,
        }}
        onSelect={(item) => {
          if (item === "Settings") {
            setProfileOpen(v => !v);   // sidebar Settings toggles dropdown
          } else {
            setActiveSection(item);
            setProfileOpen(false);     // close dropdown when switching sections
          }
        }}
      />

      {/* ── Main area ─────────────────────────────────────── */}
      <div className="dashboard-workspace">

        <DashboardHeader
          user={auth.user}
          socketConnected={socketConnected}
          profileOpen={profileOpen}
          onToggleProfile={() => setProfileOpen(v => !v)}
          onLogout={() => {
            auth.logout();
            router.push("/");
          }}
        />

        <main className="dashboard-main-scroll">
          {loadError ? (
            <div
              role="alert"
              style={{
                marginBottom: 16,
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#991b1b",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {loadError}
            </div>
          ) : null}
          <ActiveComponent
            user={auth.user}
            devices={filteredDevices}
            latest={filteredLatest}
            latestByDevice={latestByDevice}
            stats={stats}
            alerts={alerts}
            selectedDeviceId={selectedDeviceId}
            setSelectedDeviceId={setSelectedDeviceId}
            selectedPath={selectedLivePath}
            livePaths={livePaths}
            onRefresh={refreshAll}
            token={auth.token}
          />
        </main>
      </div>
    </div>
  );
}
