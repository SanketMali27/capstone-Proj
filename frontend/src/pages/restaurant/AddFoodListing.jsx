import { useState } from 'react';
import PriorityBadge from '../../components/PriorityBadge';
import WaitingTime from '../../components/WaitingTime';
import api from '../../utils/api';

export default function AddFoodListing() {
  const [form, setForm] = useState({ foodName: '', foodType: 'cooked', foodCategory: 'veg', quantity: '', quantityUnit: 'portions', intendedRecipientType: 'human', pickupAvailableFrom: new Date().toISOString().slice(0, 16), pickupAvailableUntil: '', description: '', images: [] });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const handleSubmit = async (event) => {
    event.preventDefault(); setSubmitting(true); setResult(null); setError('');
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => { if (key !== 'images' && value) body.append(key, value); });
      Array.from(form.images || []).forEach((file) => body.append('images', file));
      const response = await api.post('/food', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(response.data.data);
      setForm((current) => ({ ...current, foodName: '', quantity: '', description: '', images: [] }));
    } catch (requestError) { setError(requestError.response?.data?.message || 'Failed to create donation'); }
    finally { setSubmitting(false); }
  };
  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <form onSubmit={handleSubmit} className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm uppercase tracking-[0.22em] text-slate-600">Restaurant workflow</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">Create a donation</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <input required placeholder="Food name" value={form.foodName} onChange={(event) => update('foodName', event.target.value)} className="rounded-2xl border border-stone-200 px-4 py-3" />
          <select value={form.foodType} onChange={(event) => update('foodType', event.target.value)} className="rounded-2xl border border-stone-200 px-4 py-3"><option value="cooked">Cooked</option><option value="raw">Raw</option><option value="packaged">Packaged</option><option value="dairy">Dairy</option><option value="bakery">Bakery</option><option value="mixed">Mixed</option></select>
          <select value={form.foodCategory} onChange={(event) => update('foodCategory', event.target.value)} className="rounded-2xl border border-stone-200 px-4 py-3"><option value="veg">Vegetarian</option><option value="non-veg">Non-vegetarian</option><option value="vegan">Vegan</option></select>
          <div className="grid grid-cols-[1fr_140px] gap-2"><input required min="0" type="number" placeholder="Quantity" value={form.quantity} onChange={(event) => update('quantity', event.target.value)} className="rounded-2xl border border-stone-200 px-4 py-3" /><select value={form.quantityUnit} onChange={(event) => update('quantityUnit', event.target.value)} className="rounded-2xl border border-stone-200 px-4 py-3"><option value="portions">Portions</option><option value="kg">kg</option><option value="litres">Litres</option><option value="boxes">Boxes</option></select></div>
          <label className="text-sm text-slate-700">Donor-declared intended recipient<select value={form.intendedRecipientType} onChange={(event) => update('intendedRecipientType', event.target.value)} className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-3"><option value="human">Human / NGO</option><option value="animal">Animal</option><option value="industry">Industry (composting / biogas)</option></select></label>
          <label className="text-sm text-slate-700">Pickup available from<input type="datetime-local" value={form.pickupAvailableFrom} onChange={(event) => update('pickupAvailableFrom', event.target.value)} className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-3" /></label>
          <label className="text-sm text-slate-700">Pickup available until (optional)<input type="datetime-local" value={form.pickupAvailableUntil} onChange={(event) => update('pickupAvailableUntil', event.target.value)} className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-3" /></label>
          <textarea placeholder="Description" value={form.description} onChange={(event) => update('description', event.target.value)} className="min-h-28 rounded-2xl border border-stone-200 px-4 py-3 md:col-span-2" />
          <input type="file" multiple onChange={(event) => update('images', event.target.files)} className="rounded-2xl border border-dashed border-stone-300 px-4 py-4 md:col-span-2" />
        </div>
        {error && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>}
        <button disabled={submitting} className="mt-6 rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white">{submitting ? 'Publishing…' : 'Publish donation'}</button>
      </form>
      <aside className="rounded-[2rem] bg-slate-900 p-8 text-white shadow-sm"><p className="text-sm uppercase tracking-[0.22em]">Dynamic redistribution priority</p><div className="mt-6 space-y-3 text-sm text-white/90"><p>Priority reflects waiting time, active demand match, distance, quantity, and pickup availability.</p><p>The intended recipient is the category you select here and remains unchanged unless you update the donation.</p><p>FoodBridge prioritizes redistribution operationally and does not determine food safety.</p></div>
        {result && <div className="mt-8 rounded-[1.5rem] bg-white/15 p-5"><p className="font-semibold">{result.foodName}</p><div className="mt-2 flex items-center gap-2"><PriorityBadge urgencyLevel={result.urgencyLevel} /><span>Priority {result.priorityScore}</span></div><p className="mt-3 text-sm"><WaitingTime createdAt={result.createdAt}/></p><p className="mt-2 text-sm">Demand match: {result.priorityFactors?.demandMatchScore > 0 ? 'Active' : 'No active requirement'} · Nearest matching recipient: {result.priorityFactors?.nearestDistanceKm ?? 'Unavailable'} km</p><p className="mt-2 text-sm">Pickup: {result.pickupAvailableFrom && new Date(result.pickupAvailableFrom) > new Date() ? new Date(result.pickupAvailableFrom).toLocaleString() : 'Available now'}</p></div>}
      </aside>
    </div>
  );
}
