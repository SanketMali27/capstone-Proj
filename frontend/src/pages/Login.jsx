import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, roleDashboardMap } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await login(form);
      navigate(roleDashboardMap[data.user.role]);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-[2rem] border border-stone-200 bg-white p-8 shadow-panel">
      <p className="text-sm uppercase tracking-[0.24em] text-slate-600">Welcome back</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-900">Login to FoodBridge</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-bridge-500"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-bridge-500"
          required
        />

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}

        <button type="submit" disabled={loading} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Need an account?{' '}
        <Link to="/register" className="font-semibold text-bridge-700">
          Register here
        </Link>
      </p>
    </div>
  );
}
