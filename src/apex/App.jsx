// Root router — pages: Landing → ProgrammeHome → (ProgrammeView | MetricsHub)
import { useState } from "react";
import "./lib/theme.js";
import Landing from "./pages/Landing.jsx";
import ProgrammeHome from "./pages/ProgrammeHome.jsx";
import ProgrammeView from "./pages/ProgrammeView.jsx";
import MetricsHub from "./pages/MetricsHub.jsx";

export default function App() {
  const [route, setRoute] = useState({ page: "landing" });

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
