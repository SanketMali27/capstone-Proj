import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Users,
  Clock,
  TrendingUp,
  PackageCheck,
  Layers,
  Trash2
} from 'lucide-react';
import api from '../../utils/api';

const urgencyOrder = ['URGENT', 'HIGH', 'MEDIUM', 'NORMAL'];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/admin/stats')
      .then((response) => setStats(response.data.data))
      .catch((e) => setError(e.response?.data?.message || 'Failed to fetch admin stats'))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Total Listings', value: stats?.totalDonations ?? 0, icon: Layers },
    { label: 'Available', value: stats?.counts?.available ?? 0, color: 'text-blue-700' },
    { label: 'Requested', value: stats?.counts?.requested ?? 0, color: 'text-amber-700' },
    { label: 'Claimed', value: stats?.counts?.claimed ?? 0, color: 'text-indigo-700' },
    { label: 'Completed', value: stats?.counts?.completed ?? 0, color: 'text-emerald-700' },
    { label: 'Cancelled', value: stats?.counts?.cancelled ?? 0, color: 'text-rose-700' },
    {
      label: 'Redistributed Food',
      value: `${stats?.totalQuantityRedistributed ?? 0} units`,
      color: 'text-emerald-800'
    },
    {
      label: 'Average Time to Claim',
      value: `${stats?.averageTimeToClaimMinutes ?? 0} min`,
      icon: Clock
    },
    {
      label: 'Average Pickup Time',
      value: `${stats?.averagePickupMinutes ?? 0} min`,
      icon: Clock
    }
  ];

  const urgencies = Object.fromEntries(
    (stats?.urgencyBreakdown || []).map((item) => [item._id, item.count])
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-slate-600">Platform Governance</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">
            Administrative Activity & Redistribution Impact
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Platform monitoring and verified activity metrics derived directly from actual database records.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800">
          <ShieldCheck className="h-4 w-4" />
          <span>Verified Database Records Only</span>
        </div>
      </div>

      {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>}

      {/* Primary KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className={`mt-2 text-2xl font-bold ${card.color || 'text-slate-900'}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Verified Redistribution vs Logged Waste Breakdown */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-800 font-semibold mb-4">
            <PackageCheck className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg">Redistribution vs Waste</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between rounded-xl bg-stone-50 px-4 py-3 text-sm">
              <span className="text-slate-600">Total Quantity Listed</span>
              <span className="font-semibold text-slate-900">{stats?.totalQuantity ?? 0} units</span>
            </div>
            <div className="flex justify-between rounded-xl bg-emerald-50 px-4 py-3 text-sm">
              <span className="text-emerald-800 font-medium">Quantity Redistributed</span>
              <span className="font-bold text-emerald-900">{stats?.totalQuantityRedistributed ?? 0} units</span>
            </div>
            <div className="flex justify-between rounded-xl bg-rose-50 px-4 py-3 text-sm">
              <span className="text-rose-800 font-medium">Logged Recorded Waste</span>
              <span className="font-bold text-rose-900">{stats?.wasteSummary?.totalRecordedWasted ?? 0} kg</span>
            </div>
            <div className="flex justify-between rounded-xl bg-blue-50 px-4 py-3 text-sm">
              <span className="text-blue-800 font-medium">Logged Rescued Surplus</span>
              <span className="font-bold text-blue-900">{stats?.wasteSummary?.totalRecordedClaimed ?? 0} kg</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Derived directly from completed listing quantities and logged restaurant waste entries.
          </p>
        </div>

        {/* Global Priority Distribution */}
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-800 font-semibold mb-4">
            <TrendingUp className="h-5 w-5 text-slate-700" />
            <h2 className="text-lg">Global Urgency Distribution</h2>
          </div>
          <div className="space-y-2.5">
            {urgencyOrder.map((level) => {
              const count = urgencies[level] || 0;
              const colorClass =
                level === 'URGENT'
                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                  : level === 'HIGH'
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : level === 'MEDIUM'
                      ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
                      : 'border-slate-200 bg-slate-50 text-slate-700';

              return (
                <div
                  key={level}
                  className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm ${colorClass}`}
                >
                  <span className="font-semibold">{level}</span>
                  <span className="font-bold">{count}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Calculated by the 15-minute global redistribution priority engine.
          </p>
        </div>

        {/* User Breakdown */}
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-800 font-semibold mb-4">
            <Users className="h-5 w-5 text-slate-700" />
            <h2 className="text-lg">Registered Users by Role</h2>
          </div>
          <div className="space-y-2.5">
            {(stats?.userRoleBreakdown || []).map((item) => (
              <div
                key={item._id}
                className="flex justify-between rounded-xl bg-stone-50 px-4 py-2.5 text-sm"
              >
                <span className="capitalize text-slate-700">{item._id?.replace('_', ' ')}</span>
                <span className="font-bold text-slate-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Donor and Recipient Activity */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Top Donors */}
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-800 font-semibold mb-4">
            <Building2 className="h-5 w-5 text-slate-700" />
            <h2 className="text-lg">Top Donor Restaurants</h2>
          </div>

          <div className="space-y-2.5">
            {(stats?.donorActivity || []).length > 0 ? (
              stats.donorActivity.map((donor, idx) => (
                <div
                  key={donor._id || idx}
                  className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {donor.restaurantName || 'Restaurant'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {donor.totalListings} total listings · {donor.totalQuantity} units listed
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    {donor.completedListings} completed
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 py-4 text-center">No donor activity recorded yet.</p>
            )}
          </div>
        </div>

        {/* Top Recipients */}
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-800 font-semibold mb-4">
            <Users className="h-5 w-5 text-slate-700" />
            <h2 className="text-lg">Top Recipient Activity</h2>
          </div>

          <div className="space-y-2.5">
            {(stats?.recipientActivity || []).length > 0 ? (
              stats.recipientActivity.map((recipient, idx) => (
                <div
                  key={recipient._id || idx}
                  className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {recipient.organizationName || recipient.name || 'Recipient'}
                    </p>
                    <p className="text-xs capitalize text-slate-500">
                      {recipient.role?.replace('_', ' ')} · {recipient.totalClaimed} claims
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                    {recipient.completedPickups} pickups completed
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 py-4 text-center">No recipient activity recorded yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* Monthly Listing Trends */}
      {(stats?.monthlyTrends || []).length > 0 && (
        <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            Monthly Donation Activity (Past 6 Months)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {stats.monthlyTrends.map((trend) => (
              <div key={trend.month} className="rounded-2xl border border-stone-100 bg-stone-50 p-4 text-center">
                <p className="text-xs uppercase tracking-wider text-slate-500">{trend.month}</p>
                <p className="mt-1 text-xl font-bold text-slate-800">{trend.totalListings}</p>
                <p className="text-xs text-emerald-700 font-medium">
                  {trend.completedListings} completed
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
