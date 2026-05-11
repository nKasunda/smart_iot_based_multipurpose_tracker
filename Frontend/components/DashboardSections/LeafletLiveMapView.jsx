import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { io } from "socket.io-client";
import { api } from "../../lib/api";
import { SOCKET_URL } from "../../lib/config";
import { getToken } from "../../lib/tokenStorage";

const TrackerLeafletMap = dynamic(() => import("../TrackerLeafletMap"), { ssr: false });

function normalizeLatestRow(row) {
  // Make the payload match what TrackerLeafletMap already expects.
  // TrackerLeafletMap reads: loc.lat, loc.lng, loc.timestamp (preferred), loc.battery, loc.signalStrength/signal
  // and uses loc.deviceName/name.
  if (!row) return null;

  return {
    device_id: row.device_id ?? row.device_uid ?? row.trackerId,
    device_uid: row.device_uid ?? row.device_id ?? row.trackerId,
    trackerId: row.trackerId ?? row.device_uid ?? row.device_id,
    imei: row.imei ?? null,
    name: row.name ?? row.deviceName ?? null,
    deviceName: row.deviceName ?? row.name ?? null,
    type: row.type ?? null,
    battery: row.battery ?? null,
    signalStrength: row.signalStrength ?? row.signal_strength ?? row.signal ?? null,
    timestamp: row.timestamp ?? row.lastSeen ?? row.last_seen ?? null,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
  };
}

export default function LeafletLiveMapView({ selectedDeviceId, setSelectedDeviceId, fullHeight = true }) {
  const [latestByDevice, setLatestByDevice] = useState({});
  const latestByDeviceRef = useRef({});

  // history is not required for the Overview live map; pass empty array.
  const [socketConnected, setSocketConnected] = useState(false);

  const latestDeviceIds = useMemo(() => Object.keys(latestByDevice || {}).sort(), [latestByDevice]);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const res = await api.get("/api/tracker/latest");
        const list = Array.isArray(res.data) ? res.data : [];
        const next = {};
        for (const row of list) {
          const norm = normalizeLatestRow(row);
          if (!norm?.lat || !norm?.lng) continue;
          const id = norm.device_id ?? norm.device_uid ?? norm.trackerId;
          if (!id) continue;
          next[id] = norm;
        }
        if (!mounted) return;
        latestByDeviceRef.current = next;
        setLatestByDevice(next);

        if (!selectedDeviceId) {
          const ids = Object.keys(next);
          if (ids.length && setSelectedDeviceId) setSelectedDeviceId(ids[0]);
        }
      } catch (e) {
        console.error("Failed to bootstrap leaflet live map:", e);
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: { token },
    });

    const onLocationUpdate = ({ location }) => {
      if (!location) return;
      const deviceId = location.device_id ?? location.device_uid ?? location.trackerId;
      if (!deviceId) return;

      const nextLoc = normalizeLatestRow(location);
      if (!nextLoc) return;
      if (!Number.isFinite(nextLoc.lat) || !Number.isFinite(nextLoc.lng)) return;

      const next = { ...latestByDeviceRef.current, [deviceId]: nextLoc };
      latestByDeviceRef.current = next;
      setLatestByDevice(next);
    };

    // fallback event for older clients
    const onTrackerUpdate = ({ location, trackerId }) => {
      const loc = location || {};
      const deviceId = trackerId ?? loc.device_id ?? loc.device_uid ?? loc.trackerId;
      if (!deviceId) return;
      const nextLoc = normalizeLatestRow({ ...loc, device_id: deviceId, device_uid: deviceId, trackerId: deviceId });
      if (!nextLoc) return;
      if (!Number.isFinite(nextLoc.lat) || !Number.isFinite(nextLoc.lng)) return;

      const next = { ...latestByDeviceRef.current, [deviceId]: nextLoc };
      latestByDeviceRef.current = next;
      setLatestByDevice(next);
    };

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("location:update", onLocationUpdate);
    socket.on("tracker-update", onTrackerUpdate);

    return () => {
      socket.off("location:update", onLocationUpdate);
      socket.off("tracker-update", onTrackerUpdate);
      socket.disconnect();
    };
  }, []);

  return (
    <div style={{ width: "100%", height: fullHeight ? "100%" : undefined, display: "flex", flexDirection: "column" }}>
      <TrackerLeafletMap
        latestByDevice={latestByDevice || {}}
        selectedDeviceId={selectedDeviceId}
        onSelectDeviceId={setSelectedDeviceId}
        selectedPath={[]}
      />
      {/* Optional: could show socketConnected somewhere, but keeping UI unchanged */}
    </div>
  );
}

