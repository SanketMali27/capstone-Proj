import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const roleOptions = [
  { value: 'restaurant', label: 'Restaurant / Food Provider' },
  { value: 'ngo', label: 'NGO / Organisation' },
  { value: 'animal_husbandry', label: 'Animal Husbandry Owner' },
  { value: 'industry', label: 'Industrial Unit' }
];

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'restaurant',
    phone: '',
    address: '',
    organizationName: '',
    animalType: '',
    industryType: '',
    longitude: '77.5946',
    latitude: '12.9716'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, roleDashboardMap } = useAuth();
  const navigate = useNavigate();
  const showAnimalType = useMemo(() => form.role === 'animal_husbandry', [form.role]);
  const showIndustryType = useMemo(() => form.role === 'industry', [form.role]);

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await register({
        ...form,
        coordinates: [Number(form.longitude), Number(form.latitude)]
      });
      navigate(roleDashboardMap[data.user.role]);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-[2rem] border border-stone-200 bg-white p-8 shadow-panel">
      <p className="text-sm uppercase tracking-[0.24em] text-slate-600">Onboard your role</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-900">Create a FoodBridge account</h1>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-4 md:grid-cols-2">
        <input
          type="text"
          placeholder="Full name"
          value={form.name}
          onChange={(event) => updateField('name', event.target.value)}
          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-bridge-500"
          required
        />
        <input
          type="text"
          placeholder="Organisation name"
          value={form.organizationName}
          onChange={(event) => updateField('organizationName', event.target.value)}
          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-bridge-500"
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(event) => updateField('email', event.target.value)}
          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-bridge-500"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(event) => updateField('password', event.target.value)}
          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-bridge-500"
          required
        />
        <select
          value={form.role}
          onChange={(event) => updateField('role', event.target.value)}
          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-bridge-500"
        >
          {roleOptions.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Phone"
          value={form.phone}
          onChange={(event) => updateField('phone', event.target.value)}
          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-bridge-500"
        />
        <input
          type="text"
          placeholder="Address"
          value={form.address}
          onChange={(event) => updateField('address', event.target.value)}
          className="md:col-span-2 rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-bridge-500"
        />
        <input
          type="number"
          step="0.0001"
          placeholder="Longitude"
          value={form.longitude}
          onChange={(event) => updateField('longitude', event.target.value)}
          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-bridge-500"
        />
        <input
          type="number"
          step="0.0001"
          placeholder="Latitude"
          value={form.latitude}
          onChange={(event) => updateField('latitude', event.target.value)}
          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-bridge-500"
        />

        {showAnimalType ? (
          <input
            type="text"
            placeholder="Animal type (e.g. cow, poultry)"
            value={form.animalType}
            onChange={(event) => updateField('animalType', event.target.value)}
            className="md:col-span-2 rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-bridge-500"
          />
        ) : null}

        {showIndustryType ? (
          <input
            type="text"
            placeholder="Industry type (e.g. composting, biogas)"
            value={form.industryType}
            onChange={(event) => updateField('industryType', event.target.value)}
            className="md:col-span-2 rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-bridge-500"
          />
        ) : null}

        {error ? <p className="md:col-span-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}

        <button type="submit" disabled={loading} className="md:col-span-2 rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">
          {loading ? 'Creating account...' : 'Register'}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-bridge-700">
          Login here
        </Link>
      </p>
    </div>
  );
}
