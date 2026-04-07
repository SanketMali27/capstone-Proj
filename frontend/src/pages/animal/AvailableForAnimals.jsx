import { useEffect, useState } from 'react';
import FoodCard from '../../components/FoodCard';
import api from '../../utils/api';
import { useSocket } from '../../context/SocketContext';

export default function AvailableForAnimals() {
  const [listings, setListings] = useState([]);
  const [animalType, setAnimalType] = useState('');
  const [error, setError] = useState('');
  const { listingEvents } = useSocket() || {};

  const fetchListings = async () => {
    try {
      const response = await api.get('/food');
      const filtered = animalType
        ? response.data.data.filter((listing) =>
            `${listing.foodName} ${listing.description}`.toLowerCase().includes(animalType.toLowerCase())
          )
        : response.data.data;
      setListings(filtered);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load animal-use food');
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
        <h1 className="text-3xl font-semibold text-slate-900">Available for animals</h1>
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            type="text"
            value={animalType}
            onChange={(event) => setAnimalType(event.target.value)}
            placeholder="Filter by animal suitability"
            className="min-w-72 rounded-2xl border border-stone-200 px-4 py-3"
          />
          <button type="button" onClick={fetchListings} className="rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">
            Apply filter
          </button>
        </div>
      </div>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}

      <div className="grid gap-5">
        {listings.map((listing) => (
          <FoodCard
            key={listing._id}
            listing={listing}
            actionLabel="Claim for Animals"
            onAction={claimListing}
            countdownTarget={listing.animalExpiryTime || listing.predictedExpiryTime}
            countdownLabel="Moves to industry in"
            note="This food is no longer safe for human consumption but can still be used for animals."
          />
        ))}
      </div>
    </div>
  );
}
