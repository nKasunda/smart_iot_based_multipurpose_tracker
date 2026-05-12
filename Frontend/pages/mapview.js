// pages/mapview.js
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import React from "react";
import { useRouter } from "next/router";
import Header from "../components/Header";

// Dynamically import the map component so it never runs on the server
const MapWithMarker = dynamic(() => import("../components/MapWithMarker"), { ssr: false });

export default function MapView() {
  const router = useRouter();
  const { track, imei, token } = router.query;
  const [location, setLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState("");
  const [watchId, setWatchId] = useState(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

  // Start smartphone tracking
  useEffect(() => {
    if (track === "true" && imei && token) {
      startSmartphoneTracking();
    }
  }, [track, imei, token]);

  const sendPosition = async (position) => {
    try {
      const response = await fetch(`${API_BASE}/api/tracker/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imei,
          token,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speed: position.coords.speed || 0,
          type: "smartphone",
        }),
      });

      if (response.ok) {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date().toLocaleString(),
        });
        setTrackingStatus("Tracking active...");
      } else {
        setTrackingStatus("Error sending location");
      }
    } catch (error) {
      setTrackingStatus("Connection error");
    }
  };

  const startSmartphoneTracking = () => {
    if (!navigator.geolocation) {
      setTrackingStatus("Geolocation not supported");
      return;
    }

    setTrackingStatus("Requesting location permission...");
    setIsTracking(true);

    const id = navigator.geolocation.watchPosition(
      (position) => {
        sendPosition(position);
      },
      (error) => {
        setTrackingStatus(`Location error: ${error.message}`);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    setWatchId(id);
  };

  const stopSmartphoneTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
    setTrackingStatus("Tracking stopped");
  };

  useEffect(() => {
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      {isTracking && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            background: "#ecfdf5",
            borderRadius: 12,
            padding: "16px 20px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            border: "2px solid #16a34a",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: "#166534",
              marginBottom: 8,
            }}
          >
            Smartphone Tracking Active
          </div>
          <div style={{ fontSize: 12, color: "#166534", marginBottom: 12 }}>
            {trackingStatus}
          </div>
          <button
            onClick={stopSmartphoneTracking}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              background: "#ef4444",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Stop Tracking
          </button>
        </div>
      )}
      <Header />
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h1>Smart IoT Multipurpose Tracker</h1>
        <p>Track your device's location and status in real-time.</p>

        {location || (track === "true" && imei) ? (
          <MapWithMarker
            location={
              location || { latitude: 0, longitude: 0, timestamp: new Date().toLocaleString() }
            }
            label={imei ? "Smartphone" : "Device #1"}
          />
        ) : (
          <p>Loading device location…</p>
        )}
      </div>
    </div>
  );
}
