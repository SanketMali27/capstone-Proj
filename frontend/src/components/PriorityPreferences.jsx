import { useEffect, useState } from 'react';
import { Sliders, RotateCcw, Check, Info } from 'lucide-react';
import api from '../utils/api';

const FACTOR_INFO = [
  {
    key: 'waitingTime',
    label: 'Waiting Time',
    description: 'Prioritize older, unclaimed surplus that has been waiting longest'
  },
  {
    key: 'demandMatch',
    label: 'Demand Match',
    description: 'Prioritize food types matching your active requirements'
  },
  {
    key: 'distance',
    label: 'Distance Proximity',
    description: 'Prioritize donations closer to your facility coordinates'
  },
  {
    key: 'quantity',
    label: 'Quantity Scale',
    description: 'Prioritize larger batches vs smaller individual donations'
  },
  {
    key: 'pickupAvailability',
    label: 'Pickup Availability',
    description: 'Prioritize donations that are available for immediate pickup'
  }
];

export default function PriorityPreferences({ onPreferencesUpdated }) {
  const [preferences, setPreferences] = useState({
    waitingTime: 35,
    demandMatch: 30,
    distance: 20,
    quantity: 10,
    pickupAvailability: 5
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const res = await api.get('/food/preferences');
      if (res.data?.data?.preferences) {
        setPreferences(res.data.data.preferences);
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load priority preferences');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const totalRaw =
    (Number(preferences.waitingTime) || 0) +
    (Number(preferences.demandMatch) || 0) +
    (Number(preferences.distance) || 0) +
    (Number(preferences.quantity) || 0) +
    (Number(preferences.pickupAvailability) || 0);

  const getNormalized = (value) => {
    if (totalRaw <= 0) return 0;
    return Math.round(((Number(value) || 0) / totalRaw) * 100);
  };

  const handleSliderChange = (key, val) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: Math.max(0, Number(val) || 0)
    }));
    setMessage('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setMessage('');
      const res = await api.put('/food/preferences', { preferences });
      if (res.data?.data?.preferences) {
        setPreferences(res.data.data.preferences);
      }
      setMessage('Preferences saved! Available donations will now be ranked using your operational weights.');
      if (onPreferencesUpdated) {
        onPreferencesUpdated(res.data.data.preferences);
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      setError('');
      setMessage('');
      const res = await api.put('/food/preferences', { reset: true });
      if (res.data?.data?.preferences) {
        setPreferences(res.data.data.preferences);
      }
      setMessage('Restored baseline platform priority preferences.');
      if (onPreferencesUpdated) {
        onPreferencesUpdated(res.data.data.preferences);
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to restore default preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Loading ranking preferences...</p>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-slate-800" />
            <h2 className="text-xl font-semibold text-slate-900">
              Personalized Priority Ranking Preferences
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Tune the 5 operational factors to match your transport capacity and food needs.
            This customized order sorts your dashboard without altering global urgency labels.
          </p>
        </div>
        <div className="rounded-2xl bg-stone-50 px-4 py-2 text-right">
          <p className="text-xs uppercase tracking-wider text-slate-500">Normalized Total</p>
          <p className="text-lg font-bold text-slate-800">100%</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="mt-6 space-y-5">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {FACTOR_INFO.map((factor) => {
            const currentVal = Number(preferences[factor.key]) || 0;
            const normalizedPercent = getNormalized(currentVal);

            return (
              <div
                key={factor.key}
                className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-stone-50/70 p-4 transition hover:border-stone-300"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-800">{factor.label}</span>
                    <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-bold text-white">
                      {normalizedPercent}%
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    {factor.description}
                  </p>
                </div>

                <div className="mt-4 pt-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={currentVal}
                    onChange={(e) => handleSliderChange(factor.key, e.target.value)}
                    className="h-2 w-full cursor-pointer accent-slate-900"
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                    <span>Low (0%)</span>
                    <span>High (100%)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {message && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <Check className="h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="h-4 w-4 shrink-0 text-slate-600" />
            <span>
              Weights are automatically normalized to total 100%. Distance is measured relative to your facility.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-stone-100 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to Defaults
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
