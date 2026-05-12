import React, { useEffect } from "react";
import { useRouter } from "next/router";

export default function PhoneTrackerPage() {
  const router = useRouter();
  const { imei, token } = router.query;

  useEffect(() => {
    if (imei && token) {
      // Redirect to live map with tracking parameters
      router.replace(`/mapview?track=true&imei=${encodeURIComponent(imei)}&token=${encodeURIComponent(token)}`);
    }
  }, [imei, token, router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          textAlign: "center",
          color: "white",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 20 }}>📍</div>
        <h1>Initializing location tracker...</h1>
        <p>Redirecting you to the map view...</p>
      </div>
    </div>
  );
}