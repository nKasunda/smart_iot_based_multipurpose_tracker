import React, { useEffect } from "react";
import { useRouter } from "next/router";

export default function PhoneTrackerPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

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
        <h1>Redirecting...</h1>
      </div>
    </div>
  );
}
