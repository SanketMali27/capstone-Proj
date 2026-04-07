import { Link } from 'react-router-dom';

export default function NGODashboard() {
  return (
    <div className="space-y-8">
      <section className="rounded-[2.5rem] bg-white p-8 shadow-sm">
        <p className="text-sm uppercase tracking-[0.22em] text-slate-600">NGO dashboard</p>
        <h1 className="mt-2 text-4xl font-semibold text-slate-900">Recover safe food before it expires</h1>
        <p className="mt-3 max-w-2xl text-slate-700">
          Focus on human-safe listings, claim quickly, and verify pickup conditions for quality traceability.
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Link to="/ngo/available-food" className="rounded-[2rem] bg-slate-900 p-8 text-white shadow-sm">
          <h2 className="text-2xl font-semibold">Available food</h2>
          <p className="mt-3 text-sm text-white/90">View live human-safe listings sorted by expiry and distance.</p>
        </Link>
        <Link to="/ngo/claimed-food" className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Claimed food</h2>
          <p className="mt-3 text-sm text-slate-700">Confirm pickup and record food condition notes.</p>
        </Link>
      </div>
    </div>
  );
}
