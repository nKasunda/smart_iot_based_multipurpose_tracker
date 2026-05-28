import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from "react-leaflet";
import { FiMaximize2 } from "react-icons/fi";
import L from "leaflet";
import { formatDateTime, useSettings } from "../context/SettingsContext";

const MAP_LAYERS = [
  {
    key: "street",
    label: "Street",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  {
    key: "satellite",
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 19,
  },
  {
    key: "terrain",
    label: "Terrain",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 19,
  },
];

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (!center || !Number.isFinite(center[0]) || !Number.isFinite(center[1])) return;
    map.panTo(center, { animate: true, duration: 0.75, easeLinearity: 0.25 });
  }, [center, map]);
  return null;
}

function MapStyleControl({ mapStyle, onChange }) {
  return (
    <div className="leaflet-bottom leaflet-center tracker-map-style-control">
      <div className="tracker-map-style-panel" role="group" aria-label="Map style">
        {MAP_LAYERS.map((layer) => (
          <button
            key={layer.key}
            type="button"
            className={mapStyle === layer.key ? "is-active" : ""}
            onClick={() => onChange?.(layer.key)}
            aria-pressed={mapStyle === layer.key}
          >
            {layer.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function FitAllControl({ entries }) {
  const map = useMap();

  const fitAll = () => {
    map.invalidateSize();

    const points = (entries || []).map(([, loc]) => [loc.lat, loc.lng]);
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), {
        padding: [42, 42],
        maxZoom: 16,
        animate: true,
      });
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 15, { animate: true });
      return;
    }

    map.setView([-13.9626, 33.7741], 6, { animate: true });
  };

  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 120);
    return () => window.clearTimeout(id);
  }, [map, entries.length]);

  return (
    <div className="leaflet-top leaflet-right tracker-map-fit-control">
      <button type="button" onClick={fitAll} title="Show all markers" aria-label="Show all markers">
        <FiMaximize2 size={16} />
      </button>
    </div>
  );
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

function getBearing(from, to) {
  if (!from || !to) return 0;
  const lat1 = (Number(from.lat) * Math.PI) / 180;
  const lat2 = (Number(to.lat) * Math.PI) / 180;
  const deltaLng = ((Number(to.lng) - Number(from.lng)) * Math.PI) / 180;
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function getBearingFromPositions(from, to) {
  if (!Array.isArray(from) || !Array.isArray(to)) return 0;
  return getBearing(
    { lat: from[0], lng: from[1] },
    { lat: to[0], lng: to[1] }
  );
}

function makeDeviceMarkerIcon({ color, online, selected }) {
  const classes = [
    "device-marker-outer",
    online ? "is-online" : "is-offline",
    selected ? "is-selected" : "",
    selected && online ? "is-beaming" : "",
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

function makeRouteDirectionIcon(bearing) {
  return L.divIcon({
    className: "live-route-direction-wrapper",
    html: `<div class="live-route-direction" style="--route-bearing: ${bearing}deg;"><span></span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

export default function TrackerLeafletMap({
  latestByDevice,
  selectedDeviceId,
  onSelectDeviceId,
  selectedPath,
  livePaths,
}) {
  const { dateFormat, clockFormat, mapStyle, save } = useSettings();
  const allEntries = useMemo(() => Object.entries(latestByDevice || {}), [latestByDevice]);
  const entries = useMemo(
    () => allEntries.filter(([, loc]) => Number.isFinite(loc?.lat) && Number.isFinite(loc?.lng)),
    [allEntries]
  );
  const selected = selectedDeviceId ? latestByDevice?.[selectedDeviceId] : null;
  const [pathHoverLatLng, setPathHoverLatLng] = useState(null);
  const livePath = useMemo(
    () =>
      Array.isArray(selectedPath)
        ? selectedPath.filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng))
        : [],
    [selectedPath]
  );
  const livePathPositions = useMemo(() => livePath.map((p) => [p.lat, p.lng]), [livePath]);
  const livePathBearing = useMemo(() => {
    if (livePath.length < 2) return 0;
    return getBearing(livePath[livePath.length - 2], livePath[livePath.length - 1]);
  }, [livePath]);

  // All device paths for real-time visualization
  const allDevicePaths = useMemo(() => {
    if (!livePaths) return [];
    return Object.entries(livePaths || {})
      .map(([deviceId, path]) => {
        if (!Array.isArray(path) || path.length < 2) return null;
        const isSelected = deviceId === selectedDeviceId;
        const deviceLocation = latestByDevice?.[deviceId];
        const isOnline = isOnlineFromTimestamp(deviceLocation?.timestamp || deviceLocation?.lastSeen || deviceLocation?.last_seen);

        if (!isOnline) return null;

        const positions = path.filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng)).map((p) => [p.lat, p.lng]);
        if (positions.length < 2) return null;

        return { deviceId, positions, isSelected, isOnline };
      })
      .filter(Boolean);
  }, [livePaths, latestByDevice, selectedDeviceId]);

  const activeLayer = useMemo(
    () => MAP_LAYERS.find((layer) => layer.key === mapStyle) ?? MAP_LAYERS[0],
    [mapStyle]
  );


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
        key={activeLayer.key}
        attribution={activeLayer.attribution}
        url={activeLayer.url}
        maxZoom={activeLayer.maxZoom}
      />

      <FlyTo center={validCenter} />
      <MapStyleControl mapStyle={mapStyle} onChange={(nextStyle) => save({ mapStyle: nextStyle })} />
      <FitAllControl entries={entries} />

      {/* Render paths for all online devices */}
      {allDevicePaths.map(({ deviceId, positions, isSelected, isOnline }) => {
        // Use more prominent colors for selected device
        if (isSelected) {
          return (
            <React.Fragment key={`path-${deviceId}`}>
              <Polyline
                positions={positions}
                pathOptions={{
                  color: "#0f172a",
                  weight: 12,
                  opacity: 0.18,
                  lineCap: "round",
                  lineJoin: "round",
                  className: "tracker-live-route-glow",
                }}
              />
              <Polyline
                positions={positions}
                pathOptions={{
                  color: "#38bdf8",
                  weight: 7,
                  opacity: 0.34,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
              <Polyline
                positions={positions}
                interactive
                pathOptions={{
                  color: "#2563eb",
                  weight: 4,
                  opacity: 0.95,
                  lineCap: "round",
                  lineJoin: "round",
                  className: "tracker-live-route-main",
                }}
                eventHandlers={{
                  mousemove: (e) => setPathHoverLatLng(e?.latlng || null),
                  mouseout: () => setPathHoverLatLng(null),
                }}
              >
                <Tooltip sticky direction="top" opacity={0.95} className="path-coordinate-tooltip">
                  {pathHoverLatLng
                    ? `lat: ${pathHoverLatLng.lat.toFixed(6)}, lng: ${pathHoverLatLng.lng.toFixed(6)}`
                    : "Live movement path"}
                </Tooltip>
              </Polyline>
              <Marker
                position={positions[positions.length - 1]}
                icon={makeRouteDirectionIcon(getBearingFromPositions(positions[positions.length - 2], positions[positions.length - 1]))}
                interactive={false}
                zIndexOffset={900}
              />
            </React.Fragment>
          );
        }

        // Lighter, simpler styling for non-selected device paths
        return (
          <React.Fragment key={`path-${deviceId}`}>
            <Polyline
              positions={positions}
              pathOptions={{
                color: "#94a3b8",
                weight: 3,
                opacity: 0.4,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            <Polyline
              positions={positions}
              pathOptions={{
                color: "#cbd5e1",
                weight: 1.5,
                opacity: 0.6,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </React.Fragment>
        );
      })}

      {/* Keep legacy path rendering for backward compatibility */}
      {livePathPositions.length >= 2 && !livePaths ? (
        <>
          <Polyline
            positions={livePathPositions}
            pathOptions={{
              color: "#0f172a",
              weight: 12,
              opacity: 0.18,
              lineCap: "round",
              lineJoin: "round",
              className: "tracker-live-route-glow",
            }}
          />
          <Polyline
            positions={livePathPositions}
            pathOptions={{
              color: "#38bdf8",
              weight: 7,
              opacity: 0.34,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
          <Polyline
            positions={livePathPositions}
            interactive
            pathOptions={{
              color: "#2563eb",
              weight: 4,
              opacity: 0.95,
              lineCap: "round",
              lineJoin: "round",
              className: "tracker-live-route-main",
            }}
            eventHandlers={{
              mousemove: (e) => setPathHoverLatLng(e?.latlng || null),
              mouseout: () => setPathHoverLatLng(null),
            }}
          >
            <Tooltip sticky direction="top" opacity={0.95} className="path-coordinate-tooltip">
              {pathHoverLatLng
                ? `lat: ${pathHoverLatLng.lat.toFixed(6)}, lng: ${pathHoverLatLng.lng.toFixed(6)}`
                : "Live movement path"}
            </Tooltip>
          </Polyline>
          <Marker
            position={livePathPositions[livePathPositions.length - 1]}
            icon={makeRouteDirectionIcon(livePathBearing)}
            interactive={false}
            zIndexOffset={900}
          />
        </>
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
              },
            }}
          >
            <Tooltip
              className="device-name-tooltip"
              direction="top"
              offset={[0, -12]}
              opacity={1}
            >
              {displayName}
            </Tooltip>

            <Popup className="device-location-popup">
              <div className="device-location-popup__content">
                <div className="device-location-popup__title">
                  {displayName}
                </div>
                <div className="device-location-popup__meta">
                  Device ID: <span>{deviceId}</span>
                </div>
                {loc?.imei ? (
                  <div className="device-location-popup__meta">
                    IMEI:{" "}
                    <span className="device-location-popup__mono">
                      {String(loc.imei)}
                    </span>
                  </div>
                ) : null}

                {loc.timestamp ? (
                  <div className="device-location-popup__timestamp">
                    Last update: {formatDateTime(loc.timestamp, dateFormat, clockFormat)}
                  </div>
                ) : null}

                <div className="device-location-popup__grid">
                  <div className="device-location-popup__row">
                    <span>Latitude:</span>
                    <strong>{loc.lat.toFixed(6)}</strong>
                  </div>
                  <div className="device-location-popup__row">
                    <span>Longitude:</span>
                    <strong>{loc.lng.toFixed(6)}</strong>
                  </div>

                  {"battery" in loc ? (
                    <div className="device-location-popup__row device-location-popup__row--split">
                      <span>Battery:</span>
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

                  <div className="device-location-popup__row">
                    <span>Signal strength:</span>
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
