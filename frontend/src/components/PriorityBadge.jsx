const styles = {
  URGENT: 'bg-rose-100 text-rose-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-amber-100 text-amber-800',
  NORMAL: 'bg-emerald-100 text-emerald-700'
};

export default function PriorityBadge({ urgencyLevel = 'NORMAL' }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide ${styles[urgencyLevel] || styles.NORMAL}`}>{urgencyLevel}</span>;
}
