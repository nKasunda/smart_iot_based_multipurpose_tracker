import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (!center || !Number.isFinite(center[0]) || !Number.isFinite(center[1])) return;
    map.panTo(center, { animate: true, duration: 0.75, easeLinearity: 0.25 });
  }, [center, map]);
  return null;
}

function PopupStateSync({ onPopupDeviceChange }) {
  useMapEvents({
    popupopen: (e) => {
      const deviceId = e?.popup?._source?.options?.deviceId ?? null;
      onPopupDeviceChange?.(deviceId);
    },
    popupclose: (e) => {
      const deviceId = e?.popup?._source?.options?.deviceId ?? null;
      onPopupDeviceChange?.((prev) => (prev === deviceId ? null : prev));
    },
  });
  return null;
}

function isOnlineFromTimestamp(ts) {
  if (!ts) return false;
  const t = new Date(ts).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < 2 * 60 * 1000;
}

function getSignalInfo(signalStrength) {
  const value =
    typeof signalStrength === "number"
      ? signalStrength
      : signalStrength === null || signalStrength === undefined || signalStrength === ""
        ? null
        : Number(signalStrength);

  if (!Number.isFinite(value) || value < 0) {
    return { value: null, label: "—", quality: "Unknown", color: "#64748b" };
  }

  if (value >= 20) return { value, label: String(value), quality: "Good", color: "#16a34a" };
  if (value >= 15) return { value, label: String(value), quality: "Average", color: "#eab308" };
  return { value, label: String(value), quality: "Bad", color: "#dc2626" };
}

function makeDeviceMarkerIcon({ color, online, selected }) {
  const classes = [
    "device-marker-outer",
    online ? "is-online" : "is-offline",
    selected ? "is-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return L.divIcon({
    className: "device-marker-wrapper",
    html: `<div class="${classes}" style="--marker-color: ${color};"><div class="device-marker-pulse"></div><div class="device-marker-pulse device-marker-pulse--two"></div><div class="device-marker-ring"></div><div class="device-marker-dot"></div></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -12],
  });
}

export default function TrackerLeafletMap({
  latestByDevice,
  selectedDeviceId,
  onSelectDeviceId,
  selectedPath,
}) {
  const allEntries = useMemo(() => Object.entries(latestByDevice || {}), [latestByDevice]);
  const entries = useMemo(
    () => allEntries.filter(([, loc]) => Number.isFinite(loc?.lat) && Number.isFinite(loc?.lng)),
    [allEntries]
  );
  const selected = selectedDeviceId ? latestByDevice?.[selectedDeviceId] : null;
  const [pathHoverLatLng, setPathHoverLatLng] = useState(null);
  const [openPopupDeviceId, setOpenPopupDeviceId] = useState(null);

  const validCenter = selected && Number.isFinite(selected.lat) && Number.isFinite(selected.lng)
    ? [selected.lat, selected.lng]
    : entries[0]
      ? [entries[0][1].lat, entries[0][1].lng]
      : null;

  const getBatteryColor = (battery) => {
    if (battery === null || battery === undefined || battery === "") return null;
    const b = typeof battery === "number" ? battery : Number(battery);
    if (!Number.isFinite(b)) return null;
    if (b >= 75) return "#16a34a";
    if (b >= 50) return "#eab308";
    if (b >= 25) return "#f59e0b";
    return "#dc2626";
  };

  return (
    <MapContainer
      center={validCenter || [-13.9626, 33.7741]}
      zoom={14}
      style={{ width: "100%", height: "100%", borderRadius: 16 }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FlyTo center={validCenter} />
      <PopupStateSync onPopupDeviceChange={setOpenPopupDeviceId} />

      {Array.isArray(selectedPath) && selectedPath.length >= 2 ? (
        <Polyline
          positions={selectedPath.map((p) => [p.lat, p.lng])}
          interactive
          pathOptions={{
            color: "#2563eb",
            weight: 4,
            opacity: 0.85,
            dashArray: "5, 5",
          }}
          eventHandlers={{
            mousemove: (e) => setPathHoverLatLng(e?.latlng || null),
            mouseout: () => setPathHoverLatLng(null),
          }}
        >
          <Tooltip sticky direction="top" opacity={0.95}>
            {pathHoverLatLng
              ? `lat: ${pathHoverLatLng.lat.toFixed(6)}, lng: ${pathHoverLatLng.lng.toFixed(6)}`
              : "Move along path"}
          </Tooltip>
        </Polyline>
      ) : null}

      {entries.map(([deviceId, loc], idx) => {
        if (!Number.isFinite(loc?.lat) || !Number.isFinite(loc?.lng)) return null;
        const selectedMarker = deviceId === selectedDeviceId;
        const online = isOnlineFromTimestamp(loc?.timestamp || loc?.lastSeen || loc?.last_seen);
        const signalInfo = getSignalInfo(loc?.signalStrength ?? loc?.signal ?? loc?.signal_strength);
	        const displayName = loc?.deviceName || loc?.name || deviceId;
	        const batteryColor = getBatteryColor(loc.battery);
	        const baseColor = batteryColor ?? ["#2563eb", "#16a34a", "#f59e0b", "#9333ea"][idx % 4];
	        const color = online ? (selectedMarker ? "#ef4444" : baseColor) : "#9ca3af";

	        return (
          <Marker
            key={deviceId}
            position={[loc.lat, loc.lng]}
            deviceId={deviceId}
            icon={makeDeviceMarkerIcon({ color, online, selected: selectedMarker })}
            zIndexOffset={selectedMarker ? 1000 : online ? 400 : 0}
            eventHandlers={{
              click: () => {
                onSelectDeviceId?.(deviceId);
                setOpenPopupDeviceId(deviceId);
              },
            }}
          >
            {openPopupDeviceId === deviceId ? null : (
              <Tooltip
                className="device-name-tooltip"
                direction="top"
                offset={[0, -12]}
                opacity={1}
              >
                {displayName}
              </Tooltip>
            )}

            <Popup>
              <div
                style={{
                  minWidth: 240,
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 8, color: "#020617" }}>
                  {displayName}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
                  Device ID: <span style={{ fontWeight: 700, color: "#0f172a" }}>{deviceId}</span>
                </div>
                {loc?.imei ? (
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
                    IMEI:{" "}
                    <span
                      style={{
                        fontWeight: 800,
                        color: "#0f172a",
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                        fontSize: 11,
                      }}
                    >
                      {String(loc.imei)}
                    </span>
                  </div>
                ) : null}

                {loc.timestamp ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      marginBottom: 10,
                      paddingBottom: 10,
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    Last update: {new Date(loc.timestamp).toLocaleString()}
                  </div>
                ) : null}

                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Latitude:</span>
                    <span style={{ fontWeight: 600 }}>{loc.lat.toFixed(6)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Longitude:</span>
                    <span style={{ fontWeight: 600 }}>{loc.lng.toFixed(6)}</span>
                  </div>

                  {"battery" in loc ? (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: 8,
                        borderTop: "1px solid #e5e7eb",
                      }}
                    >
                      <span style={{ color: "#6b7280" }}>Battery:</span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: batteryColor || "#9ca3af",
                        }}
                      >
                        {loc.battery ?? "—"}%
                      </span>
                    </div>
                  ) : null}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ color: "#6b7280" }}>Signal strength:</span>
                    <span style={{ fontWeight: 800, color: signalInfo.color }}>
                      {signalInfo.label}
                      {signalInfo.quality ? ` (${signalInfo.quality})` : ""}
                    </span>
                  </div>

                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
