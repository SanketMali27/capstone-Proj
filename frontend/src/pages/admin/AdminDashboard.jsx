import { useEffect, useState } from 'react';
import api from '../../utils/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/admin/stats');
        setStats(response.data.data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Failed to fetch admin stats');
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-slate-600">Admin view</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Platform-wide activity overview</h1>
      </div>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Listings today</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats?.totalListingsToday ?? 0}</p>
        </div>
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Claimed this month</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats?.claimedVsWastedThisMonth?.claimed ?? 0}</p>
        </div>
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Wasted this month</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats?.claimedVsWastedThisMonth?.wasted ?? 0}</p>
        </div>
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Tracked categories</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats?.categoryBreakdown?.length ?? 0}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Users by role</h2>
          <div className="mt-4 space-y-3">
            {(stats?.userRoleBreakdown || []).map((item) => (
              <div key={item._id} className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <span className="capitalize text-slate-800">{item._id?.replace('_', ' ')}</span>
                <span className="font-semibold text-slate-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Listings by category</h2>
          <div className="mt-4 space-y-3">
            {(stats?.categoryBreakdown || []).map((item) => (
              <div key={item._id} className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <span className="capitalize text-slate-800">{item._id}</span>
                <span className="font-semibold text-slate-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
