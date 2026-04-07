import { useEffect, useState } from 'react';
import api from '../../utils/api';
import FoodCard from '../../components/FoodCard';

export default function ClaimedFood() {
  const [listings, setListings] = useState([]);
  const [notes, setNotes] = useState({});
  const [error, setError] = useState('');

  const fetchClaimed = async () => {
    try {
      const response = await api.get('/food/claimed/mine');
      setListings(response.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load claimed food');
    }
  };

  useEffect(() => {
    fetchClaimed();
  }, []);

  const confirmPickup = async (listing, isFoodInGoodCondition) => {
    try {
      await api.put(`/food/${listing._id}/pickup-verify`, {
        isFoodInGoodCondition,
        notes: notes[listing._id] || ''
      });
      fetchClaimed();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to verify pickup');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-slate-600">NGO pickups</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Claimed food and pickup verification</h1>
      </div>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}

      <div className="grid gap-5">
        {listings.map((listing) => (
          <div key={listing._id} className="space-y-4">
            <FoodCard listing={listing} countdownTarget={listing.predictedExpiryTime} countdownLabel="Claim window" />
            {listing.status !== 'picked_up' ? (
              <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
                <textarea
                  placeholder="Pickup notes"
                  value={notes[listing._id] || ''}
                  onChange={(event) => setNotes({ ...notes, [listing._id]: event.target.value })}
                  className="min-h-24 w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-bridge-500"
                />
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={() => confirmPickup(listing, true)} className="rounded-full bg-bridge-600 px-5 py-3 text-sm font-semibold text-white">
                    Confirm Pickup - Good Condition
                  </button>
                  <button type="button" onClick={() => confirmPickup(listing, false)} className="rounded-full border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-700">
                    Confirm Pickup - Issues Found
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
