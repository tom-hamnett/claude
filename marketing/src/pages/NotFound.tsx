import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container-w py-32 text-center">
      <div className="font-display text-7xl text-ink-50">404</div>
      <p className="text-ink-300 mt-3">That page doesn't exist.</p>
      <Link to="/sigma" className="btn-primary mt-6 inline-flex">Back to Sigma</Link>
    </div>
  );
}
