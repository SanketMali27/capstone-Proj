import { useEffect, useState } from 'react';
import FoodCard from '../../components/FoodCard';
import api from '../../utils/api';
import { useSocket } from '../../context/SocketContext';

export default function AvailableFood() {
  const [listings, setListings] = useState([]);
  const [filters, setFilters] = useState({ foodType: '', radius: '10', minQuantity: '' });
  const [error, setError] = useState('');
  const { listingEvents } = useSocket() || {};

  const fetchListings = async () => {
    try {
      const response = await api.get('/food', { params: filters });
      setListings(response.data.data);
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
    await api.put(`/food/${listing._id}/claim`);
    fetchListings();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Human-safe available food</h1>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
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
          <input
            type="number"
            value={filters.minQuantity}
            onChange={(event) => setFilters({ ...filters, minQuantity: event.target.value })}
            className="rounded-2xl border border-stone-200 px-4 py-3"
            placeholder="Min quantity"
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
            actionLabel="Claim"
            onAction={claimListing}
            countdownTarget={listing.humanExpiryTime || listing.predictedExpiryTime}
            countdownLabel="Downgrades in"
          />
        ))}
      </div>
    </div>
  );
}
