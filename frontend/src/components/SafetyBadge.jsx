export default function SafetyBadge({ score = 0 }) {
  const tone =
    score >= 60
      ? 'bg-emerald-100 text-emerald-700'
      : score >= 30
        ? 'bg-amber-100 text-amber-700'
        : 'bg-rose-100 text-rose-700';

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>Safety {score}%</span>;
}

