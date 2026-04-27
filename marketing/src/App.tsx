import { Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import SigmaLanding from './pages/SigmaLanding';
import SigmaPricing from './pages/SigmaPricing';
import SigmaUnlock from './pages/SigmaUnlock';
import SigmaPrivacy from './pages/SigmaPrivacy';
import NotFound from './pages/NotFound';

export default function App() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<SigmaLanding />} />
          <Route path="/sigma" element={<SigmaLanding />} />
          <Route path="/sigma/pricing" element={<SigmaPricing />} />
          <Route path="/sigma/unlock" element={<SigmaUnlock />} />
          <Route path="/sigma/privacy" element={<SigmaPrivacy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
