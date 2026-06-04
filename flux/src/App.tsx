import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import AuthGate from './components/AuthGate';
import { AuthProvider } from './services/auth';
import { isCloud } from './services/supabase';
import { seedIfEmpty } from './lib/seed';
import HomePage from './pages/HomePage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectPage from './pages/ProjectPage';
import ProcessPage from './pages/ProcessPage';
import PortfolioPage from './pages/PortfolioPage';
import KnowledgePage from './pages/KnowledgePage';
import MethodologyPage from './pages/MethodologyPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Auto-seed the worked demo only in local mode. In cloud mode, data is
        // shared across the team, so demo loading is an explicit, opt-in action.
        if (!isCloud) await seedIfEmpty();
      } catch (err) {
        console.error('Seed failed', err);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink-50">
        <div className="animate-pulse text-ink-400">Loading FLUX…</div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <AuthGate>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:id" element={<ProjectPage />} />
            <Route path="processes/:id" element={<ProcessPage />} />
            <Route path="portfolio" element={<PortfolioPage />} />
            <Route path="knowledge" element={<KnowledgePage />} />
            <Route path="methodology" element={<MethodologyPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </AuthGate>
    </AuthProvider>
  );
}
