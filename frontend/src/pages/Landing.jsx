import { ArrowRight, HeartHandshake, Tractor, Warehouse } from 'lucide-react';
import { Link } from 'react-router-dom';

const pillars = [
  { title: 'NGO redistribution', description: 'Match donor-declared human redistribution donations with active NGO requirements.', icon: HeartHandshake },
  { title: 'Animal recipients', description: 'Animal organizations see donations the donor explicitly intended for animal use.', icon: Tractor },
  { title: 'Industrial reuse', description: 'Industry recipients can request donations explicitly intended for composting or biogas.', icon: Warehouse }
];

export default function Landing() {
  return <div className="space-y-10">
    <section className="overflow-hidden rounded-[2.5rem] bg-hero-radial bg-slate-900 px-6 py-16 text-white shadow-panel sm:px-10"><div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center"><div><p className="mb-4 inline-flex rounded-full border border-white/30 px-4 py-2 text-xs uppercase tracking-[0.24em]">Food redistribution platform</p><h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">Connect surplus donations with recipient organizations.</h1><p className="mt-6 max-w-2xl text-lg text-white/90">FoodBridge manages donation listings, recipient requirements, location-based matching, real-time notifications, and dynamic redistribution priority.</p><div className="mt-8 flex flex-wrap gap-3"><Link to="/register" className="inline-flex items-center gap-2 rounded-full bg-clay px-6 py-3 text-sm font-semibold text-white">Get started <ArrowRight className="h-4 w-4"/></Link><Link to="/login" className="rounded-full border border-white/60 bg-white/20 px-6 py-3 text-sm font-semibold text-white">Login</Link></div></div><div className="rounded-[2rem] bg-white/15 p-6 backdrop-blur"><p className="text-sm uppercase tracking-[0.2em]">Redistribution flow</p><div className="mt-4 space-y-3 text-sm text-white/90"><p>Donor lists a surplus donation and declares its intended recipient.</p><p>FoodBridge ranks available donations by waiting time, demand, distance, quantity, and pickup availability.</p><p>Recipients request donations; donors accept and recipients confirm pickup.</p></div></div></div></section>
    <section className="grid gap-5 lg:grid-cols-3">{pillars.map(({ title, description, icon: Icon }) => <div key={title} className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm"><div className="inline-flex rounded-2xl bg-bridge-100 p-3 text-bridge-700"><Icon className="h-6 w-6"/></div><h2 className="mt-4 text-2xl font-semibold text-slate-900">{title}</h2><p className="mt-3 text-sm leading-6 text-slate-700">{description}</p></div>)}</section>
    <p className="rounded-2xl bg-stone-100 p-5 text-sm text-slate-700">FoodBridge does not independently certify, determine, or guarantee food safety. The platform facilitates redistribution and prioritizes donations operationally.</p>
  </div>;
}
