import { MapPin, Package, UtensilsCrossed } from 'lucide-react';
import PriorityBadge from './PriorityBadge';
import WaitingTime from './WaitingTime';
import MapView from './MapView';

const intendedLabel = { human: 'NGO / Human redistribution', animal: 'Animal', industry: 'Industry' };

export default function FoodCard({ listing, actionLabel, onAction, note }) {


  const factors = listing.priorityFactors || {};

  const pickup = listing.pickupAvailableFrom && new Date(listing.pickupAvailableFrom) > new Date()
    ? `Available ${new Date(listing.pickupAvailableFrom).toLocaleString()}`
    : 'Available now';

  const match = factors.demandMatchScore >= 70 ? 'High' : factors.demandMatchScore >= 40 ? 'Moderate' : factors.demandMatchScore > 0 ? 'Low' : 'No active match';

  return (
    <article className="grid gap-5 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm lg:grid-cols-[1.3fr_0.9fr]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="text-2xl font-semibold text-slate-900">{listing.foodName}</h3><p className="mt-1 text-sm text-slate-600">{listing.description || 'No extra description provided.'}</p></div>
          <div className="flex items-center gap-2"><PriorityBadge urgencyLevel={listing.urgencyLevel} /><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Priority {Math.round(listing.priorityScore || 0)}</span></div>
        </div>
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
            <p className="font-semibold text-slate-800">{listing.quantity} {listing.quantityUnit}</p>
            <p className="text-sm capitalize text-slate-600">Status: {listing.status?.replace('_', ' ')}</p>
          </div>
          <div className="rounded-2xl bg-stone-100 p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-600">
              <MapPin className="h-4 w-4" />
              <span className="text-xs uppercase tracking-[0.16em]">Donor</span>
            </div>
            <p className="font-semibold text-slate-800">{listing.restaurantName}</p>
            <p className="text-sm text-slate-600">{listing.distanceKm == null ? 'Distance unavailable' : `${listing.distanceKm} km away`}</p>
          </div>
        </div>
        <div className="grid gap-2 rounded-2xl border border-stone-200 p-4 text-sm text-slate-700 sm:grid-cols-2">
          <p>
            <span className="font-semibold">Demand match:</span> {match}</p>
          <p><span className="font-semibold">Intended recipient:</span> {intendedLabel[listing.intendedRecipientType] || listing.intendedRecipientType}</p>
          <p>
            <WaitingTime createdAt={listing.createdAt} />
          </p>
          <p>
            <span className="font-semibold">Pickup:</span> {pickup}</p>
        </div>
        {note ? <p className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-4 text-sm text-slate-700">{note}</p> : null}
        {actionLabel && onAction ?
          <button type="button" onClick={() => onAction(listing)} className="inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">{actionLabel}</button> : null}
      </div>
      <div className="space-y-4">
        <MapView coordinates={listing.restaurantLocation?.coordinates} />
      </div>
    </article>
  );
}
