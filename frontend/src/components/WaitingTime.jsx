import { useEffect, useState } from 'react';

const formatDuration = (milliseconds) => {
  const minutes = Math.max(0, Math.floor(milliseconds / 60000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  return `${days ? `${days}d ` : ''}${hours % 24}h ${minutes % 60}m`;
};

export default function WaitingTime({ createdAt }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  return <span>Waiting: {formatDuration(now - new Date(createdAt || now).getTime())}</span>;
}
