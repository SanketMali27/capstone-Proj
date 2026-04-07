import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../utils/api';

export default function WasteAnalytics() {
  const [summary, setSummary] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [weeklyPattern, setWeeklyPattern] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [summaryResponse, predictionResponse, weeklyResponse] = await Promise.all([
          api.get('/analytics/restaurant/waste-summary'),
          api.get('/analytics/restaurant/prediction'),
          api.get('/analytics/restaurant/weekly-pattern')
        ]);

        setSummary(summaryResponse.data.data);
        setPrediction(predictionResponse.data.data);
        setWeeklyPattern(weeklyResponse.data.data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Failed to load analytics');
      }
    };

    fetchAnalytics();
  }, []);

  const cards = summary
    ? [
        { label: 'Total listed this month', value: `${summary.summary.totalListed} units` },
        { label: 'Total claimed', value: `${summary.summary.totalClaimed} kg` },
        { label: 'Total wasted', value: `${summary.summary.totalWasted} kg` },
        { label: 'Waste reduction', value: `${summary.summary.wasteReductionPercentage}%` }
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-slate-600">Restaurant analytics</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Waste patterns and prediction guidance</h1>
      </div>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Day-wise average waste</h2>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyPattern}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="averageWaste" fill="#f18f65" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Monthly waste trend</h2>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary?.monthlyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="waste" stroke="#5c7e46" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] bg-slate-900 p-6 text-white shadow-sm">
          <p className="text-sm uppercase tracking-[0.22em] text-white">Tomorrow prediction</p>
          <h2 className="mt-3 text-3xl font-semibold">{prediction?.tomorrowDay}</h2>
          <p className="mt-3 max-w-2xl text-white/90">{prediction?.recommendation}</p>
        </div>

        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Top wasted items</h2>
          <div className="mt-4 space-y-3">
            {(summary?.topWastedItems || []).map((item) => (
              <div key={item.foodName} className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <span className="font-medium text-slate-800">{item.foodName}</span>
                <span className="text-sm text-slate-600">{item.quantity} kg</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
