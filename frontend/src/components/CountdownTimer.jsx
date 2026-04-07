import { useEffect, useState } from 'react';

const getRemaining = (target) => {
  const distance = new Date(target).getTime() - Date.now();
  if (distance <= 0) {
    return { total: 0, text: 'Expired - Checking for downgrade...' };
  }

  const hours = Math.floor(distance / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  return {
    total: distance,
    text: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  };
};

export default function CountdownTimer({ targetTime, label = 'Expires in' }) {
  const [remaining, setRemaining] = useState(() => getRemaining(targetTime));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(getRemaining(targetTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime]);

  const tone =
    remaining.total > 2 * 60 * 60 * 1000
      ? 'text-emerald-600'
      : remaining.total > 60 * 60 * 1000
        ? 'text-amber-600'
        : 'text-rose-600';

  return (
    <div className="rounded-2xl bg-stone-100 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-600">{label}</p>
      <p className={`text-lg font-semibold ${tone}`}>{remaining.text}</p>
    </div>
  );
}
