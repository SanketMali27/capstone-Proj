import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';

import api from '../../utils/api';

import PriorityBadge from '../../components/PriorityBadge';
import EmptyState from '../../components/EmptyState';

import { useSocket } from '../../context/SocketContext';

const ACTIVE_WAITING_STATUSES = [
  'available',
  'requested',
];

/**
 * Format minutes into a readable duration.
 *
 * Example:
 * 1547 -> 1d 1h 47m
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
    Number(minutes)
  );

  const days = Math.floor(
    totalMinutes / 1440
  );

  const hours = Math.floor(
    (totalMinutes % 1440) / 60
  );

  const mins = Math.floor(
    totalMinutes % 60
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
 * Calculate the operational waiting time.
 *
 * AVAILABLE / REQUESTED:
 *   createdAt -> current time
 *
 * CLAIMED:
 *   createdAt -> claimedAt
 *
 * COMPLETED:
 *   createdAt -> completedAt
 *
 * CANCELLED:
 *   no active timer
 */
const getWaitingInfo = (listing) => {
  const createdAt = listing.createdAt
    ? new Date(listing.createdAt)
    : null;

  if (
    !createdAt ||
    Number.isNaN(createdAt.getTime())
  ) {
    return {
      isActive: false,
      minutes: 0,
      label: 'Waiting time unavailable',
    };
  }

  const status = String(
    listing.status || ''
  ).toLowerCase();

  /**
   * Donation is still active.
   * Waiting continues until now.
   */
  if (
    ACTIVE_WAITING_STATUSES.includes(status)
  ) {
    const minutes = Math.floor(
      Math.max(
        0,
        Date.now() - createdAt.getTime()
      ) / 60000
    );

    return {
      isActive: true,
      minutes,
      label: `Waiting: ${formatDuration(minutes)}`,
    };
  }

  /**
   * Donation has been claimed.
   * Waiting ends at claimedAt.
   */
  if (
    status === 'claimed' &&
    listing.claimedAt
  ) {
    const claimedAt = new Date(
      listing.claimedAt
    );

    const minutes = Math.floor(
      Math.max(
        0,
        claimedAt.getTime() -
        createdAt.getTime()
      ) / 60000
    );

    return {
      isActive: false,
      minutes,
      label: `Wait ended: ${formatDuration(minutes)}`,
    };
  }

  /**
   * Donation has been completed.
   * Waiting ends at completedAt.
   */
  if (
    status === 'completed' &&
    listing.completedAt
  ) {
    const completedAt = new Date(
      listing.completedAt
    );

    const minutes = Math.floor(
      Math.max(
        0,
        completedAt.getTime() -
        createdAt.getTime()
      ) / 60000
    );

    return {
      isActive: false,
      minutes,
      label: `Total wait: ${formatDuration(minutes)}`,
    };
  }

  /**
   * Donation was cancelled.
   */
  if (status === 'cancelled') {
    if (listing.cancelledAt) {
      const cancelledAt = new Date(
        listing.cancelledAt
      );

      const minutes = Math.floor(
        Math.max(
          0,
          cancelledAt.getTime() -
          createdAt.getTime()
        ) / 60000
      );

      return {
        isActive: false,
        minutes,
        label: `Wait ended: ${formatDuration(minutes)}`,
      };
    }

    return {
      isActive: false,
      minutes: 0,
      label: 'Waiting ended',
    };
  }

  return {
    isActive: false,
    minutes: 0,
    label: 'Waiting ended',
  };
};

export default function MyListings() {
  const [listings, setListings] =
    useState([]);

  const [error, setError] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [processingId, setProcessingId] =
    useState(null);

  const { listingEvents } =
    useSocket() || {};

  /**
   * Fetch restaurant donations.
   */
  const fetchListings = async () => {
    try {
      setLoading(true);
      setError('');

      const response =
        await api.get('/food/restaurant');

      setListings(
        response.data?.data || []
      );
    } catch (e) {
      setError(
        e.response?.data?.message ||
        'Failed to fetch donations'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  /**
   * Refresh when socket events arrive.
   */
  useEffect(() => {
    if (listingEvents?.length) {
      fetchListings();
    }
  }, [listingEvents?.length]);

  /**
   * Accept recipient request.
   */
  const accept = async (id) => {
    try {
      setProcessingId(id);
      setError('');

      await api.put(
        `/food/${id}/claim`
      );

      await fetchListings();
    } catch (e) {
      setError(
        e.response?.data?.message ||
        'Could not accept request'
      );
    } finally {
      setProcessingId(null);
    }
  };

  /**
   * Update donor-declared intended use.
   */
  const updateIntent = async (
    listing,
    intendedRecipientType
  ) => {
    try {
      setProcessingId(
        listing._id
      );

      setError('');

      await api.put(
        `/food/${listing._id}`,
        {
          intendedRecipientType,
        }
      );

      await fetchListings();
    } catch (e) {
      setError(
        e.response?.data?.message ||
        'Could not update intended recipient'
      );
    } finally {
      setProcessingId(null);
    }
  };

  /**
   * Cancel donation.
   */
  const cancel = async (id) => {
    const confirmed =
      window.confirm(
        'Cancel this donation?'
      );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(id);
      setError('');

      await api.delete(
        `/food/${id}`
      );

      await fetchListings();
    } catch (e) {
      setError(
        e.response?.data?.message ||
        'Could not cancel donation'
      );
    } finally {
      setProcessingId(null);
    }
  };

  /**
   * Format listing status.
   */
  const formatStatus = (status) => {
    if (!status) {
      return 'Unknown';
    }

    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-slate-600">
          Restaurant listings
        </p>

        <h1 className="mt-2 text-3xl font-semibold text-slate-900">
          Donations and recipient requests
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Manage your donations, review recipient
          requests, and track redistribution priority.
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
            Loading your donations...
          </p>
        </div>
      )}

      {/* Listings */}
      {!loading &&
        listings.length > 0 && (
          <div className="grid gap-4">
            {listings.map((listing) => {
              const waiting =
                getWaitingInfo(listing);

              const isEditable = [
                'available',
                'requested',
              ].includes(
                listing.status
              );

              return (
                <article
                  key={listing._id}
                  className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm"
                >
                  {/* Header */}
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold text-slate-900">
                      {listing.foodName}
                    </h2>

                    <PriorityBadge
                      urgencyLevel={
                        listing.urgencyLevel
                      }
                    />

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      Priority{' '}
                      {Math.round(
                        listing.priorityScore || 0
                      )}
                    </span>
                  </div>

                  {/* Basic information */}
                  <p className="mt-2 text-sm capitalize text-slate-700">
                    {listing.quantity}{' '}
                    {listing.quantityUnit}
                    {' · '}
                    {listing.foodType}
                    {' · '}
                    Intended for{' '}
                    <span className="font-semibold">
                      {listing.intendedRecipientType ===
                        'human'
                        ? 'Human / NGO'
                        : listing.intendedRecipientType ===
                          'animal'
                          ? 'Animal'
                          : 'Industry'}
                    </span>
                    {' · '}
                    Status:{' '}
                    <span className="font-semibold">
                      {formatStatus(
                        listing.expiredAt ? 'expired' : listing.status
                      )}
                    </span>
                  </p>

                  {/* Intended recipient selector */}
                  {isEditable && (
                    <label className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-700">
                      <span className="font-medium">
                        Update declared intended use:
                      </span>

                      <select
                        value={
                          listing.intendedRecipientType
                        }
                        disabled={
                          processingId ===
                          listing._id
                        }
                        onChange={(e) =>
                          updateIntent(
                            listing,
                            e.target.value
                          )
                        }
                        className="rounded-xl border border-stone-200 bg-white px-3 py-2 outline-none focus:border-slate-500"
                      >
                        <option value="human">
                          Human / NGO
                        </option>

                        <option value="animal">
                          Animal
                        </option>

                        <option value="industry">
                          Industry
                        </option>
                      </select>
                    </label>
                  )}

                  {/* Operational information */}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Waiting */}
                    <div className="rounded-2xl bg-stone-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Redistribution wait
                      </p>

                      <p
                        className={`mt-1 text-sm font-semibold ${waiting.isActive
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                          }`}
                      >
                        {waiting.label}
                      </p>
                    </div>

                    {/* Demand match */}
                    <div className="rounded-2xl bg-stone-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Demand match
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {listing.priorityFactors
                          ?.demandMatchScore > 0
                          ? 'Matched'
                          : 'No active match'}
                      </p>
                    </div>

                    {/* Pickup */}
                    <div className="rounded-2xl bg-stone-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Pickup
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {listing.pickupAvailableFrom &&
                          new Date(
                            listing.pickupAvailableFrom
                          ) > new Date()
                          ? new Date(
                            listing.pickupAvailableFrom
                          ).toLocaleString()
                          : 'Available now'}
                      </p>
                    </div>

                    {/* Distance */}
                    <div className="rounded-2xl bg-stone-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Distance
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {listing.distanceKm !==
                          null &&
                          listing.distanceKm !==
                          undefined
                          ? `${listing.distanceKm} km`
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Recipient */}
                  {listing.claimedBy && (
                    <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
                      <span className="font-semibold">
                        Recipient:
                      </span>{' '}
                      {listing.claimedBy
                        .organizationName ||
                        listing.claimedBy.name ||
                        'Recipient'}
                      {listing.claimedBy.phone ? <> · Phone: <a className="underline" href={`tel:${listing.claimedBy.phone}`}>{listing.claimedBy.phone}</a></> : ' · Contact phone unavailable'}
                    </div>
                  )}

                  {/* Requested */}
                  {listing.status ===
                    'requested' && (
                      <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        A recipient has requested
                        this donation. Review the
                        request and accept it when
                        ready.
                      </div>
                    )}

                  {/* Claimed */}
                  {listing.status ===
                    'claimed' && (
                      <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
                        <p className="font-semibold">
                          Donation claimed — Pickup pending
                        </p>

                        <p className="mt-1">
                          The recipient has been
                          accepted. The recipient organization will arrange their own transport to pick up the food from your location during the pickup window.
                        </p>
                      </div>
                    )}

                  {/* Completed */}
                  {listing.status ===
                    'completed' && (
                      <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        <p className="font-semibold">
                          Donation completed
                        </p>

                        <p className="mt-1">
                          Pickup has been confirmed.
                          Redistribution is complete.
                        </p>
                      </div>
                    )}

                  {/* Cancelled */}
                  {listing.status ===
                    'cancelled' && (
                      <div className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                        {listing.expiredAt
                          ? 'This donation expired because it was not collected within 24 hours or before its pickup window ended.'
                          : 'This donation has been cancelled.'}
                      </div>
                    )}

                  {/* Actions */}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {listing.status ===
                      'requested' && (
                        <button
                          type="button"
                          disabled={
                            processingId ===
                            listing._id
                          }
                          onClick={() =>
                            accept(
                              listing._id
                            )
                          }
                          className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {processingId ===
                            listing._id
                            ? 'Accepting...'
                            : 'Accept request'}
                        </button>
                      )}

                    {isEditable && (
                      <button
                        type="button"
                        disabled={
                          processingId ===
                          listing._id
                        }
                        onClick={() =>
                          cancel(
                            listing._id
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />

                        {processingId ===
                          listing._id
                          ? 'Cancelling...'
                          : 'Cancel'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

      {/* Empty */}
      {!loading &&
        !error &&
        listings.length === 0 && (
          <EmptyState
            title="No donations yet"
            description="Donations you publish will appear here with their operational priority and request activity."
          />
        )}
    </div>
  );
}
