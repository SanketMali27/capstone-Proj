const palette = {
  human: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  animal: 'bg-amber-500/10 text-amber-700 border-amber-200',
  industry: 'bg-rose-500/10 text-rose-700 border-rose-200',
  expired: 'bg-slate-400/10 text-slate-600 border-slate-200'
};

export default function CategoryBadge({ category }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${palette[category] || palette.expired}`}>
      {category}
    </span>
  );
}

