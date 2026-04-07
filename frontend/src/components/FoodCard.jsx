import { MapPin, Package, UtensilsCrossed } from 'lucide-react';
import CategoryBadge from './CategoryBadge';
import CountdownTimer from './CountdownTimer';
import MapView from './MapView';
import SafetyBadge from './SafetyBadge';

export default function FoodCard({
  listing,
  actionLabel,
  onAction,
  countdownTarget,
  countdownLabel,
  note
}) {
  return (
    <article className="grid gap-5 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm lg:grid-cols-[1.3fr_0.9fr]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-semibold text-slate-900">{listing.foodName}</h3>
            <p className="mt-1 text-sm text-slate-600">{listing.description || 'No extra description provided.'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SafetyBadge score={listing.safetyScore} />
            <CategoryBadge category={listing.currentCategory} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-stone-100 p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-600">
              <UtensilsCrossed className="h-4 w-4" />
              <span className="text-xs uppercase tracking-[0.16em]">Type</span>
            </div>
            <p className="font-semibold text-slate-800">{listing.foodType}</p>
            <p className="text-sm text-slate-600">{listing.foodCategory}</p>
          </div>

          <div className="rounded-2xl bg-stone-100 p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-600">
              <Package className="h-4 w-4" />
              <span className="text-xs uppercase tracking-[0.16em]">Quantity</span>
            </div>
            <p className="font-semibold text-slate-800">
              {listing.quantity} {listing.quantityUnit}
            </p>
            <p className="text-sm text-slate-600">Prepared {new Date(listing.preparedAt).toLocaleString()}</p>
          </div>

          <div className="rounded-2xl bg-stone-100 p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-600">
              <MapPin className="h-4 w-4" />
              <span className="text-xs uppercase tracking-[0.16em]">Source</span>
            </div>
            <p className="font-semibold text-slate-800">{listing.restaurantName}</p>
            <p className="text-sm text-slate-600">
              {listing.distanceKm !== null && listing.distanceKm !== undefined ? `${listing.distanceKm} km away` : 'Distance unavailable'}
            </p>
          </div>
        </div>

        {note ? <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-4 text-sm text-slate-700">{note}</div> : null}

        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={() => onAction(listing)}
            className="inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>

      <div className="space-y-4">
        {countdownTarget ? <CountdownTimer targetTime={countdownTarget} label={countdownLabel} /> : null}
        <MapView coordinates={listing.restaurantLocation?.coordinates} />
      </div>
    </article>
  );
}
