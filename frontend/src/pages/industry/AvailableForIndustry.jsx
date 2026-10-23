import { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import FoodCard from '../../components/FoodCard';
import EmptyState from '../../components/EmptyState';
import PriorityPreferences from '../../components/PriorityPreferences';
import api from '../../utils/api';
import { useSocket } from '../../context/SocketContext';

export default function AvailableForIndustry() {
  const [listings, setListings] = useState([]);
  const [sortBy, setSortBy] = useState('personal');
  const [showPreferences, setShowPreferences] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { listingEvents } = useSocket() || {};

  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/food', { params: { sortBy } });
      setListings(response.data?.data || []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load industry-use food');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [sortBy]);

  useEffect(() => {
    fetchListings();
  }, [listingEvents?.length]);

  const totalBulk = useMemo(
    () => listings.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [listings]
  );

  const claimListing = async (listing) => {
    try {
      await api.put(`/food/${listing._id}/request`);
      fetchListings();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to request donation');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-slate-600">Industrial Processing</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">Available For Industry</h1>
          <p className="mt-1 text-sm text-slate-600">
            Surplus food intended for composting, anaerobic digestion, and biogas production.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPreferences((prev) => !prev)}
          className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
            showPreferences
              ? 'bg-slate-900 text-white border-slate-900'
              : 'border-stone-300 bg-white text-slate-800 hover:bg-stone-50'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {showPreferences ? 'Hide Priority Preferences' : 'Tune Ranking Preferences'}
        </button>
      </div>

      {showPreferences && (
        <PriorityPreferences onPreferencesUpdated={() => fetchListings()} />
      )}

      <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-slate-700">
            Total available bulk quantity:{' '}
            <span className="font-semibold text-slate-900">{totalBulk} units</span>
          </p>

          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-slate-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium"
            >
              <option value="personal">Personalized Match (Default)</option>
              <option value="priority">Global Priority Score</option>
              <option value="distance">Nearest Distance</option>
              <option value="quantity">Largest Quantity</option>
              <option value="urgency">Urgency Level</option>
            </select>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500 pt-3 border-t border-stone-100">
          Pickup responsibility: The accepted industrial recipient arranges transportation to collect the bulk surplus.
        </p>
      </div>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}

      <div className="grid gap-5">
        {listings.map((listing) => (
          <FoodCard
            key={listing._id}
            listing={listing}
            actionLabel="Request Collection"
            onAction={claimListing}
            note="Donor-declared intended use: Industry (such as composting or biogas processing)."
          />
        ))}
      </div>

      {!loading && !error && listings.length === 0 ? (
        <EmptyState
          title="No industry-use listings available"
          description="This page only shows available donations the donor explicitly intended for industrial processing."
        />
      ) : null}
    </div>
  );
}
