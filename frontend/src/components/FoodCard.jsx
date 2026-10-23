import { MapPin, Package, UtensilsCrossed, Clock, Phone, AlertCircle, Sparkles } from 'lucide-react';
import PriorityBadge from './PriorityBadge';
import WaitingTime from './WaitingTime';
import MapView from './MapView';

const intendedLabel = {
  human: 'NGO / Human redistribution',
  animal: 'Animal Feed / Husbandry',
  industry: 'Industrial (Composting / Biogas)'
};

export default function FoodCard({ listing, actionLabel, onAction, note }) {
  const factors = listing.priorityFactors || {};
  const personalFactors = listing.personalFactors || {};

  const pickupFrom = listing.pickupAvailableFrom
    ? new Date(listing.pickupAvailableFrom)
    : null;
  const pickupUntil = listing.pickupAvailableUntil
    ? new Date(listing.pickupAvailableUntil)
    : null;

  const pickupStatusText = pickupFrom && pickupFrom > new Date()
    ? `From ${pickupFrom.toLocaleString()}`
    : 'Available now for pickup';

  const pickupWindowText = pickupUntil
    ? `${pickupStatusText} until ${pickupUntil.toLocaleString()}`
    : pickupStatusText;

  const matchScore = personalFactors.demandMatchScore !== undefined
    ? personalFactors.demandMatchScore
    : factors.demandMatchScore;

  const match = matchScore >= 70
    ? 'High match'
    : matchScore >= 40
      ? 'Moderate match'
      : matchScore > 0
        ? 'Low match'
        : 'No active match';

  const isAcceptedOrClaimed = ['claimed', 'pickup_pending', 'completed'].includes(listing.status);

  return (
    <article className="grid gap-5 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm lg:grid-cols-[1.3fr_0.9fr]">
      <div className="space-y-4">
        {/* Title and Priority Badges */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-semibold text-slate-900">{listing.foodName}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {listing.description || 'No extra description provided.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Global Urgency & Platform Priority */}
            <PriorityBadge urgencyLevel={listing.urgencyLevel} />
            <span
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
              title="Platform-wide urgency score (0-100)"
            >
              Global Priority {Math.round(listing.priorityScore || 0)}
            </span>

            {/* Recipient's Personalized Priority Score if available */}
            {listing.personalScore !== null && listing.personalScore !== undefined && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"
                title="Ranked according to your saved priority preferences"
              >
                <Sparkles className="h-3 w-3" />
                Personal Match {Math.round(listing.personalScore)}
              </span>
            )}
          </div>
        </div>

        {/* Spec Cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-stone-100 p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-600">
              <UtensilsCrossed className="h-4 w-4" />
              <span className="text-xs uppercase tracking-[0.16em]">Food type</span>
            </div>
            <p className="font-semibold capitalize text-slate-800">{listing.foodType}</p>
            <p className="text-sm capitalize text-slate-600">{listing.foodCategory}</p>
          </div>

          <div className="rounded-2xl bg-stone-100 p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-600">
              <Package className="h-4 w-4" />
              <span className="text-xs uppercase tracking-[0.16em]">Quantity</span>
            </div>
            <p className="font-semibold text-slate-800">
              {listing.quantity} {listing.quantityUnit}
            </p>
            <p className="text-sm capitalize text-slate-600">
              Status: {listing.status?.replace('_', ' ')}
            </p>
          </div>

          <div className="rounded-2xl bg-stone-100 p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-600">
              <MapPin className="h-4 w-4" />
              <span className="text-xs uppercase tracking-[0.16em]">Donor & Distance</span>
            </div>
            <p className="font-semibold text-slate-800">{listing.restaurantName}</p>
            <p className="text-sm text-slate-600">
              {listing.distanceKm == null
                ? 'Distance unavailable'
                : `${listing.distanceKm} km from you`}
            </p>
          </div>
        </div>

        {/* Operational & Timing Information */}
        <div className="grid gap-2 rounded-2xl border border-stone-200 p-4 text-sm text-slate-700 sm:grid-cols-2">
          <p>
            <span className="font-semibold">Demand match:</span> {match}
          </p>
          <p>
            <span className="font-semibold">Intended recipient:</span>{' '}
            {intendedLabel[listing.intendedRecipientType] || listing.intendedRecipientType}
          </p>
          <div>
            <WaitingTime createdAt={listing.createdAt} />
          </div>
          <p className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-slate-500 shrink-0" />
            <span>
              <span className="font-semibold">Pickup window:</span> {pickupWindowText}
            </span>
          </p>
        </div>

        {/* Delivery & Pickup Responsibility Notice */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 text-xs text-slate-600">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-slate-700 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">Pickup Responsibility</p>
              <p className="mt-0.5 leading-relaxed">
                Surplus food is prepared and handed over by the donor. The accepted recipient organization
                is responsible for arranging its own transportation, staff, or volunteers to collect the donation.
                FoodBridge coordinates status tracking and does not dispatch delivery drivers.
              </p>
            </div>
          </div>
        </div>

        {/* Donor Contact Details (when accepted or viewing details) */}
        {isAcceptedOrClaimed && (listing.restaurantAddress || listing.restaurantPhone) && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900">
            <p className="font-semibold uppercase tracking-wider text-blue-800">Donor Pickup Details</p>
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              {listing.restaurantAddress && (
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>{listing.restaurantAddress}</span>
                </p>
              )}
              {listing.restaurantPhone && (
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{listing.restaurantPhone}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {note ? (
          <p className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-4 text-sm text-slate-700">
            {note}
          </p>
        ) : null}

        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={() => onAction(listing)}
            className="inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>

      <div className="space-y-4">
        <MapView coordinates={listing.restaurantLocation?.coordinates} />
      </div>
    </article>
  );
}
