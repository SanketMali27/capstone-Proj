export default function EmptyState({ title, description }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}
