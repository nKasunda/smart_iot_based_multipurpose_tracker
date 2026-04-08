import React, { useState } from "react";
import SideMenu from "@/components/SideMenu";
import DashboardHeader from "@/components/DashboardHeader";
import GoogleMapView from "@/components/DashboardSections/GoogleMapView";
import Overview from "@/components/DashboardSections/Overview"; // keep this
// Import shared alerts logic
import AlertPanel from "@/components/Alerts/AlertPanel";
import { useAlerts } from "@/components/Alerts/useAlerts";
import SettingsPanel from "@/components/Settings/SettingsPanel";

export function LiveMap() {
  return (
    <div style={{ flex:1, display: "flex", flexDirection: "column" }}>
      <GoogleMapView fullScreen={true} />
    </div>
  );
}

// Dummy section components
function AssetList() {
  return <div>📋 Asset List Content</div>;
}
function Alerts() {
  return <AlertPanel />;
}
function Settings() {
  return <SettingsPanel />;
}

// Map label → component
const sectionComponents = {
  Overview, // imported component directly
  "Live Map": LiveMap,
  "Asset List": AssetList,
  Alerts,
  Settings,
};

export default function AdminDashboard() {
  const [menuOpen, setMenuOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("Overview");
  // Get alerts from shared hook
  const { alerts } = useAlerts();

// Count only warnings
  const warnings = alerts.filter(a => a.type === "warning").length;
  const ActiveComponent = sectionComponents[activeSection];

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <SideMenu
        isOpen={menuOpen}
        toggle={() => setMenuOpen(!menuOpen)}
        activeItem={activeSection}
        onSelect={setActiveSection} // SPA behavior
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <DashboardHeader />

        {/* Main content */}
        <main
          style={{
            flex: 1,
            padding: "24px",
            backgroundColor: "#f8fafc",
            overflowY: "auto",
          }}
        >
          <ActiveComponent warnings={warnings} />
        </main>
      </div>
    </div>
  );
}

