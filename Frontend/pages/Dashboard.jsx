import React, { useState } from "react";
import SideMenu from "@/components/SideMenu";
import DashboardHeader from "@/components/DashboardHeader";
import GoogleMapView from "@/components/DashboardSections/GoogleMapView";
import Overview from "@/components/DashboardSections/Overview";
import AssetList from "@/components/DashboardSections/AssetList";

export function LiveMap() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <GoogleMapView fullScreen={true} />
    </div>
  );
}

function Alerts() {
  return <div>Alerts Section Content</div>;
}

function Settings() {
  return <div>Settings Section Content</div>;
}

const sectionComponents = {
  Overview,
  "Live Map": LiveMap,
  "Asset List": AssetList,
  Alerts,
  Settings,
};

export default function AdminDashboard() {
  const [menuOpen, setMenuOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("Overview");

  const ActiveComponent = sectionComponents[activeSection];

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <SideMenu
        isOpen={menuOpen}
        toggle={() => setMenuOpen(!menuOpen)}
        activeItem={activeSection}
        onSelect={setActiveSection}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <DashboardHeader />

        <main
          style={{
            flex: 1,
            padding: "24px",
            backgroundColor: "#f8fafc",
            overflowY: "auto",
          }}
        >
          <ActiveComponent />
        </main>
      </div>
    </div>
  );
}
