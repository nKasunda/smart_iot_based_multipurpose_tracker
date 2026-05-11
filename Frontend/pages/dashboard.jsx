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
import { SOCKET_URL } from "../lib/config";
import { getAlerts, getDevices, getLatest, getStats } from "../lib/api";
import { getToken } from "../lib/tokenStorage";

const sectionComponents = {
  Overview,
  "Live Map": LiveMap,
  Devices,
  Alerts,
  History,
};

const DASHBOARD_SECTION_KEY = "dashboard.activeSection";

export default function DashboardPage() {
  const router = useRouter();
  const auth   = useAuth();

  const [menuOpen,         setMenuOpen]         = useState(true);
  const [profileOpen,      setProfileOpen]      = useState(false);
  const [activeSection,    setActiveSection]    = useState(() => {
    if (typeof window === "undefined") return "Overview";
    try {
      return localStorage.getItem(DASHBOARD_SECTION_KEY) || "Overview";
    } catch {
      return "Overview";
    }
  });

  const [devices,          setDevices]          = useState([]);
  const [latest,           setLatest]           = useState([]);
  const [stats,            setStats]            = useState(null);
  const [alerts,           setAlerts]           = useState(null);
  const [socketConnected,  setSocketConnected]  = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  const socketRef = useRef(null);

  useEffect(() => {
    if (auth.booting) return;
    if (!auth.isAuthed) router.replace("/");
  }, [auth.booting, auth.isAuthed, router]);

  const latestByDevice = useMemo(() => {
    const map = {};
    (latest || []).forEach((row) => { map[row.device_id] = row; });
    return map;
  }, [latest]);

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

  const activeNow = useMemo(() => {
    const now = Date.now();
    return (filteredDevices || []).filter((d) => {
      if (!d.lastSeen) return false;
      const t = new Date(d.lastSeen).getTime();
      return Number.isFinite(t) && now - t < 2 * 60 * 1000;
    }).length;
  }, [filteredDevices]);

  const warningCount = useMemo(() => {
    const low      = alerts?.lowBatteryDevices?.length || 0;
    const inactive = alerts?.inactiveDevices?.length  || 0;
    return low + inactive;
  }, [alerts]);

  useEffect(() => {
    try {
      localStorage.setItem(DASHBOARD_SECTION_KEY, activeSection);
    } catch { /* ignore */ }
  }, [activeSection]);

  useEffect(() => {
    const list = filteredDevices || [];
    if (!list.length) return;
    const ids = new Set(list.map((d) => d.device_uid));
    if (!selectedDeviceId || !ids.has(selectedDeviceId)) {
      setSelectedDeviceId(list[0].device_uid);
    }
  }, [filteredDevices, selectedDeviceId]);

  const refreshAll = async () => {
    const [d, l, s, a] = await Promise.all([
      getDevices(),
      getLatest(),
      getStats(),
      getAlerts(),
    ]);
    setDevices(d  || []);
    setLatest(l   || []);
    setStats(s    || null);
    setAlerts(a   || null);
  };

  useEffect(() => {
    if (!auth.isAuthed) return;
    refreshAll().catch(() => {});
    const interval = setInterval(() => refreshAll().catch(() => {}), 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthed]);

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
  }, [auth.isAuthed]);

  const ActiveComponent = sectionComponents[activeSection] || Overview;

  if (auth.booting)   return null;
  if (!auth.isAuthed) return null;

  return (
    <div style={{ display: "flex", height: "100vh" }}>

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
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

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

        <main style={{
          flex: 1,
          padding: "24px",
          backgroundColor: "#f8fafc",
          overflowY: "auto",
        }}>
          <ActiveComponent
            user={auth.user}
            devices={filteredDevices}
            latest={filteredLatest}
            latestByDevice={latestByDevice}
            stats={stats}
            alerts={alerts}
            selectedDeviceId={selectedDeviceId}
            setSelectedDeviceId={setSelectedDeviceId}
            onRefresh={refreshAll}
            token={auth.token}
          />
        </main>
      </div>
    </div>
  );
}