import { Link } from 'react-router-dom';
import PriorityPreferences from '../../components/PriorityPreferences';

export default function AnimalDashboard() {
  return (
    <div className="space-y-8">
      <section className="rounded-[2.5rem] bg-amber-100 px-8 py-10">
        <p className="text-sm uppercase tracking-[0.22em] text-amber-800">Animal husbandry dashboard</p>
        <h1 className="mt-2 text-4xl font-semibold text-slate-900">Donations intended for animal use</h1>
        <p className="mt-3 max-w-2xl text-stone-700">
          Browse available donations whose intended use was explicitly declared by the donor as animal feed / husbandry use.
          Your organization arranges pickup using its own transport.
        </p>
      </section>

      <div className="flex flex-wrap gap-4">
        <Link
          to="/animal/available-food"
          className="inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          View available feed listings
        </Link>
        <Link
          to="/animal/requests"
          className="inline-flex rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-stone-50"
        >
          My requests and pickups
        </Link>
      </div>

      <PriorityPreferences />
    </div>
  );
}
