// pages/index.js
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import React from "react";
import Header from "../components/Header";

// Dynamically import the map component so it never runs on the server
const MapWithMarker = dynamic(() => import("../components/MapWithMarker"), { ssr: false });

export default function Home() {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function fetchLocation() {
      try {
        const res = await fetch("/api/location");
        const json = await res.json();
        if (mounted) setLocation(json.data || null);
      } catch (err) {
        console.error("Failed to fetch location:", err);
      }
    }
    fetchLocation();
    const interval = setInterval(fetchLocation, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: 20, textAlign: "center" }}>
      <h1> Smart IoT Multipurpose Tracker</h1>
      <p>Track your device’s location and status in real-time.</p>

      {location ? (
        <MapWithMarker location={location} label="Device #1" />
      ) : (
        <p>Loading device location…</p>
      )}
    </div>
  );
}
