import { useEffect, useState } from 'react';
import FoodCard from '../../components/FoodCard';
import EmptyState from '../../components/EmptyState';
import api from '../../utils/api';
import { useSocket } from '../../context/SocketContext';

export default function AvailableFood() {
  const [listings, setListings] = useState([]);
  const [filters, setFilters] = useState({ foodType: '', radius: '50', minQuantity: '', maxQuantity: '', minPriorityScore: '', maxPriorityScore: '', sortBy: 'priority', urgency: '', demandMatch: '' });
  const [error, setError] = useState('');
  const { listingEvents } = useSocket() || {};

  const fetchListings = async () => {
    try {
      const response = await api.get('/food', { params: filters });
      setListings(response.data.data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load available food');
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    fetchListings();
  }, [listingEvents?.length]);

  const claimListing = async (listing) => {
    await api.put(`/food/${listing._id}/request`);
    fetchListings();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Available donations for NGO redistribution</h1>
        <div className="mt-5 grid gap-3 md:grid-cols-6">
          <select
            value={filters.foodType}
            onChange={(event) => setFilters({ ...filters, foodType: event.target.value })}
            className="rounded-2xl border border-stone-200 px-4 py-3"
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
            className="rounded-2xl border border-stone-200 px-4 py-3"
            placeholder="Radius km"
          />
          <select value={filters.sortBy} onChange={(event) => setFilters({ ...filters, sortBy: event.target.value })} className="rounded-2xl border border-stone-200 px-4 py-3">
            <option value="priority">Highest priority</option><option value="urgency">Urgency</option><option value="distance">Nearest</option><option value="quantity">Quantity</option><option value="demand">Demand match</option>
          </select>
          <select value={filters.urgency} onChange={(event) => setFilters({ ...filters, urgency: event.target.value })} className="rounded-2xl border border-stone-200 px-4 py-3">
            <option value="">All urgency levels</option><option>URGENT</option><option>HIGH</option><option>MEDIUM</option><option>NORMAL</option>
          </select>
          <select value={filters.demandMatch} onChange={(event) => setFilters({ ...filters, demandMatch: event.target.value })} className="rounded-2xl border border-stone-200 px-4 py-3">
            <option value="">All demand matches</option><option value="true">Active requirement match</option>
          </select>
          <input
            type="number"
            value={filters.minQuantity}
            onChange={(event) => setFilters({ ...filters, minQuantity: event.target.value })}
            className="rounded-2xl border border-stone-200 px-4 py-3"
            placeholder="Min quantity"
          />
          <input
            type="number"
            value={filters.maxQuantity}
            onChange={(event) => setFilters({ ...filters, maxQuantity: event.target.value })}
            className="rounded-2xl border border-stone-200 px-4 py-3"
            placeholder="Max quantity"
          />
          <input
            type="number"
            min="0"
            max="100"
            value={filters.minPriorityScore}
            onChange={(event) => setFilters({ ...filters, minPriorityScore: event.target.value })}
            className="rounded-2xl border border-stone-200 px-4 py-3"
            placeholder="Min priority"
          />
          <input
            type="number"
            min="0"
            max="100"
            value={filters.maxPriorityScore}
            onChange={(event) => setFilters({ ...filters, maxPriorityScore: event.target.value })}
            className="rounded-2xl border border-stone-200 px-4 py-3"
            placeholder="Max priority"
          />
          <button type="button" onClick={fetchListings} className="rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">
            Apply filters
          </button>
        </div>
      </div>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}

      <div className="grid gap-5">
        {listings.map((listing) => (
          <FoodCard
            key={listing._id}
            listing={listing}
            actionLabel="Request donation"
            onAction={claimListing}
          />
        ))}
      </div>

      {!error && listings.length === 0 ? (
        <EmptyState
          title="No available donations matched"
          description="Donations appear here when the donor has declared human / NGO redistribution as the intended use."
        />
      ) : null}
    </div>
  );
}
