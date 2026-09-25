import { useEffect, useMemo, useState } from 'react';
import FoodCard from '../../components/FoodCard';
import EmptyState from '../../components/EmptyState';
import api from '../../utils/api';
import { useSocket } from '../../context/SocketContext';

export default function AvailableForIndustry() {
  const [listings, setListings] = useState([]);
  const [error, setError] = useState('');
  const { listingEvents } = useSocket() || {};

  const fetchListings = async () => {
    try {
      const response = await api.get('/food');
      setListings(response.data.data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load industry-use food');
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    fetchListings();
  }, [listingEvents?.length]);

  const totalBulk = useMemo(() => listings.reduce((sum, item) => sum + Number(item.quantity || 0), 0), [listings]);

  const claimListing = async (listing) => {
    await api.put(`/food/${listing._id}/request`);
    fetchListings();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Available for industry</h1>
        <p className="mt-3 text-sm text-slate-700">
          Weekly bulk summary: <span className="font-semibold text-slate-900">{totalBulk} total units currently available</span>
        </p>
      </div>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}

      <div className="grid gap-5">
        {listings.map((listing) => (
          <FoodCard
            key={listing._id}
            listing={listing}
            actionLabel="Request collection"
            onAction={claimListing}
            note="Donor-declared intended use: Industry (such as composting or biogas processing)."
          />
        ))}
      </div>

      {!error && listings.length === 0 ? (
        <EmptyState
          title="No industry-use listings available"
          description="This page only shows available donations the donor explicitly intended for industrial processing."
        />
      ) : null}
    </div>
  );
}
