import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
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
        await seedIfEmpty();
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
  );
}
