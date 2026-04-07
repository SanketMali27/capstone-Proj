import { Link } from 'react-router-dom';

export default function AnimalDashboard() {
  return (
    <div className="space-y-8">
      <section className="rounded-[2.5rem] bg-amber-100 px-8 py-10">
        <p className="text-sm uppercase tracking-[0.22em] text-amber-800">Animal husbandry dashboard</p>
        <h1 className="mt-2 text-4xl font-semibold text-slate-900">Track downgraded food suitable for animals</h1>
        <p className="mt-3 max-w-2xl text-stone-700">
          These listings are no longer safe for human use, but they still have time left before they should move to industrial processing.
        </p>
      </section>

      <Link to="/animal/available-food" className="inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white">
        View available feed listings
      </Link>
    </div>
  );
}

