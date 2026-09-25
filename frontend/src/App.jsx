import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import RestaurantDashboard from './pages/restaurant/RestaurantDashboard';
import AddFoodListing from './pages/restaurant/AddFoodListing';
import MyListings from './pages/restaurant/MyListings';
import WasteAnalytics from './pages/restaurant/WasteAnalytics';
import NGODashboard from './pages/ngo/NGODashboard';
import AvailableFood from './pages/ngo/AvailableFood';
import ClaimedFood from './pages/ngo/ClaimedFood';
import AnimalDashboard from './pages/animal/AnimalDashboard';
import AvailableForAnimals from './pages/animal/AvailableForAnimals';
import IndustryDashboard from './pages/industry/IndustryDashboard';
import AvailableForIndustry from './pages/industry/AvailableForIndustry';
import AdminDashboard from './pages/admin/AdminDashboard';
import RecipientRequests from './pages/RecipientRequests';


export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute roles={['restaurant']} />}>
            <Route path="/restaurant/dashboard" element={<RestaurantDashboard />} />
            <Route path="/restaurant/add-listing" element={<AddFoodListing />} />
            <Route path="/restaurant/listings" element={<MyListings />} />
            <Route path="/restaurant/analytics" element={<WasteAnalytics />} />
          </Route>

          <Route element={<ProtectedRoute roles={['ngo']} />}>
            <Route path="/ngo/dashboard" element={<NGODashboard />} />
            <Route path="/ngo/available-food" element={<AvailableFood />} />
            <Route path="/ngo/claimed-food" element={<ClaimedFood />} />
          </Route>

          <Route element={<ProtectedRoute roles={['animal_husbandry']} />}>
            <Route path="/animal/dashboard" element={<AnimalDashboard />} />
            <Route path="/animal/available-food" element={<AvailableForAnimals />} />
            <Route path="/animal/requests" element={<RecipientRequests />} />
          </Route>

          <Route element={<ProtectedRoute roles={['industry']} />}>
            <Route path="/industry/dashboard" element={<IndustryDashboard />} />
            <Route path="/industry/available-food" element={<AvailableForIndustry />} />
            <Route path="/industry/requests" element={<RecipientRequests />} />
          </Route>

          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}

