import { useEffect, useState } from 'react';
import api from '../utils/api';
import EmptyState from '../components/EmptyState';
import FoodCard from '../components/FoodCard';

export default function RecipientRequests() {
  const [listings, setListings] = useState([]); const [error, setError] = useState('');
  const load = async () => { try { const response = await api.get('/food/claimed/mine'); setListings(response.data.data); setError(''); } catch (e) { setError(e.response?.data?.message || 'Could not load requests'); } };
  useEffect(() => { load(); }, []);
  const complete = async (listing) => { try { await api.put(`/food/${listing._id}/pickup-verify`); load(); } catch (e) { setError(e.response?.data?.message || 'Could not confirm pickup'); } };
  return <div className="space-y-5"><div><p className="text-sm uppercase tracking-[0.22em] text-slate-600">Recipient workflow</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">Requests and pickups</h1></div>{error && <p className="text-sm text-rose-600">{error}</p>}<div className="grid gap-5">{listings.map((listing) => <div key={listing._id}><FoodCard listing={listing}/>{listing.status === 'requested' && <p className="mt-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Waiting for the donor to accept this request.</p>}{listing.status === 'claimed' && <button onClick={() => complete(listing)} className="mt-3 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Confirm pickup and complete</button>}{listing.status === 'completed' && <p className="mt-2 font-semibold text-emerald-700">Donation completed</p>}</div>)}</div>{!error && !listings.length && <EmptyState title="No requests" description="Your donation requests and pickups will appear here."/>}</div>;
}
