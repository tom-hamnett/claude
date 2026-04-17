// Root router — loads state from server, then renders pages
import { useState, useEffect } from "react";
import "./lib/theme.js";
import { loadState, useStore } from "./data/store.js";
import Landing from "./pages/Landing.jsx";
import ProgrammeHome from "./pages/ProgrammeHome.jsx";
import ProgrammeView from "./pages/ProgrammeView.jsx";
import MetricsHub from "./pages/MetricsHub.jsx";

function Loader() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg0)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, background: "var(--accent)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#000", fontFamily: "var(--font-d)", margin: "0 auto 16px" }}>◆</div>
        <div style={{ fontSize: 18, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>APEX</div>
        <div style={{ width: 20, height: 20, border: "2px solid var(--border2)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
        <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)", marginTop: 12 }}>Loading programme data…</div>
      </div>
    </div>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState({ page: "landing" });
  const [state] = useStore();

  useEffect(() => {
    loadState().then(() => setReady(true));
  }, []);

  if (!ready || !state) return <Loader />;

  if (route.page === "landing") {
    return <Landing onOpenProgramme={(id) => setRoute({ page: "home", programmeId: id })} />;
  }

  if (route.page === "home") {
    return (
      <ProgrammeHome
        programmeId={route.programmeId}
        onOpenMode={(mode) => {
          if (mode === "programme-view") setRoute({ ...route, page: "programme-view" });
          else if (mode === "metrics") setRoute({ ...route, page: "metrics" });
          else setRoute({ ...route, page: "home" });
        }}
        onNavLanding={() => setRoute({ page: "landing" })}
      />
    );
  }

  if (route.page === "programme-view") {
    return (
      <ProgrammeView
        programmeId={route.programmeId}
        onNavHome={() => setRoute({ ...route, page: "home" })}
        onNavLanding={() => setRoute({ page: "landing" })}
      />
    );
  }

  if (route.page === "metrics") {
    return (
      <MetricsHub
        programmeId={route.programmeId}
        onNavHome={() => setRoute({ ...route, page: "home" })}
        onNavLanding={() => setRoute({ page: "landing" })}
      />
    );
  }

  return <div style={{ padding: 40, color: "#fff" }}>Unknown route: {route.page}</div>;
}
