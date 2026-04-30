// pages/index.js
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import L from "leaflet";

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
  const [location, setLocation] = useState(null);

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
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={[location.latitude, location.longitude]}
            icon={pulsingIcon}
          >
            <Popup> IoT Device Location</Popup>
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
