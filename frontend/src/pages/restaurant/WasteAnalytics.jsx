import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { PlusCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../../utils/api';

export default function WasteAnalytics() {
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [weeklyPattern, setWeeklyPattern] = useState([]);
  const [loading, setLoading] = useState(true);

  // Waste logging modal/form state
  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({
    foodName: '',
    foodType: 'cooked',
    quantityPrepared: '',
    quantityWasted: '',
    quantityClaimed: '',
    specialEvent: false
  });
  const [logSubmitting, setLogSubmitting] = useState(false);
  const [logSuccess, setLogSuccess] = useState('');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      const [summaryResponse, predictionResponse, weeklyResponse] = await Promise.all([
        api.get('/analytics/restaurant/waste-summary'),
        api.get('/analytics/restaurant/prediction'),
        api.get('/analytics/restaurant/weekly-pattern')
      ]);

      setSummary(summaryResponse.data?.data || null);
      setPrediction(predictionResponse.data?.data || null);
      setWeeklyPattern(weeklyResponse.data?.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    try {
      setLogSubmitting(true);
      setError('');
      setLogSuccess('');

      const foodItems = [
        {
          foodName: logForm.foodName,
          foodType: logForm.foodType,
          quantityPrepared: Number(logForm.quantityPrepared) || 0,
          quantityWasted: Number(logForm.quantityWasted) || 0,
          quantityClaimed: Number(logForm.quantityClaimed) || 0
        }
      ];

      await api.post('/analytics/restaurant/waste-record', {
        date: new Date(),
        foodItems,
        totalWasted: Number(logForm.quantityWasted) || 0,
        totalClaimed: Number(logForm.quantityClaimed) || 0,
        specialEvent: logForm.specialEvent
      });

      setLogSuccess('Daily surplus & waste record saved successfully!');
      setLogForm({
        foodName: '',
        foodType: 'cooked',
        quantityPrepared: '',
        quantityWasted: '',
        quantityClaimed: '',
        specialEvent: false
      });
      setShowLogForm(false);
      await fetchAnalytics();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save waste record');
    } finally {
      setLogSubmitting(false);
    }
  };

  const cards = summary?.summary
    ? [
        {
          label: 'Total Listed (Month)',
          value: `${summary.summary.totalListed} units`,
          hint: `${summary.summary.totalCompletedCount || 0} donations completed`
        },
        {
          label: 'Redistributed / Claimed',
          value: `${summary.summary.totalClaimed} kg`,
          hint: 'Verified surplus rescued'
        },
        {
          label: 'Recorded Waste',
          value: `${summary.summary.totalWasted} kg`,
          hint: 'Actual uncollected waste'
        },
        {
          label: 'Waste Reduction Rate',
          value: `${summary.summary.wasteReductionPercentage}%`,
          hint: 'Claimed vs listed ratio'
        }
      ]
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-slate-600">Restaurant Analytics</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">
            Surplus History & Rule-Based Preparation Guidance
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Track historical surplus, recorded waste trends, and operational prep guidance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowLogForm((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <PlusCircle className="h-4 w-4" />
          {showLogForm ? 'Close Log Form' : 'Log Waste Record'}
        </button>
      </div>

      {logSuccess && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{logSuccess}</span>
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      {/* Log Daily Record Card */}
      {showLogForm && (
        <form
          onSubmit={handleLogSubmit}
          className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm space-y-4"
        >
          <h2 className="text-xl font-semibold text-slate-900">Log Daily Waste & Surplus Record</h2>
          <p className="text-xs text-slate-600">
            Records are stored in your restaurant history and used to generate day-of-week preparation recommendations.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              required
              placeholder="Item name (e.g. Rice, Curry, Bread)"
              value={logForm.foodName}
              onChange={(e) => setLogForm({ ...logForm, foodName: e.target.value })}
              className="rounded-2xl border border-stone-200 px-4 py-2.5 text-sm"
            />

            <select
              value={logForm.foodType}
              onChange={(e) => setLogForm({ ...logForm, foodType: e.target.value })}
              className="rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm"
            >
              <option value="cooked">Cooked</option>
              <option value="raw">Raw</option>
              <option value="packaged">Packaged</option>
              <option value="dairy">Dairy</option>
              <option value="bakery">Bakery</option>
              <option value="mixed">Mixed</option>
            </select>

            <input
              type="number"
              min="0"
              placeholder="Quantity prepared (kg)"
              value={logForm.quantityPrepared}
              onChange={(e) => setLogForm({ ...logForm, quantityPrepared: e.target.value })}
              className="rounded-2xl border border-stone-200 px-4 py-2.5 text-sm"
            />

            <input
              required
              type="number"
              min="0"
              placeholder="Quantity wasted (kg)"
              value={logForm.quantityWasted}
              onChange={(e) => setLogForm({ ...logForm, quantityWasted: e.target.value })}
              className="rounded-2xl border border-stone-200 px-4 py-2.5 text-sm"
            />

            <input
              type="number"
              min="0"
              placeholder="Quantity claimed / donated (kg)"
              value={logForm.quantityClaimed}
              onChange={(e) => setLogForm({ ...logForm, quantityClaimed: e.target.value })}
              className="rounded-2xl border border-stone-200 px-4 py-2.5 text-sm"
            />

            <label className="flex items-center gap-2 text-sm text-slate-700 px-2 py-2">
              <input
                type="checkbox"
                checked={logForm.specialEvent}
                onChange={(e) => setLogForm({ ...logForm, specialEvent: e.target.checked })}
                className="h-4 w-4 rounded accent-slate-900"
              />
              <span>Special event / holiday</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowLogForm(false)}
              className="rounded-full border border-stone-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={logSubmitting}
              className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {logSubmitting ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>
      )}

      {/* Metrics Row */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</p>
            <p className="mt-1 text-xs text-slate-500">{card.hint}</p>
          </div>
        ))}
      </section>

      {/* Charts Section */}
      <section className="grid gap-6 xl:grid-cols-2">
        {/* Day-wise average waste */}
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Day-wise Historical Average</h2>
            <span className="text-xs text-slate-500">Recorded Surplus & Waste (kg)</span>
          </div>

          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyPattern}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="day" interval={0} tick={{ fontSize: 13 }} height={40} />
                <YAxis unit="kg" />
                <Tooltip
                  formatter={(val, name) => [
                    `${val} kg`,
                    name === 'averageWaste' ? 'Avg Waste' : 'Avg Claimed'
                  ]}
                />
                <Bar dataKey="averageWaste" fill="#f18f65" name="averageWaste" radius={[8, 8, 0, 0]} />
                <Bar dataKey="averageClaimed" fill="#5c7e46" name="averageClaimed" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-center gap-6 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#f18f65]" />
              <span>Recorded Waste (kg)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#5c7e46]" />
              <span>Redistributed / Donated (kg)</span>
            </div>
          </div>
        </div>

        {/* Monthly Waste Trend */}
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Monthly Surplus Trends</h2>
            <span className="text-xs text-slate-500">Last 6 Months</span>
          </div>

          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={summary?.monthlyTrend || []}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" />
                <YAxis unit="kg" />
                <Tooltip formatter={(val) => `${val} kg`} />
                <Line
                  type="monotone"
                  dataKey="recordedWaste"
                  name="Recorded Waste"
                  stroke="#e11d48"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="redistributedClaimed"
                  name="Redistributed"
                  stroke="#5c7e46"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-center gap-6 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#e11d48]" />
              <span>Recorded Waste</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#5c7e46]" />
              <span>Redistributed Food</span>
            </div>
          </div>
        </div>
      </section>

      {/* Rule-Based Preparation Guidance Card */}
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[2rem] bg-slate-900 p-8 text-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.22em] text-stone-400">
                Rule-Based Preparation Guidance
              </p>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-stone-300">
                Tomorrow: {prediction?.tomorrowDay || 'Next Day'}
              </span>
            </div>

            {prediction?.hasSufficientData ? (
              <div className="mt-4 space-y-3">
                <h3 className="text-3xl font-semibold">
                  {prediction.predictedWaste} kg Expected Surplus
                </h3>
                <p className="text-sm leading-relaxed text-stone-300">
                  {prediction.recommendation}
                </p>
                {prediction.recommendedReductionPercentage > 0 && (
                  <div className="inline-block rounded-2xl bg-amber-500/20 border border-amber-400/30 px-4 py-2 text-xs text-amber-200">
                    Suggested Prep Adjustment: prepare {prediction.recommendedReductionPercentage}% less on {prediction.tomorrowDay}s
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-300">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-semibold text-lg">Insufficient Historical Data</span>
                </div>
                <p className="text-sm leading-relaxed text-stone-300">
                  {prediction?.recommendation ||
                    'Log surplus and waste entries over multiple days to unlock day-of-week preparation estimates.'}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex items-start gap-2 text-xs text-stone-400">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-stone-300" />
            <p>
              {prediction?.disclaimer ||
                'This guidance is a rule-based operational heuristic derived from historical log entries. It does not predict food safety, spoilage, or suitability for human consumption.'}
            </p>
          </div>
        </div>

        {/* Top Wasted Items */}
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Top Recorded Waste Items</h2>
          <p className="text-xs text-slate-500 mt-1">
            Items logged with the highest recorded waste quantities.
          </p>

          <div className="mt-5 space-y-2.5">
            {(summary?.topWastedItems || []).length > 0 ? (
              summary.topWastedItems.map((item) => (
                <div
                  key={item.foodName}
                  className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3"
                >
                  <span className="font-medium text-slate-800">{item.foodName}</span>
                  <span className="text-sm font-semibold text-slate-600">{item.quantity} kg</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 py-6 text-center">
                No recorded waste entries logged yet this month.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
