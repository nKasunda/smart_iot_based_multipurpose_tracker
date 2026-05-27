// pages/mapview.js
import dynamic from "next/dynamic";
import React from "react";
import Header from "../components/Header";

// Dynamically import the map component so it never runs on the server
const MapWithMarker = dynamic(() => import("../components/MapWithMarker"), { ssr: false });

export default function MapView() {
  const demoLocation = {
    latitude: -13.9626,
    longitude: 33.7741,
    timestamp: new Date().toLocaleString(),
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <Header />
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h1>Smart IoT Multipurpose Tracker</h1>
        <p>Track your device's location and status in real-time.</p>
        <MapWithMarker location={demoLocation} label="Device #1" />
      </div>
    </div>
  );
}
