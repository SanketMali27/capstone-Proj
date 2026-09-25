import { Link } from 'react-router-dom';

export default function IndustryDashboard() {
  return (
    <div className="space-y-8">
      <section className="rounded-[2.5rem] bg-rose-100 px-8 py-10">
        <p className="text-sm uppercase tracking-[0.22em] text-rose-700">Industry dashboard</p>
        <h1 className="mt-2 text-4xl font-semibold text-slate-900">Collect surplus food for composting and biogas</h1>
        <p className="mt-3 max-w-2xl text-stone-700">
          Browse available donations whose intended use was explicitly declared by the donor for industrial processing.
        </p>
      </section>

      <Link to="/industry/available-food" className="inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white">
        View industrial-use listings
      </Link>
    </div>
  );
}

