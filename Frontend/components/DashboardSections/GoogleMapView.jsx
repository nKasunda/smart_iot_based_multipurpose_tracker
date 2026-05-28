import React, { useEffect, useState, useRef } from "react";
import { GoogleMap, LoadScript, Marker, InfoWindow, Polyline } from "@react-google-maps/api";
import { api } from "../../lib/api";
import { formatDateTime, useSettings } from "../../context/SettingsContext";

const containerStyle = { width: "100%", height: "clamp(340px, 70svh, 865px)" };
const trackerColors = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#9333ea", "#0ea5e9"];
const animationSteps = 14;
const animationIntervalMs = 40;
const googleMapTypes = {
  street: "roadmap",
  satellite: "satellite",
  terrain: "terrain",
};
const mapStyleOptions = [
  { key: "street", label: "Street" },
  { key: "satellite", label: "Satellite" },
  { key: "terrain", label: "Terrain" },
];

export default function GoogleMapView({ fullScreen = false }) {
  const { dateFormat, clockFormat, mapStyle, save } = useSettings();
  const [trackers, setTrackers] = useState({});
  const trackersRef = useRef({});
  const [trackersHistory, setTrackersHistory] = useState({});
  const historyRef = useRef({});
  const [activeInfo, setActiveInfo] = useState(null);
  const [selectedTracker, setSelectedTracker] = useState("");
  const [mapCenter, setMapCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);

  const syncTrackers = (nextTrackers) => {
    trackersRef.current = nextTrackers;
    setTrackers(nextTrackers);
  };

  const syncHistory = (nextHistory) => {
    historyRef.current = nextHistory;
    setTrackersHistory(nextHistory);
  };

  const centerOnTracker = (trackerId) => {
    const targetId = trackerId || selectedTracker || Object.keys(trackersRef.current)[0];
    const loc = targetId ? trackersRef.current[targetId] : mapCenter;
    if (!loc || !mapRef.current) return;

    mapRef.current.panTo({ lat: loc.lat, lng: loc.lng });
    setMapCenter({ lat: loc.lat, lng: loc.lng });
    setSelectedTracker(targetId);
  };

  const animateMarker = (trackerId, from, to) => {
    if (!from || !to || (from.lat === to.lat && from.lng === to.lng)) return;

    const deltaLat = (to.lat - from.lat) / animationSteps;
    const deltaLng = (to.lng - from.lng) / animationSteps;
    let step = 0;

    const animate = () => {
      step += 1;
      const nextPosition = {
        lat: from.lat + deltaLat * step,
        lng: from.lng + deltaLng * step,
        timestamp: to.timestamp,
      };
      const nextState = { ...trackersRef.current, [trackerId]: nextPosition };
      syncTrackers(nextState);

      if (step < animationSteps) {
        setTimeout(animate, animationIntervalMs);
      } else {
        syncTrackers({ ...trackersRef.current, [trackerId]: to });
      }
    };

    animate();
  };

  const fetchLatest = async () => {
    try {
      const res = await api.get("/api/tracker/latest");
      const trackerList = Array.isArray(res.data) ? res.data.filter((item) => item.lat != null && item.lng != null) : [];
      const nextTrackers = { ...trackersRef.current };
      const nextHistory = { ...historyRef.current };

      trackerList.forEach((tracker) => {
        const latestPoint = { lat: tracker.lat, lng: tracker.lng, timestamp: tracker.timestamp };
        const key = tracker.device_id || tracker.device_uid || tracker.trackerId;
        const existingPoint = nextTrackers[key];

        if (existingPoint) {
          if (existingPoint.lat !== latestPoint.lat || existingPoint.lng !== latestPoint.lng) {
            animateMarker(key, existingPoint, latestPoint);
          }
        } else {
          nextTrackers[key] = latestPoint;
        }

        const existingHistory = nextHistory[key] || [];
        const lastEntry = existingHistory[existingHistory.length - 1];
        if (!lastEntry || lastEntry.lat !== latestPoint.lat || lastEntry.lng !== latestPoint.lng) {
          nextHistory[key] = [...existingHistory, latestPoint];
        }
      });

      if (loading && trackerList.length > 0 && !mapCenter) {
        setMapCenter({ lat: trackerList[0].lat, lng: trackerList[0].lng });
        setSelectedTracker(trackerList[0].device_id || trackerList[0].device_uid || trackerList[0].trackerId);
      }

      syncHistory(nextHistory);
      syncTrackers(nextTrackers);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching latest trackers:", err);
    }
  };

  const fetchInitialHistory = async (trackerIds) => {
    if (!trackerIds.length) return;

    try {
      const historyPromises = trackerIds.map((id) =>
        api
          .get(`/api/tracker/${encodeURIComponent(id)}/history`)
          .then((res) => [id, res.data]),
      );

      const results = await Promise.all(historyPromises);
      const historyState = { ...historyRef.current };
      results.forEach(([id, locations]) => {
        if (Array.isArray(locations)) {
          historyState[id] = locations;
        }
      });
      syncHistory(historyState);
    } catch (err) {
      console.error("Error loading tracker history:", err);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      await fetchLatest();
      const ids = Object.keys(trackersRef.current);
      if (ids.length) await fetchInitialHistory(ids);
    };
    bootstrap();

    const interval = setInterval(fetchLatest, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setMapTypeId(googleMapTypes[mapStyle] || googleMapTypes.street);
  }, [mapStyle]);

  const trackerIds = Object.keys(trackers);
  const selectedLocation = selectedTracker ? trackers[selectedTracker] : null;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        style={{
          position: "absolute",
          zIndex: 10,
          top: 16,
          right: 16,
          display: "flex",
          gap: "10px",
          alignItems: "center",
          background: "rgba(255,255,255,0.95)",
          padding: "10px 12px",
          borderRadius: "12px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
        }}
      >
        <select
          value={selectedTracker}
          onChange={(e) => setSelectedTracker(e.target.value)}
          style={{ minWidth: "160px", padding: "8px 10px", borderRadius: "10px", border: "1px solid #d1d5db" }}
        >
          {trackerIds.length === 0 ? <option value="">No trackers</option> : null}
          {trackerIds.map((trackerId) => (
            <option key={trackerId} value={trackerId}>
              {trackerId}
            </option>
          ))}
        </select>
        <button
          onClick={() => centerOnTracker(selectedTracker || trackerIds[0])}
          style={{ padding: "8px 12px", borderRadius: "10px", border: "none", background: "#2563eb", color: "#fff", cursor: "pointer" }}
        >
          Go to marker
        </button>
        <button
          onClick={() => centerOnTracker(selectedTracker)}
          style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid #2563eb", background: "#fff", color: "#2563eb", cursor: "pointer" }}
        >
          Center map
        </button>
      </div>

      <div
        className="google-map-style-control"
        role="group"
        aria-label="Map style"
      >
        {mapStyleOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            className={mapStyle === option.key ? "is-active" : ""}
            onClick={() => save({ mapStyle: option.key })}
            aria-pressed={mapStyle === option.key}
          >
            {option.label}
          </button>
        ))}
      </div>

      <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter || { lat: -13.9626, lng: 33.7741 }}
          zoom={16}
          options={{
            zoomControl: !fullScreen,
            fullscreenControl: fullScreen,
            streetViewControl: false,
            mapTypeControl: false,
            mapTypeId: googleMapTypes[mapStyle] || googleMapTypes.street,
          }}
          onLoad={(map) => {
            mapRef.current = map;
            map.setMapTypeId(googleMapTypes[mapStyle] || googleMapTypes.street);
          }}
        >
          {trackerIds.map((trackerId, index) => {
            const path = trackersHistory[trackerId];
            if (!path || path.length < 2) return null;
            const color = trackerColors[index % trackerColors.length];
            return <Polyline key={`path-${trackerId}`} path={path} options={{ strokeColor: color, strokeOpacity: 0.9, strokeWeight: 5 }} />;
          })}

          {trackerIds.map((trackerId, index) => {
            const loc = trackers[trackerId];
            if (!loc) return null;
            const color = trackerColors[index % trackerColors.length];
            return (
              <Marker
                key={`marker-${trackerId}`}
                position={{ lat: loc.lat, lng: loc.lng }}
                onClick={() => {
                  setActiveInfo(trackerId);
                  setSelectedTracker(trackerId);
                  centerOnTracker(trackerId);
                }}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 9,
                  fillColor: color,
                  fillOpacity: 1,
                  strokeWeight: 2,
                  strokeColor: "#000",
                }}
              />
            );
          })}

          {activeInfo && trackers[activeInfo] && (
            <InfoWindow position={trackers[activeInfo]} onCloseClick={() => setActiveInfo(null)}>
              <div className="google-device-info-window">
                <div>{activeInfo}</div>
                {selectedLocation?.timestamp ? (
                  <div className="google-device-info-window__time">
                    {formatDateTime(selectedLocation.timestamp, dateFormat, clockFormat)}
                  </div>
                ) : null}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>
    </div>
  );
}
