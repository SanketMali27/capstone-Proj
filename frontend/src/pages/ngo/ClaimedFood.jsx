import { useEffect, useState } from 'react';
import api from '../../utils/api';
import EmptyState from '../../components/EmptyState';
import FoodCard from '../../components/FoodCard';

export default function ClaimedFood() {
  const [listings, setListings] = useState([]);
  const [notes, setNotes] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);

  /**
   * Fetch recipient request / pickup history.
   */
  const fetchClaimed = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/food/claimed/mine');

      setListings(response.data?.data || []);
    } catch (e) {
      setError(
        e.response?.data?.message ||
        'Failed to load requests'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaimed();
  }, []);

  /**
   * Confirm pickup.
   *
   * The backend sets:
   * - status = completed
   * - pickedUpAt
   * - completedAt
   *
   * This also stops the live waiting timer.
   */
  const confirmPickup = async (listing) => {
    try {
      setConfirmingId(listing._id);
      setError('');

      await api.put(
        `/food/${listing._id}/pickup-verify`,
        {
          notes:
            notes[listing._id] || '',
        },
      );

      /**
       * Remove the note after successful completion.
       */
      setNotes((current) => {
        const updated = {
          ...current,
        };

        delete updated[listing._id];

        return updated;
      });

      await fetchClaimed();
    } catch (e) {
      setError(
        e.response?.data?.message ||
        'Failed to confirm pickup'
      );
    } finally {
      setConfirmingId(null);
    }
  };

  /**
   * Format the historical waiting duration returned
   * by the backend.
   *
   * Example:
   * 1547 minutes -> 1d 1h 47m
   */
  const formatDuration = (minutes) => {
    if (
      minutes === null ||
      minutes === undefined ||
      Number.isNaN(Number(minutes))
    ) {
      return '—';
    }

    const totalMinutes = Math.max(
      0,
      Number(minutes),
    );

    const days = Math.floor(
      totalMinutes / 1440,
    );

    const hours = Math.floor(
      (totalMinutes % 1440) / 60,
    );

    const mins = Math.floor(
      totalMinutes % 60,
    );

    const parts = [];

    if (days > 0) {
      parts.push(`${days}d`);
    }

    if (hours > 0) {
      parts.push(`${hours}h`);
    }

    if (mins > 0 || parts.length === 0) {
      parts.push(`${mins}m`);
    }

    return parts.join(' ');
  };

  /**
   * Return status message for each listing.
   */
  const renderStatus = (listing) => {
    switch (listing.status) {
      case 'requested':
        return (
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">
              Request sent
            </p>

            <p className="mt-1">
              Waiting for the donor to accept
              your request.
            </p>
          </div>
        );

      case 'claimed':
        return (
          <div className="rounded-[2rem] border border-blue-200 bg-blue-50/40 p-5">
            <div>
              <p className="text-sm font-semibold text-blue-900">
                Pickup ready — Request accepted
              </p>

              <p className="mt-1 text-sm text-slate-700">
                The donor accepted your request. Please arrange transportation to collect the donation from the donor location during the agreed pickup window.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Note: FoodBridge coordinates platform status tracking and does not dispatch delivery drivers.
              </p>
            </div>

            <textarea
              placeholder="Optional notes upon handover (e.g. volunteer name, collection vehicle)"
              value={
                notes[listing._id] || ''
              }
              onChange={(e) =>
                setNotes((current) => ({
                  ...current,
                  [listing._id]:
                    e.target.value,
                }))
              }
              className="mt-4 min-h-20 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-bridge-600 focus:ring-2 focus:ring-bridge-100"
            />

            <button
              type="button"
              onClick={() =>
                confirmPickup(listing)
              }
              disabled={
                confirmingId ===
                listing._id
              }
              className="mt-3 rounded-full bg-bridge-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-bridge-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {confirmingId ===
                listing._id
                ? 'Confirming pickup...'
                : 'Confirm pickup and complete'}
            </button>
          </div>
        );

      case 'pickup_pending':
        return (
          <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">
            <p className="font-semibold">
              Pickup pending
            </p>

            <p className="mt-1">
              This donation is waiting for
              pickup confirmation.
            </p>
          </div>
        );

      case 'completed':
        return (
          <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-semibold">
              Donation completed
            </p>

            <p className="mt-1">
              Pickup has been confirmed
              successfully.
            </p>

            {listing.waitingDurationMinutes !==
              undefined &&
              listing.waitingDurationMinutes !==
              null && (
                <p className="mt-2">
                  Total wait:{' '}
                  <span className="font-semibold">
                    {formatDuration(
                      listing.waitingDurationMinutes,
                    )}
                  </span>
                </p>
              )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-slate-600">
          Recipient workflow
        </p>

        <h1 className="mt-2 text-3xl font-semibold text-slate-900">
          Accepted requests and pickups
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Track your donation requests, accepted
          pickups, and completed redistributions.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="rounded-[2rem] border border-stone-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">
            Loading your requests...
          </p>
        </div>
      )}

      {/* Listings */}
      {!loading && listings.length > 0 && (
        <div className="grid gap-5">
          {listings.map((listing) => (
            <div
              key={listing._id}
              className="space-y-3"
            >
              {/* Donation card */}
              <FoodCard
                listing={listing}
              />

              {/* Status-specific UI */}
              {renderStatus(listing)}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading &&
        !error &&
        listings.length === 0 && (
          <EmptyState
            title="No accepted requests yet"
            description="Your request and pickup activity will appear here."
          />
        )}
    </div>
  );
}