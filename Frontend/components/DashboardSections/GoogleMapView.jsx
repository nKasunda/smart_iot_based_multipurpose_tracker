import React, { useEffect, useState, useRef } from "react";
import { GoogleMap, LoadScript, Marker, InfoWindow, Polyline } from "@react-google-maps/api";
import axios from "axios";

const containerStyle = { width: "100%", height: "865px" };

// Colors for trackers (will loop if more trackers than colors)
const trackerColors = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#9333ea", "#0ea5e9"];

export default function GoogleMapView({ fullScreen = false }) {
  const [trackers, setTrackers] = useState({});
  const [trackersHistory, setTrackersHistory] = useState({});
  const [activeInfo, setActiveInfo] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const fetchTrackers = async () => {
      try {
        const trackerRes = await axios.get("http://192.168.7.219:5000/api/tracker");
        const trackerList = trackerRes.data;

        const newData = {};
        const newHistory = { ...trackersHistory };

        for (let i = 0; i < trackerList.length; i++) {
          const tracker = trackerList[i];
          try {
            const res = await axios.get(
              `http://192.168.7.219:5000/api/tracker/${tracker.trackerId}/history`
            );
            const locations = res.data;

            if (locations && locations.length > 0) {
              const latest = locations[locations.length - 1];
              newData[tracker.trackerId] = latest;

              if (!newHistory[tracker.trackerId]) newHistory[tracker.trackerId] = [];

              const existing = newHistory[tracker.trackerId];
              const lastExisting = existing[existing.length - 1];
              if (!lastExisting || lastExisting.lat !== latest.lat || lastExisting.lng !== latest.lng) {
                newHistory[tracker.trackerId] = [...existing, latest];
              }

              if (!mapCenter) setMapCenter({ lat: latest.lat, lng: latest.lng });
            }
          } catch (err) {
            console.warn(`No history for tracker ${tracker.trackerId}:`, err.message);
          }
        }

        setTrackers(newData);
        setTrackersHistory(newHistory);
      } catch (err) {
        console.error("Error fetching trackers:", err);
      }
    };

    fetchTrackers();
    const interval = setInterval(fetchTrackers, 3000);
    return () => clearInterval(interval);
  }, [trackersHistory, mapCenter]);

  const trackerIds = Object.keys(trackers);

  return (
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
        }}
        onLoad={(map) => (mapRef.current = map)}
      >
        {/* Draw trails */}
        {trackerIds.map((trackerId, index) => {
          const path = trackersHistory[trackerId];
          if (!path || path.length < 2) return null;

          const color = trackerColors[index % trackerColors.length];
          return (
            <Polyline
              key={trackerId}
              path={path}
              options={{
                strokeColor: color,
                strokeOpacity: 1,   // more visible
                strokeWeight: 5,    // thicker line
              }}
            />
          );
        })}

        {/* Draw markers matching trail color */}
        {trackerIds.map((trackerId, index) => {
          const loc = trackers[trackerId];
          if (!loc) return null;

          const color = trackerColors[index % trackerColors.length];

          return (
            <Marker
              key={trackerId}
              position={{ lat: loc.lat, lng: loc.lng }}
              onClick={() => setActiveInfo(trackerId)}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: color,
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#000",
              }}
            />
          );
        })}

        {/* InfoWindow */}
        {activeInfo && trackers[activeInfo] && (
          <InfoWindow
            position={{
              lat: trackers[activeInfo].lat,
              lng: trackers[activeInfo].lng,
            }}
            onCloseClick={() => setActiveInfo(null)}
          >
            <div
              style={{
                fontWeight: "700",
                color: "#000",
                backgroundColor: "#fff",
                padding: "2px 6px",
                borderRadius: "4px",
                border: "1px solid #2563eb",
              }}
            >
              {activeInfo}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </LoadScript>
  );
}