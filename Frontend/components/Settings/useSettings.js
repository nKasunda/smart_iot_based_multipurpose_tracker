import { useState, useEffect } from "react";

// Custom React hook for managing application settings
// Provides centralized state management, persistence, and utility functions for settings

// Default settings structure - defines all available settings with their default values
const DEFAULT_SETTINGS = {
  // Alert-related settings - control notification behavior and alert display
  notifications: {
    soundEnabled: true,      // Enable/disable sound notifications
    toastEnabled: true,      // Show/hide toast notifications
    desktopEnabled: false,   // Enable desktop notifications
    muteUntil: null,         // Timestamp when notifications are muted until
  },
  alerts: {
    autoDismissTime: 5000,   // Auto-dismiss toast notifications after this time (ms)
    maxVisibleAlerts: 30,    // Maximum number of alerts to show at once
    historyRetention: 7,     // How long to keep alert history (days)
    autoMarkRead: false,     // Auto-mark alerts as read when viewed
    criticalPriority: true,  // Always show critical alerts first
    groupSimilar: false,     // Group similar alerts together
    refreshInterval: 5000,   // How often to refresh alert data (ms)
  },

  // General UI settings - control appearance and user interface
  ui: {
    theme: "light",          // UI theme: "light", "dark", or "auto"
    language: "en",          // Interface language code
    fontSize: "medium",      // Font size: "small", "medium", "large"
    compactView: false,      // Enable compact spacing/layout
  },

  // Data & performance settings - control data handling and app performance
  data: {
    autoRefresh: true,       // Enable automatic data refresh
    cacheEnabled: true,      // Enable data caching for offline use
    exportEnabled: true,     // Enable data export features
    connectionTimeout: 10000, // Connection timeout in milliseconds
  },

  // User preferences - personal settings and defaults
  user: {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // User's timezone
    units: "metric",         // Unit system: "metric" or "imperial"
    defaultDashboard: "Overview", // Default dashboard section to show
    sessionTimeout: 30,      // Auto-logout after this many minutes
  },

  // Security settings - privacy and security features
  security: {
    twoFactorEnabled: false, // Enable two-factor authentication
    sessionManagement: true, // Enable session management features
    dataPrivacy: true,       // Enable data privacy controls
  }
};

// Main custom hook function - provides settings state and management functions
export function useSettings() {
  // State for current settings - starts with defaults, gets loaded from localStorage
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  // Loading state - true while loading settings from localStorage
  const [isLoading, setIsLoading] = useState(true);
  // Track if user has made changes that haven't been saved yet
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load settings from localStorage when component mounts
  useEffect(() => {
    const savedSettings = localStorage.getItem("userSettings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // Merge saved settings with defaults (handles new settings added later)
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.error("Error loading settings from localStorage:", e);
        // Fall back to defaults if saved settings are corrupted
        setSettings(DEFAULT_SETTINGS);
      }
    }
    setIsLoading(false); // Mark loading as complete
  }, []);

  // Save settings to localStorage whenever settings change (but not during loading)
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("userSettings", JSON.stringify(settings));
    }
  }, [settings, isLoading]);

  // Function to update a specific setting using dot notation (e.g., "ui.theme")
  const updateSetting = (path, value) => {
    setSettings(prev => {
      const newSettings = { ...prev };  // Create a copy of current settings
      const keys = path.split('.');     // Split path into nested keys
      let current = newSettings;        // Start at root of settings object

      // Navigate to the nested property (create objects if they don't exist)
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};  // Create nested object if missing
        current = current[keys[i]];  // Move deeper into the object
      }

      // Set the final property value
      current[keys[keys.length - 1]] = value;
      return newSettings;  // Return the updated settings object
    });
    setHasUnsavedChanges(true);  // Mark that there are unsaved changes
  };

  // Function to update multiple settings at once (bulk update)
  const updateSettings = (updates) => {
    setSettings(prev => ({ ...prev, ...updates }));  // Merge updates into current settings
    setHasUnsavedChanges(true);  // Mark as having unsaved changes
  };

  // Function to reset all settings back to default values
  const resetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS);  // Set settings to defaults
    localStorage.removeItem("userSettings");  // Remove saved settings from localStorage
    setHasUnsavedChanges(true);  // Mark as having changes (the reset itself)
  };

  // Function to mark changes as saved (clears the unsaved changes flag)
  const saveChanges = () => {
    setHasUnsavedChanges(false);  // Clear the unsaved changes indicator
  };

  // Function to check if notifications are currently muted
  const isMuted = () => {
    if (!settings.notifications.muteUntil) return false;  // Not muted if no mute time set
    return new Date() < new Date(settings.notifications.muteUntil);  // Check if current time is before mute expiry
  };

  // Function to mute notifications for a specified duration in minutes (or unmute if null)
  const muteNotifications = (durationMinutes) => {
    const muteUntil = durationMinutes
      ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()  // Calculate future timestamp
      : null;  // Set to null to unmute
    updateSetting("notifications.muteUntil", muteUntil);  // Update the mute setting
  };

  // Function to get the current theme, resolving "auto" to actual light/dark based on system preference
  const getCurrentTheme = () => {
    if (settings.ui.theme === "auto") {
      // Check system preference for dark mode
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return settings.ui.theme;  // Return the explicit theme setting
  };

  // Function to export current settings as a JSON string for backup/download
  const exportSettings = () => {
    return JSON.stringify(settings, null, 2);  // Pretty-print with 2-space indentation
  };

  // Function to import settings from a JSON string (returns true on success, false on error)
  const importSettings = (jsonString) => {
    try {
      const imported = JSON.parse(jsonString);  // Parse the JSON string
      setSettings({ ...DEFAULT_SETTINGS, ...imported });  // Merge with defaults for safety
      setHasUnsavedChanges(true);  // Mark as having unsaved changes
      return true;  // Success
    } catch (e) {
      console.error("Error importing settings:", e);  // Log any parsing errors
      return false;  // Failure
    }
  };

  // Return all the state and functions that components can use
  return {
    settings,           // Current settings object
    isLoading,          // Whether settings are still loading from localStorage
    hasUnsavedChanges,  // Whether user has made changes that need saving
    updateSetting,      // Function to update a single setting
    updateSettings,     // Function to update multiple settings
    resetToDefaults,    // Function to reset to default settings
    saveChanges,        // Function to mark changes as saved
    isMuted,            // Function to check if notifications are muted
    muteNotifications,  // Function to mute/unmute notifications
    getCurrentTheme,    // Function to get resolved theme (handles auto mode)
    exportSettings,     // Function to export settings as JSON
    importSettings      // Function to import settings from JSON
  };
}
