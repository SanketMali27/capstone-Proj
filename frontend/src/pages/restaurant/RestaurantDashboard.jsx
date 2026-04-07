import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RestaurantDashboard() {
  const { user } = useAuth();

  const cards = [
    { title: 'Create a new listing', to: '/restaurant/add-listing', copy: 'Add surplus food and classify it instantly.' },
    { title: 'Track active listings', to: '/restaurant/listings', copy: 'See which items are available, claimed, or picked up.' },
    { title: 'Review analytics', to: '/restaurant/analytics', copy: 'Understand waste patterns and tomorrow’s preparation guidance.' }
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-[2.5rem] bg-slate-900 px-8 py-10 text-white">
        <p className="text-sm uppercase tracking-[0.22em] text-white">Restaurant dashboard</p>
        <h1 className="mt-2 text-4xl font-semibold">{user?.organizationName || user?.name}</h1>
        <p className="mt-3 max-w-2xl text-white/90">
          Publish surplus food, monitor category changes, and reduce avoidable waste with live operational signals.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.to} to={card.to} className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-1">
            <h2 className="text-2xl font-semibold text-slate-900">{card.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">{card.copy}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
