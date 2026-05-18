// pages/index.js
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import L from "leaflet";
import { useSettings } from "../context/SettingsContext";

const MAP_LAYERS = {
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
  terrain: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
};

function MapStyleControl({ mapStyle, save }) {
  return (
    <div className="leaflet-bottom leaflet-center tracker-map-style-control">
      <div className="tracker-map-style-panel" role="group" aria-label="Map style">
        {["street", "satellite", "terrain"].map((style) => (
          <button
            key={style}
            type="button"
            className={mapStyle === style ? "is-active" : ""}
            onClick={() => save({ mapStyle: style })}
            aria-pressed={mapStyle === style}
          >
            {style === "satellite" ? "Satellite" : style[0].toUpperCase() + style.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

// Beating marker icon
const pulsingIcon = L.divIcon({
  className: "pulsing-marker",
  html: `<div class="pulse"></div>`,
  iconSize: [20, 20],
});

// Component that recenters the map whenever coords change
function Recenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], 13, { animate: true });
    }
  }, [lat, lng, map]);
  return null;
}

export default function Home() {
  const { mapStyle, save } = useSettings();
  const [location, setLocation] = useState(null);
  const activeLayer = MAP_LAYERS[mapStyle] || MAP_LAYERS.street;

  // Fetch latest location every 5s
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const res = await fetch("/api/location");
        const data = await res.json();
        setLocation(data.data || data); // supports your API format
      } catch (err) {
        console.error("Error fetching location:", err);
      }
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ height: "100vh" }}>
      {location ? (
        <MapContainer
          center={[location.latitude, location.longitude]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            key={mapStyle}
            attribution={activeLayer.attribution}
            url={activeLayer.url}
          />
          <MapStyleControl mapStyle={mapStyle} save={save} />
          <Marker
            position={[location.latitude, location.longitude]}
            icon={pulsingIcon}
          >
            <Popup className="device-location-popup">IoT Device Location</Popup>
          </Marker>
          <Recenter lat={location.latitude} lng={location.longitude} />
        </MapContainer>
      ) : (
        <p>Loading location...</p>
      )}

      <style jsx global>{`
        .pulse {
          width: 20px;
          height: 20px;
          background: rgba(0, 123, 255, 0.7);
          border-radius: 50%;
          animation: pulse-animation 1.5s infinite;
        }
        @keyframes pulse-animation {
          0% {
            transform: scale(0.9);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.3;
          }
          100% {
            transform: scale(0.9);
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}
