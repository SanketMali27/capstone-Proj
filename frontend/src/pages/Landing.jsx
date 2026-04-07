import { ArrowRight, ShieldCheck, Tractor, Warehouse } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const pillars = [
  {
    title: 'Smart Human Recovery',
    description: 'Safe food is automatically routed to NGOs with safety-aware expiry windows and live countdowns.',
    icon: ShieldCheck
  },
  {
    title: 'Animal Feed Diversion',
    description: 'Listings downgrade automatically for animal husbandry owners when human-safe windows close.',
    icon: Tractor
  },
  {
    title: 'Industrial Reuse',
    description: 'Food that is no longer fit for humans or animals can still be collected for composting and biogas.',
    icon: Warehouse
  }
];
export default function Landing() {

  const { userlogin, setUserLogin } = useState(false); // Placeholder for actual auth state
  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-[2.5rem] bg-hero-radial bg-slate-900 px-6 py-16 text-white shadow-panel sm:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-white/30 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white">
              Intelligent Food Waste Management
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
              Connect surplus food with the right recipient before it becomes waste.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-white/90">
              FoodBridge combines safety scoring, auto-classification, live expiry tracking, and role-based routing so every
              surplus batch gets the best possible second life.
            </p>
            {userlogin && (
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" className="inline-flex items-center gap-2 rounded-full bg-clay px-6 py-3 text-sm font-semibold text-white">
                  Start Onboarding
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/login" className="rounded-full border border-white/60 bg-white/20 px-6 py-3 text-sm font-semibold text-white">
                  Login
                </Link>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <div className="rounded-[2rem] bg-white/15 p-6 backdrop-blur">
              <p className="text-sm uppercase tracking-[0.2em] text-white">Auto-routing flow</p>
              <div className="mt-4 space-y-3 text-sm text-white/90">
                <p>Restaurant adds listing</p>
                <p>Safety engine predicts safe window</p>
                <p>Nearby NGOs, farms, or industry units get notified</p>
                <p>Auto-downgrade cron updates category over time</p>
              </div>
            </div>
            <div className="rounded-[2rem] bg-white p-6 text-slate-900">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-600">Why it works</p>
              <p className="mt-3 text-3xl font-semibold">Three receivers. One recovery pipeline.</p>
              <p className="mt-3 text-sm text-slate-700">
                Human, animal, and industrial reuse are treated as a continuum instead of separate systems.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {pillars.map(({ title, description, icon: Icon }) => (
          <div key={title} className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
            <div className="inline-flex rounded-2xl bg-bridge-100 p-3 text-bridge-700">
              <Icon className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-slate-900">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">{description}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
