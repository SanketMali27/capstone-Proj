import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const navigationByRole = {
  restaurant: [{ label: 'Dashboard', to: '/restaurant/dashboard' }, { label: 'Add Donation', to: '/restaurant/add-listing' }, { label: 'My Donations', to: '/restaurant/listings' }, { label: 'Analytics', to: '/restaurant/analytics' }],
  ngo: [{ label: 'Dashboard', to: '/ngo/dashboard' }, { label: 'Available Donations', to: '/ngo/available-food' }, { label: 'Requests and Pickups', to: '/ngo/claimed-food' }],
  animal_husbandry: [{ label: 'Dashboard', to: '/animal/dashboard' }, { label: 'Available Donations', to: '/animal/available-food' }, { label: 'Requests and Pickups', to: '/animal/requests' }],
  industry: [{ label: 'Dashboard', to: '/industry/dashboard' }, { label: 'Available Donations', to: '/industry/available-food' }, { label: 'Requests and Pickups', to: '/industry/requests' }],
  admin: [{ label: 'Dashboard', to: '/admin/dashboard' }]
};

export default function Navbar() {

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = user ? navigationByRole[user.role] || [] : [];
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return <header className="sticky top-0 z-30 border-b border-white/40 bg-stone-50/95 backdrop-blur">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
      <Link to="/" className="flex items-center gap-3">
        <div className="rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold uppercase tracking-[0.22em] text-white">FoodBridge</div>
        <p className="hidden text-sm text-slate-700 md:block">Dynamic food redistribution priority</p></Link>
      <div className="hidden items-center gap-2 md:flex">
        {links.map((link) => <NavLink key={link.to} to={link.to} className={({ isActive }) => `rounded-full px-4 py-2 text-sm font-medium ${isActive ? 'bg-bridge-600 text-white' : 'text-slate-800 hover:bg-white hover:text-slate-900'}`}>{link.label}</NavLink>)}
      </div>
      <div className="flex items-center gap-3">
        {user && <NotificationBell />}
        {user ? <><div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-slate-800">{user.organizationName || user.name}</p>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-600">{user.role.replace('_', ' ')}</p>
        </div>
          <button type="button" onClick={handleLogout} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">Logout</button>
        </> : <div className="flex items-center gap-2">
          <Link to="/login" className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-slate-900">Login</Link>
          <Link to="/register" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">Register</Link>
        </div>}
      </div>
    </div>
  </header>;
}
