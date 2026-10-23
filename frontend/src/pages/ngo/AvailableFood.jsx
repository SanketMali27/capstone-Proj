import { useEffect, useState } from 'react';
import { SlidersHorizontal, Filter } from 'lucide-react';
import FoodCard from '../../components/FoodCard';
import EmptyState from '../../components/EmptyState';
import PriorityPreferences from '../../components/PriorityPreferences';
import api from '../../utils/api';
import { useSocket } from '../../context/SocketContext';

export default function AvailableFood() {
  const [listings, setListings] = useState([]);
  const [filters, setFilters] = useState({
    foodType: '',
    radius: '50',
    minQuantity: '',
    maxQuantity: '',
    minPriorityScore: '',
    maxPriorityScore: '',
    sortBy: 'personal',
    urgency: '',
    demandMatch: ''
  });
  const [showPreferences, setShowPreferences] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { listingEvents } = useSocket() || {};

  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/food', { params: filters });
      setListings(response.data.data || []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load available food');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [filters.sortBy]);

  useEffect(() => {
    fetchListings();
  }, [listingEvents?.length]);

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
      {/* Header and Preferences Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-slate-600">NGO Redistribution</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">
            Available surplus donations
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Browse surplus food declared for human consumption. Ranked by your personalized priority preferences.
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

      {/* Expandable Priority Preferences Panel */}
      {showPreferences && (
        <PriorityPreferences onPreferencesUpdated={() => fetchListings()} />
      )}

      {/* Filter Bar */}
      <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-4">
          <Filter className="h-4 w-4 text-slate-600" />
          <span>Filter & Sort Available Listings</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <select
            value={filters.foodType}
            onChange={(event) => setFilters({ ...filters, foodType: event.target.value })}
            className="rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">All food types</option>
            <option value="cooked">Cooked</option>
            <option value="raw">Raw</option>
            <option value="packaged">Packaged</option>
            <option value="dairy">Dairy</option>
            <option value="bakery">Bakery</option>
            <option value="mixed">Mixed</option>
          </select>

          <input
            type="number"
            value={filters.radius}
            onChange={(event) => setFilters({ ...filters, radius: event.target.value })}
            className="rounded-2xl border border-stone-200 px-3 py-2.5 text-sm"
            placeholder="Radius (km)"
          />

          <select
            value={filters.sortBy}
            onChange={(event) => setFilters({ ...filters, sortBy: event.target.value })}
            className="rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-medium"
          >
            <option value="personal">Personalized Match (Default)</option>
            <option value="priority">Global Priority Score</option>
            <option value="distance">Nearest Distance</option>
            <option value="urgency">Urgency Level</option>
            <option value="quantity">Largest Quantity</option>
            <option value="demand">Active Demand Match</option>
          </select>

          <select
            value={filters.urgency}
            onChange={(event) => setFilters({ ...filters, urgency: event.target.value })}
            className="rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">All urgency levels</option>
            <option value="URGENT">URGENT (80+)</option>
            <option value="HIGH">HIGH (60–79.99)</option>
            <option value="MEDIUM">MEDIUM (40–59.99)</option>
            <option value="NORMAL">NORMAL (&lt;40)</option>
          </select>

          <select
            value={filters.demandMatch}
            onChange={(event) => setFilters({ ...filters, demandMatch: event.target.value })}
            className="rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">All listings</option>
            <option value="true">Active requirement match only</option>
          </select>

          <button
            type="button"
            onClick={fetchListings}
            className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Apply Filters
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-stone-100">
          <span>
            {listings.length} {listings.length === 1 ? 'donation' : 'donations'} currently available
          </span>
          <span>
            Pickup responsibility: Your organization arranges pickup using its own transport.
          </span>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>
      ) : null}

      {/* Listings Stream */}
      <div className="grid gap-5">
        {listings.map((listing) => (
          <FoodCard
            key={listing._id}
            listing={listing}
            actionLabel="Request Donation"
            onAction={claimListing}
          />
        ))}
      </div>

      {!loading && !error && listings.length === 0 ? (
        <EmptyState
          title="No available donations matched"
          description="Donations appear here when donors list surplus food intended for human / NGO redistribution."
        />
      ) : null}
    </div>
  );
}
