import { Routes, Route } from 'react-router-dom';
import { Shell } from './components/Shell';
import Home from './pages/Home';
import Onboarding from './pages/Onboarding';
import Ebook from './pages/Ebook';
import Learn from './pages/Learn';
import ModulePage from './pages/Module';
import Evaluate from './pages/Evaluate';
import Report from './pages/Report';
import Coach from './pages/Coach';
import Progress from './pages/Progress';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import Capture from './pages/Capture';

export default function App() {
  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/playbook" element={<Ebook />} />
      <Route path="/ebook" element={<Ebook />} />
      <Route
        path="*"
        element={
          <Shell>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/learn/:slug" element={<ModulePage />} />
              <Route path="/evaluate" element={<Evaluate />} />
              <Route path="/capture" element={<Capture />} />
              <Route path="/evaluate/:id" element={<Report />} />
              <Route path="/coach" element={<Coach />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </Shell>
        }
      />
    </Routes>
  );
}
