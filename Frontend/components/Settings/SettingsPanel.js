import { useState } from "react";
import { useSettings } from "./useSettings";
import { Bell, Palette, Zap, Shield, Save, RotateCcw } from "lucide-react";

export default function SettingsPanel() {
  const {
    settings,
    hasUnsavedChanges,
    updateSetting,
    resetToDefaults,
    saveChanges,
    isMuted
  } = useSettings();

  const [activeTab, setActiveTab] = useState("alerts");

  const tabs = [
    { id: "alerts", label: "Alerts", icon: Bell },
    { id: "display", label: "Display", icon: Palette },
    { id: "system", label: "System", icon: Zap },
    { id: "security", label: "Security", icon: Shield }
  ];

  const handleSave = () => {
    saveChanges();
  };

  const handleReset = () => {
    if (confirm("Reset all settings to defaults?")) {
      resetToDefaults();
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your preferences and account settings.</p>
      </div>

      <div className="bg-white border-b border-slate-200 px-6">
        <nav className="grid grid-cols-1 gap-2 py-4 md:grid-cols-4">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "border-sky-500 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <IconComponent className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-6">
        {activeTab === "alerts" && (
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Alerts</h2>
              <div className="mt-6 space-y-3">
                {[
                  { key: "soundEnabled", label: "Sound alerts" },
                  { key: "toastEnabled", label: "In-app alerts" },
                  { key: "desktopEnabled", label: "Desktop alerts" }
                ].map((item) => (
                  <label key={item.key} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <span className="text-sm font-medium text-slate-900">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={settings.notifications[item.key]}
                      onChange={(e) => updateSetting(`notifications.${item.key}`, e.target.checked)}
                      className="h-5 w-5 rounded text-sky-600 focus:ring-sky-500"
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Behavior</h2>
              <div className="mt-6 space-y-3">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Auto-dismiss</label>
                  <select
                    value={settings.alerts.autoDismissTime / 1000}
                    onChange={(e) => updateSetting("alerts.autoDismissTime", parseInt(e.target.value) * 1000)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none"
                  >
                    <option value="3">3s</option>
                    <option value="5">5s</option>
                    <option value="10">10s</option>
                    <option value="30">30s</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Max visible</label>
                  <select
                    value={settings.alerts.maxVisibleAlerts}
                    onChange={(e) => updateSetting("alerts.maxVisibleAlerts", parseInt(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="30">30</option>
                    <option value="50">50</option>
                  </select>
                </div>

                <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span className="text-sm font-medium text-slate-900">Auto-mark read</span>
                  <input
                    type="checkbox"
                    checked={settings.alerts.autoMarkRead}
                    onChange={(e) => updateSetting("alerts.autoMarkRead", e.target.checked)}
                    className="h-5 w-5 rounded text-sky-600 focus:ring-sky-500"
                  />
                </label>

                <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span className="text-sm font-medium text-slate-900">Critical priority</span>
                  <input
                    type="checkbox"
                    checked={settings.alerts.criticalPriority}
                    onChange={(e) => updateSetting("alerts.criticalPriority", e.target.checked)}
                    className="h-5 w-5 rounded text-sky-600 focus:ring-sky-500"
                  />
                </label>
              </div>
            </section>
          </div>
        )}

        {activeTab === "display" && (
          <div className="grid gap-4 xl:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Theme</h2>
              <select
                value={settings.ui.theme}
                onChange={(e) => updateSetting("ui.theme", e.target.value)}
                className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Font size</h2>
              <select
                value={settings.ui.fontSize}
                onChange={(e) => updateSetting("ui.fontSize", e.target.value)}
                className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Language</h2>
              <select
                value={settings.ui.language}
                onChange={(e) => updateSetting("ui.language", e.target.value)}
                className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
              <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.ui.compactView}
                  onChange={(e) => updateSetting("ui.compactView", e.target.checked)}
                  className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
                />
                Compact layout
              </label>
            </section>
          </div>
        )}

        {activeTab === "system" && (
          <>
            <div className="grid gap-4 xl:grid-cols-3">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Auto refresh</h2>
                <label className="mt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.data.autoRefresh}
                    onChange={(e) => updateSetting("data.autoRefresh", e.target.checked)}
                    className="h-5 w-5 rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-sm text-slate-700">Enabled</span>
                </label>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Cache data</h2>
                <label className="mt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.data.cacheEnabled}
                    onChange={(e) => updateSetting("data.cacheEnabled", e.target.checked)}
                    className="h-5 w-5 rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-sm text-slate-700">Enabled</span>
                </label>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Exports</h2>
                <label className="mt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.data.exportEnabled}
                    onChange={(e) => updateSetting("data.exportEnabled", e.target.checked)}
                    className="h-5 w-5 rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-sm text-slate-700">Enabled</span>
                </label>
              </section>
            </div>

            <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Connection timeout</h2>
              <select
                value={settings.data.connectionTimeout / 1000}
                onChange={(e) => updateSetting("data.connectionTimeout", parseInt(e.target.value) * 1000)}
                className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none"
              >
                <option value="5">5 sec</option>
                <option value="10">10 sec</option>
                <option value="30">30 sec</option>
                <option value="60">60 sec</option>
              </select>
            </section>
          </>
        )}

        {activeTab === "security" && (
          <div className="grid gap-4 xl:grid-cols-2">
            {[
              { key: "twoFactorEnabled", label: "Two-factor authentication" },
              { key: "sessionManagement", label: "Session management" },
              { key: "dataPrivacy", label: "Privacy mode" }
            ].map((item) => (
              <label key={item.key} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="text-sm font-medium text-slate-900">{item.label}</span>
                <input
                  type="checkbox"
                  checked={settings.security[item.key]}
                  onChange={(e) => updateSetting(`security.${item.key}`, e.target.checked)}
                  className="h-5 w-5 rounded text-sky-600 focus:ring-sky-500"
                />
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              hasUnsavedChanges
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            <Save className="w-4 h-4" />
            Save
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}