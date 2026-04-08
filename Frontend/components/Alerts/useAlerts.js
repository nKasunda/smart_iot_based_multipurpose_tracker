import { useState, useEffect } from "react";

// Custom hook to manage alerts globally
export function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(new Set());

  // Load alerts from localStorage on mount
  useEffect(() => {
    const savedAlerts = localStorage.getItem("alerts");
    const savedDismissed = localStorage.getItem("dismissedAlerts");
    
    if (savedAlerts) {
      try {
        setAlerts(JSON.parse(savedAlerts));
      } catch (e) {
        console.error("Error loading alerts from localStorage:", e);
      }
    }
    
    if (savedDismissed) {
      try {
        setDismissedIds(new Set(JSON.parse(savedDismissed)));
      } catch (e) {
        console.error("Error loading dismissed alerts:", e);
      }
    }
  }, []);

  // Save alerts to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("alerts", JSON.stringify(alerts));
  }, [alerts]);

  // Save dismissed alerts to localStorage
  useEffect(() => {
    localStorage.setItem("dismissedAlerts", JSON.stringify(Array.from(dismissedIds)));
  }, [dismissedIds]);

  // Dismiss an alert
  const dismissAlert = (alertId) => {
    setDismissedIds(prev => new Set(prev).add(alertId));
  };

  // Clear all alerts
  const clearAllAlerts = () => {
    setAlerts([]);
    setDismissedIds(new Set());
    localStorage.removeItem("alerts");
    localStorage.removeItem("dismissedAlerts");
  };

  // Mark alert as read
  const markAsRead = (alertId) => {
    setAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId ? { ...alert, isRead: true } : alert
      )
    );
  };

  // Mark alert as resolved (backend status)
  const markAsResolved = (alertId) => {
    setAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId ? { ...alert, isResolved: true, resolvedAt: new Date().toISOString() } : alert
      )
    );
  };

  // Get active alerts (not dismissed)
  const activeAlerts = alerts.filter(alert => !dismissedIds.has(alert.id));

  return { 
    alerts: activeAlerts, 
    allAlerts: alerts,
    dismissAlert, 
    clearAllAlerts, 
    markAsRead,
    markAsResolved,
    dismissedCount: dismissedIds.size
  };
}