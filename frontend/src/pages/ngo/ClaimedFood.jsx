import { useEffect, useState } from 'react';
import api from '../../utils/api';
import EmptyState from '../../components/EmptyState';
import FoodCard from '../../components/FoodCard';

export default function ClaimedFood() {
  const [listings, setListings] = useState([]);
  const [notes, setNotes] = useState({});
  const [error, setError] = useState('');
  const fetchClaimed = async () => { try { const response = await api.get('/food/claimed/mine'); setListings(response.data.data); setError(''); } catch (e) { setError(e.response?.data?.message || 'Failed to load requests'); } };
  useEffect(() => { fetchClaimed(); }, []);
  const confirmPickup = async (listing) => { try { await api.put(`/food/${listing._id}/pickup-verify`, { notes: notes[listing._id] || '' }); fetchClaimed(); } catch (e) { setError(e.response?.data?.message || 'Failed to confirm pickup'); } };
  return <div className="space-y-6"><div><p className="text-sm uppercase tracking-[0.22em] text-slate-600">Recipient workflow</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">Accepted requests and pickups</h1></div>
    {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>}
    <div className="grid gap-5">{listings.map((listing) => <div key={listing._id} className="space-y-3"><FoodCard listing={listing} />{listing.status === 'requested' && <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Request sent. Waiting for the donor to accept.</p>}{listing.status === 'claimed' && <div className="rounded-[2rem] border border-stone-200 bg-white p-5"><textarea placeholder="Optional pickup note" value={notes[listing._id] || ''} onChange={(e) => setNotes({ ...notes, [listing._id]: e.target.value })} className="min-h-20 w-full rounded-2xl border border-stone-200 px-4 py-3"/><button onClick={() => confirmPickup(listing)} className="mt-3 rounded-full bg-bridge-600 px-5 py-3 text-sm font-semibold text-white">Confirm pickup and complete</button></div>}{listing.status === 'completed' && <p className="font-semibold text-emerald-700">Donation completed</p>}</div>)}</div>
    {!error && listings.length === 0 && <EmptyState title="No accepted requests yet" description="Your request and pickup activity will appear here." />}
  </div>;
}
