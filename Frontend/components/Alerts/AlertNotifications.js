import { useEffect, useState } from "react";

export default function AlertNotifications({ alert }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (alert && alert.type === "critical") {
      setVisible(true);

      // Play sound for critical alerts
      playAlertSound();

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [alert]);

  const playAlertSound = () => {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // 800 Hz frequency for critical alert
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  if (!visible || !alert) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        background: "#ff4444",
        color: "white",
        padding: "16px 20px",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        zIndex: 9999,
        animation: "slideInRight 0.3s ease",
        maxWidth: "300px"
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <strong style={{ fontSize: "14px" }}>🔴 Critical Alert</strong>
          <p style={{ margin: "6px 0 0 0", fontSize: "13px" }}>
            {alert.assetId}: {alert.message}
          </p>
        </div>
        <button
          onClick={() => setVisible(false)}
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            cursor: "pointer",
            fontSize: "18px",
            marginLeft: "10px",
            padding: "0"
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
