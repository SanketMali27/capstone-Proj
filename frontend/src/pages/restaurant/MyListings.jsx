import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import api from '../../utils/api';
import PriorityBadge from '../../components/PriorityBadge';
import EmptyState from '../../components/EmptyState';
import WaitingTime from '../../components/WaitingTime';
import { useSocket } from '../../context/SocketContext';

export default function MyListings() {

  const [listings, setListings] = useState([]);
  const [error, setError] = useState('');
  const { listingEvents } = useSocket() || {};

  const fetchListings = async () => {
    try {
      const response = await api.get('/food/restaurant');
      setListings(response.data.data);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to fetch donations');
    }
  };
  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    if (listingEvents?.length) fetchListings();
  }, [listingEvents?.length]);

  const accept = async (id) => {
    try {
      await api.put(`/food/${id}/claim`);
      fetchListings();
    } catch (e) {
      setError(e.response?.data?.message || 'Could not accept request');
    }
  };

  const updateIntent = async (listing, intendedRecipientType) => {
    try {
      await api.put(`/food/${listing._id}`, { intendedRecipientType });
      fetchListings();
    } catch (e) {
      setError(e.response?.data?.message || 'Could not update intended recipient');
    }
  };
  const cancel = async (id) => {
    try {
      await api.delete(`/food/${id}`);
      fetchListings();
    } catch (e) {
      setError(e.response?.data?.message || 'Could not cancel donation');
    }
  };
  return <div className="space-y-6">
    <div>
      <p className="text-sm uppercase tracking-[0.22em] text-slate-600">Restaurant listings</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-900">Donations and recipient requests</h1>
    </div>
    {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>
    }
    <div className="grid gap-4">{
      listings.map((listing) => <article key={listing._id} className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold text-slate-900">{listing.foodName}</h2>
          <PriorityBadge urgencyLevel={listing.urgencyLevel} />
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">Priority {listing.priorityScore}</span>
        </div>
        <p className="mt-2 text-sm capitalize text-slate-700">{listing.quantity} {listing.quantityUnit} · {listing.foodType} · intended for {listing.intendedRecipientType} · status: {listing.status?.replace('_', ' ')}</p>
        {['available', 'requested'].includes(listing.status) && <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700">Update declared intended use
          <select value={listing.intendedRecipientType}
            onChange={(e) => updateIntent(listing, e.target.value)} className="rounded-xl border px-3 py-2">
            <option value="human">Human / NGO</option>
            <option value="animal">Animal</option>
            <option value="industry">Industry</option>
          </select>
        </label>
        }<p className="mt-1 text-sm text-slate-600">
          <WaitingTime createdAt={listing.createdAt} /> · Demand match {listing.priorityFactors?.demandMatchScore > 0 ? 'active' : 'none'} · Pickup {listing.pickupAvailableFrom && new Date(listing.pickupAvailableFrom) > new Date() ? new Date(listing.pickupAvailableFrom).toLocaleString() : 'available now'}</p>
        {listing.claimedBy && <p className="mt-2 text-sm text-slate-700">Recipient: {listing.claimedBy.organizationName || listing.claimedBy.name}
        </p>}
        <div className="mt-4 flex flex-wrap gap-2">{listing.status === 'requested' && <button onClick={() => accept(listing._id)} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Accept request</button>}
          {['available', 'requested'].includes(listing.status) && <button onClick={() => cancel(listing._id)} className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600">
            <Trash2 className="h-4 w-4" />Cancel</button>}
        </div>
      </article>)}
    </div>
    {listings.length === 0 && <EmptyState title="No donations yet" description="Donations you publish will appear here with their operational priority and request activity." />}
  </div>;
}
