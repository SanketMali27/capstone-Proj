import { useMemo, useState } from 'react';
import api from '../../utils/api';

const getSeasonFromMonth = (month) => {
  if ([2, 3, 4].includes(month)) {
    return 'summer';
  }
  if ([5, 6, 7, 8].includes(month)) {
    return 'monsoon';
  }
  if ([9, 10].includes(month)) {
    return 'spring';
  }
  return 'winter';
};

export default function AddFoodListing() {
  const defaultSeason = useMemo(() => getSeasonFromMonth(new Date().getMonth()), []);
  const [form, setForm] = useState({
    foodName: '',
    foodType: 'cooked',
    foodCategory: 'veg',
    quantity: '',
    quantityUnit: 'kg',
    preparedAt: new Date().toISOString().slice(0, 16),
    storageTemperature: 18,
    humidity: 50,
    season: defaultSeason,
    description: '',
    images: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);
    setError('');

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key !== 'images') {
          formData.append(key, value);
        }
      });

      Array.from(form.images || []).forEach((file) => formData.append('images', file));
      const response = await api.post('/food', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setResult(response.data);
      setForm((current) => ({
        ...current,
        foodName: '',
        quantity: '',
        description: '',
        images: []
      }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <form onSubmit={handleSubmit} className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm uppercase tracking-[0.22em] text-slate-600">Restaurant workflow</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Add food listing</h1>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <input
            type="text"
            placeholder="Food name"
            value={form.foodName}
            onChange={(event) => updateField('foodName', event.target.value)}
            className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-bridge-500"
            required
          />
          <select
            value={form.foodType}
            onChange={(event) => updateField('foodType', event.target.value)}
            className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-bridge-500"
          >
            <option value="cooked">Cooked</option>
            <option value="raw">Raw</option>
            <option value="packaged">Packaged</option>
            <option value="dairy">Dairy</option>
            <option value="bakery">Bakery</option>
            <option value="mixed">Mixed</option>
          </select>
          <div className="flex gap-2 rounded-2xl border border-stone-200 p-1">
            {['veg', 'non-veg', 'vegan'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => updateField('foodCategory', option)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${form.foodCategory === option ? 'bg-bridge-600 text-white' : 'bg-white text-slate-800'}`}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_140px] gap-2">
            <input
              type="number"
              placeholder="Quantity"
              value={form.quantity}
              onChange={(event) => updateField('quantity', event.target.value)}
              className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-bridge-500"
              required
            />
            <select
              value={form.quantityUnit}
              onChange={(event) => updateField('quantityUnit', event.target.value)}
              className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-bridge-500"
            >
              <option value="kg">kg</option>
              <option value="litres">litres</option>
              <option value="portions">portions</option>
              <option value="boxes">boxes</option>
            </select>
          </div>
          <input
            type="datetime-local"
            value={form.preparedAt}
            onChange={(event) => updateField('preparedAt', event.target.value)}
            className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-bridge-500"
          />
          <input
            type="number"
            placeholder="Storage temperature (°C)"
            value={form.storageTemperature}
            onChange={(event) => updateField('storageTemperature', event.target.value)}
            className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-bridge-500"
          />
          <div className="rounded-2xl border border-stone-200 px-4 py-3">
            <label className="text-sm font-medium text-slate-800">Humidity: {form.humidity}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={form.humidity}
              onChange={(event) => updateField('humidity', event.target.value)}
              className="mt-2 w-full accent-clay"
            />
          </div>
          <select
            value={form.season}
            onChange={(event) => updateField('season', event.target.value)}
            className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-bridge-500"
          >
            <option value="summer">Summer</option>
            <option value="winter">Winter</option>
            <option value="monsoon">Monsoon</option>
            <option value="spring">Spring</option>
          </select>
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
            className="md:col-span-2 min-h-32 rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-bridge-500"
          />
          <input
            type="file"
            multiple
            onChange={(event) => updateField('images', event.target.files)}
            className="md:col-span-2 rounded-2xl border border-dashed border-stone-300 px-4 py-4"
          />
        </div>

        {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}

        <button type="submit" disabled={submitting} className="mt-6 rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white">
          {submitting ? 'Creating listing...' : 'Publish listing'}
        </button>
      </form>

      <div className="rounded-[2rem] border border-stone-200 bg-slate-900 p-8 text-white shadow-sm">
        <p className="text-sm uppercase tracking-[0.22em] text-white">What happens next</p>
        <div className="mt-6 space-y-4 text-sm text-white/90">
          <p>1. Safety score is calculated using storage, humidity, food type, time, and season.</p>
          <p>2. The listing is auto-routed to NGOs, farms, or industry based on its current safe-use band.</p>
          <p>3. Nearby users receive targeted notifications and the countdown starts immediately.</p>
        </div>

        {result ? (
          <div className="mt-8 rounded-[1.5rem] bg-white/15 p-5">
            <p className="text-sm text-white/90">{result.message}</p>
            <p className="mt-2 text-2xl font-semibold">{result.data.currentCategory.toUpperCase()}</p>
            <p className="mt-2 text-sm text-white/90">Safety score: {result.data.safetyScore}%</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
