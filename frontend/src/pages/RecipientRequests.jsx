import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import api from '../utils/api';
import EmptyState from '../components/EmptyState';
import FoodCard from '../components/FoodCard';

export default function RecipientRequests() {
  const [listings, setListings] = useState([]);
  const [notes, setNotes] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/food/claimed/mine');
      setListings(response.data?.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const confirmPickup = async (listing) => {
    try {
      setConfirmingId(listing._id);
      setError('');
      await api.put(`/food/${listing._id}/pickup-verify`, {
        notes: notes[listing._id] || ''
      });
      setNotes((prev) => {
        const next = { ...prev };
        delete next[listing._id];
        return next;
      });
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Could not confirm pickup');
    } finally {
      setConfirmingId(null);
    }
  };

  const renderStatus = (listing) => {
    switch (listing.status) {
      case 'requested':
        return (
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">Request pending</p>
            <p className="mt-1">
              Waiting for the donor to accept your request. You will be notified once accepted.
            </p>
          </div>
        );

      case 'claimed':
      case 'pickup_pending':
        return (
          <div className="rounded-[2rem] border border-blue-200 bg-blue-50/40 p-5">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Request accepted — Pickup ready
                </p>
                <p className="mt-1 text-xs text-blue-800">
                  Reminder: Your organization is responsible for arranging transport/collection from the donor location during the agreed pickup window.
                </p>
              </div>
            </div>

            <textarea
              placeholder="Optional notes upon collection (e.g. vehicle, collector name)"
              value={notes[listing._id] || ''}
              onChange={(e) =>
                setNotes((prev) => ({ ...prev, [listing._id]: e.target.value }))
              }
              className="mt-3 min-h-20 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-800"
            />

            <button
              type="button"
              disabled={confirmingId === listing._id}
              onClick={() => confirmPickup(listing)}
              className="mt-3 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {confirmingId === listing._id ? 'Confirming pickup...' : 'Confirm pickup and complete'}
            </button>
          </div>
        );

      case 'completed':
        return (
          <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-semibold">Donation completed</p>
            <p className="mt-1">Pickup confirmed successfully. Waiting time has ended.</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-slate-600">Recipient Workflow</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Requests and Pickups</h1>
        <p className="mt-1 text-sm text-slate-600">
          Track your donation requests, accepted collections, and completed handovers.
        </p>
      </div>

      {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>}

      {loading && (
        <div className="rounded-[2rem] border border-stone-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading your requests...
        </div>
      )}

      {!loading && listings.length > 0 && (
        <div className="grid gap-5">
          {listings.map((listing) => (
            <div key={listing._id} className="space-y-3">
              <FoodCard listing={listing} />
              {renderStatus(listing)}
            </div>
          ))}
        </div>
      )}

      {!loading && !error && !listings.length && (
        <EmptyState
          title="No requests yet"
          description="Your donation requests and pickup schedules will appear here."
        />
      )}
    </div>
  );
}
