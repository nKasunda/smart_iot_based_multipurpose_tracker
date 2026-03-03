import React, { useEffect, useState } from "react";
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import axios from "axios";

const containerStyle = {
  width: "100%",
  height: "500px", // fixed height to ensure map is visible
};

const defaultCenter = { lat: -13.9626, lng: 33.7741 };

export default function GoogleMapView() {
  const [trackers, setTrackers] = useState({});

  useEffect(() => {
    const fetchTrackers = async () => {
      try {
        // 1️⃣ Fetch all trackers from backend
        const trackerRes = await axios.get("http://localhost:5000/api/tracker");
        const trackerList = trackerRes.data;

        const newData = {};

        // 2️⃣ Fetch latest location for each tracker
        for (let tracker of trackerList) {
          const res = await axios.get(
            `http://localhost:5000/api/tracker/${tracker.trackerId}/history`
          );
          const locations = res.data;

          if (locations.length > 0) {
            // store the latest location
            newData[tracker.trackerId] = locations[locations.length - 1];
          }
        }

        setTrackers(newData);
      } catch (err) {
        console.error("Error fetching trackers:", err);
      }
    };

    fetchTrackers();
    const interval = setInterval(fetchTrackers, 3000); // refresh every 3s
    return () => clearInterval(interval);
  }, []);

  // center map on the first tracker if available
  const trackerIds = Object.keys(trackers);
  const center =
    trackerIds.length > 0
      ? { lat: trackers[trackerIds[0]].lat, lng: trackers[trackerIds[0]].lng }
      : defaultCenter;

  return (
    <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={16}>
        {trackerIds.map((trackerId) => {
          const loc = trackers[trackerId];
          if (!loc) return null;

          return (
            <Marker key={trackerId} position={{ lat: loc.lat, lng: loc.lng }}>
              <InfoWindow position={{ lat: loc.lat, lng: loc.lng }}>
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
                  {trackerId}
                </div>
              </InfoWindow>
            </Marker>
          );
        })}
      </GoogleMap>
    </LoadScript>
  );
}
