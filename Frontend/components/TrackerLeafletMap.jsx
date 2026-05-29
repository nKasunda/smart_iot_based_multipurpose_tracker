import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const NULL_DISPLAY = "null";

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (!center || !Number.isFinite(center[0]) || !Number.isFinite(center[1])) return;
    if (map.getBounds().contains(center)) return;
    map.panTo(center, { animate: true, duration: 0.65, easeLinearity: 0.25 });
  }, [center, map]);
  return null;
}

function isValidGpsCoordinate(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  return !(Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001);
}

function AutoFitVisibleMarkers({ entries, resizeTick }) {
  const map = useMap();

  const signature = useMemo(
    () => (entries || []).map(([deviceId, loc]) => `${deviceId}:${loc.lat},${loc.lng}`).join("|"),
    [entries]
  );

  useEffect(() => {
    const points = (entries || [])
      .map(([, loc]) => [Number(loc.lat), Number(loc.lng)])
      .filter(([lat, lng]) => isValidGpsCoordinate(lat, lng));

    if (!points.length) return;

    const currentBounds = map.getBounds();
    const allVisible = points.every((point) => currentBounds.contains(point));
    if (allVisible) return;

    map.invalidateSize();

    if (points.length === 1) {
      map.setView(points[0], Math.max(map.getZoom(), 15), { animate: true });
      return;
    }

    map.fitBounds(L.latLngBounds(points), {
      padding: [48, 48],
      maxZoom: 16,
      animate: true,
    });
  }, [map, signature, entries, resizeTick]);

  return null;
}

function ResizeMapToContainer({ onResize }) {
  const map = useMap();
  const frameRef = useRef(null);

  useEffect(() => {
    const container = map.getContainer();
    if (!container || typeof ResizeObserver === "undefined") {
      map.invalidateSize({ pan: false, animate: false });
      return undefined;
    }

    const resize = () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = window.requestAnimationFrame(() => {
        map.invalidateSize({ pan: false, animate: false });
        onResize?.();
      });
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    if (container.parentElement) observer.observe(container.parentElement);
    resize();

    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      observer.disconnect();
    };
  }, [map, onResize]);

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

    const points = (entries || [])
      .map(([, loc]) => [Number(loc.lat), Number(loc.lng)])
      .filter(([lat, lng]) => isValidGpsCoordinate(lat, lng));
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
  };

  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 120);
    return () => window.clearTimeout(id);
  }, [map, entries.length]);

  return (
    <div className="leaflet-top leaflet-right tracker-map-fit-control">
      <button type="button" onClick={fitAll} title="Show active markers" aria-label="Show active markers">
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

function isActiveLocation(loc) {
  return isValidGpsCoordinate(Number(loc?.lat), Number(loc?.lng)) &&
    isOnlineFromTimestamp(loc?.timestamp || loc?.lastSeen || loc?.last_seen);
}

function getSignalInfo(signalStrength) {
  const value =
    typeof signalStrength === "number"
      ? signalStrength
      : signalStrength === null || signalStrength === undefined || signalStrength === ""
        ? null
        : Number(signalStrength);

  if (!Number.isFinite(value) || value < 0) {
    return { value: null, label: NULL_DISPLAY, quality: "", color: "#64748b" };
  }

  if (value >= 20) return { value, label: String(value), quality: "Good", color: "#16a34a" };
  if (value >= 15) return { value, label: String(value), quality: "Average", color: "#eab308" };
  return { value, label: String(value), quality: "Bad", color: "#dc2626" };
}

function getBatteryColor(battery) {
  if (battery === null || battery === undefined || battery === "") return null;
  const b = typeof battery === "number" ? battery : Number(battery);
  if (!Number.isFinite(b)) return null;
  if (b >= 75) return "#16a34a";
  if (b >= 50) return "#eab308";
  if (b >= 25) return "#f59e0b";
  return "#dc2626";
}

const TRACKER_PALETTE = ["#2563eb", "#16a34a", "#f59e0b", "#9333ea"];

function getTrackerPaletteColor(deviceId) {
  const text = String(deviceId || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return TRACKER_PALETTE[hash % TRACKER_PALETTE.length];
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
  const [mapSizeTick, setMapSizeTick] = useState(0);
  const handleMapResize = useCallback(() => setMapSizeTick((tick) => tick + 1), []);
  const allEntries = useMemo(() => Object.entries(latestByDevice || {}), [latestByDevice]);
  const entries = useMemo(
    () => allEntries.filter(([, loc]) => isValidGpsCoordinate(Number(loc?.lat), Number(loc?.lng))),
    [allEntries]
  );
  const activeEntries = useMemo(
    () => entries.filter(([, loc]) => isActiveLocation(loc)),
    [entries]
  );
  const selected = selectedDeviceId ? latestByDevice?.[selectedDeviceId] : null;
  const [pathHoverLatLng, setPathHoverLatLng] = useState(null);
  const livePath = useMemo(
    () =>
      Array.isArray(selectedPath)
        ? selectedPath.filter((p) => isValidGpsCoordinate(Number(p?.lat), Number(p?.lng)))
        : [],
    [selectedPath]
  );
  const livePathPositions = useMemo(() => livePath.map((p) => [Number(p.lat), Number(p.lng)]), [livePath]);
  const livePathBearing = useMemo(() => {
    if (livePath.length < 2) return 0;
    return getBearing(livePath[livePath.length - 2], livePath[livePath.length - 1]);
  }, [livePath]);

  const markerColorByDevice = useMemo(() => {
    const colors = {};
    entries.forEach(([deviceId, loc]) => {
      const online = isOnlineFromTimestamp(loc?.timestamp || loc?.lastSeen || loc?.last_seen);
      const batteryColor = getBatteryColor(loc.battery);
      const baseColor = batteryColor ?? getTrackerPaletteColor(deviceId);
      colors[deviceId] = online ? baseColor : "#9ca3af";
    });
    return colors;
  }, [entries]);

  const selectedPathColor = selectedDeviceId
    ? getTrackerPaletteColor(selectedDeviceId)
    : "#2563eb";

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

        const positions = path
          .filter((p) => isValidGpsCoordinate(Number(p?.lat), Number(p?.lng)))
          .map((p) => [Number(p.lat), Number(p.lng)]);
        if (positions.length < 2) return null;

        return {
          deviceId,
          positions,
          isSelected,
          routeColor: markerColorByDevice[deviceId] || "#2563eb",
        };
      })
      .filter(Boolean);
  }, [livePaths, latestByDevice, markerColorByDevice, selectedDeviceId]);

  const activeLayer = useMemo(
    () => MAP_LAYERS.find((layer) => layer.key === mapStyle) ?? MAP_LAYERS[0],
    [mapStyle]
  );


  const validCenter = selected && isActiveLocation(selected)
    ? [Number(selected.lat), Number(selected.lng)]
    : activeEntries[0]
      ? [Number(activeEntries[0][1].lat), Number(activeEntries[0][1].lng)]
      : null;

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

      <ResizeMapToContainer onResize={handleMapResize} />
      <FlyTo center={validCenter} />
      <AutoFitVisibleMarkers entries={activeEntries} resizeTick={mapSizeTick} />
      <MapStyleControl mapStyle={mapStyle} onChange={(nextStyle) => save({ mapStyle: nextStyle })} />
      <FitAllControl entries={activeEntries} />

      {/* Render paths for all online devices */}
      {allDevicePaths.map(({ deviceId, positions, isSelected, routeColor }) => {
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
                  color: routeColor,
                  weight: 7,
                  opacity: 0.32,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
              <Polyline
                positions={positions}
                interactive
                pathOptions={{
                  color: routeColor,
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
                color: routeColor,
                weight: 3,
                opacity: 0.42,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            <Polyline
              positions={positions}
              pathOptions={{
                color: routeColor,
                weight: 1.5,
                opacity: 0.72,
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
              color: "#1e3a8a",
              weight: 12,
              opacity: 0.2,
              lineCap: "round",
              lineJoin: "round",
              className: "tracker-live-route-glow",
            }}
          />
          <Polyline
            positions={livePathPositions}
            pathOptions={{
              color: selectedPathColor,
              weight: 8,
              opacity: 0.4,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
          <Polyline
            positions={livePathPositions}
            interactive
            pathOptions={{
              color: selectedPathColor,
              weight: 5,
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

      {entries.map(([deviceId, loc]) => {
        if (!isValidGpsCoordinate(Number(loc?.lat), Number(loc?.lng))) return null;
        const selectedMarker = deviceId === selectedDeviceId;
        const online = isOnlineFromTimestamp(loc?.timestamp || loc?.lastSeen || loc?.last_seen);
        const liveBattery = online ? loc.battery : null;
        const liveSignal = online ? loc?.signalStrength ?? loc?.signal ?? loc?.signal_strength : null;
        const signalInfo = getSignalInfo(liveSignal);
        const displayName = loc?.deviceName || loc?.name || deviceId;
        const batteryColor = getBatteryColor(liveBattery);
        const color = markerColorByDevice[deviceId] ?? "#9ca3af";

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
                        {liveBattery === null || liveBattery === undefined ? NULL_DISPLAY : `${liveBattery}%`}
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
