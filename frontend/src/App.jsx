import { useState } from "react";
import SubmitForm from "./components/SubmitForm";
import MapView from "./components/MapView";
import Dashboard from "./components/Dashboard";

const TABS = [
  { id: "submit", label: "Report" },
  { id: "map", label: "Map" },
  { id: "dashboard", label: "Dashboard" },
];

export default function App() {
  const [tab, setTab] = useState("submit");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>CivicTrack</h1>
        <p>Neighbourhood civic infrastructure mapping & reporting</p>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? "page" : undefined}
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
          >
            <span aria-hidden="true">{t.id === "submit" ? "＋" : t.id === "map" ? "⌖" : "▦"}</span>
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === "submit" && (
          <SubmitForm onSubmitted={() => setRefreshKey((k) => k + 1)} />
        )}
        {tab === "map" && <MapView key={`map-${refreshKey}`} />}
        {tab === "dashboard" && <Dashboard key={`dash-${refreshKey}`} />}
      </main>
    </div>
  );
}
