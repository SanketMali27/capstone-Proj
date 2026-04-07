import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import api from '../../utils/api';
import CategoryBadge from '../../components/CategoryBadge';
import SafetyBadge from '../../components/SafetyBadge';
import { useSocket } from '../../context/SocketContext';

export default function MyListings() {
  const [listings, setListings] = useState([]);
  const [error, setError] = useState('');
  const { listingEvents } = useSocket() || {};

  const fetchListings = async () => {
    try {
      const response = await api.get('/food/restaurant');
      setListings(response.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to fetch listings');
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    if (listingEvents?.length) {
      fetchListings();
    }
  }, [listingEvents?.length]);

  const removeListing = async (id) => {
    try {
      await api.delete(`/food/${id}`);
      setListings((current) => current.filter((listing) => listing._id !== id));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to delete listing');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-slate-600">Restaurant listings</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Track every surplus batch</h1>
      </div>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}

      <div className="grid gap-4">
        {listings.map((listing) => (
          <div key={listing._id} className="flex flex-col gap-4 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold text-slate-900">{listing.foodName}</h2>
                <SafetyBadge score={listing.safetyScore} />
                <CategoryBadge category={listing.currentCategory} />
              </div>
              <p className="mt-2 text-sm text-slate-700">
                {listing.quantity} {listing.quantityUnit} • {listing.foodType} • status: {listing.status}
              </p>
              <p className="mt-1 text-sm text-slate-600">Expires {new Date(listing.predictedExpiryTime).toLocaleString()}</p>
            </div>

            <button
              type="button"
              onClick={() => removeListing(listing._id)}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
