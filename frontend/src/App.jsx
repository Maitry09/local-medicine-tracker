import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Public Pages
import Home from './pages/Home';
import SearchMedicines from './pages/SearchMedicines';
import MedicineDetails from './pages/MedicineDetails';
import PharmacyList from './pages/PharmacyList';
import PharmacyDetails from './pages/PharmacyDetails';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Patient Pages
import PatientDashboard from './pages/patient/Dashboard';
import MyOrders from './pages/patient/MyOrders';
import OrderDetails from './pages/patient/OrderDetails';
import MyAlerts from './pages/patient/MyAlerts';
import Cart from './pages/patient/Cart';
import Checkout from './pages/patient/Checkout';

// Pharmacy Pages
import PharmacyDashboard from './pages/pharmacy/PharmacyDashboard';
import ManageStock from './pages/pharmacy/PharmacyStock';
import PharmacyOrders from './pages/pharmacy/PharmacyOrders';
import PharmacyProfile from './pages/pharmacy/PharmacyProfile';
import PharmacyAnalytics from './pages/pharmacy/PharmacyAnalytics';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageUsers from './pages/admin/AdminUsers';
import ManagePharmacies from './pages/admin/AdminPharmacies';
import ManageMedicines from './pages/admin/AdminMedicines';
import AdminOrders from './pages/admin/AdminOrders';

// Components
import ProtectedRoute from './components/ProtectedRoute';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>Loading...</p>
    </div>
  );
  if (!user) return <Home />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'pharmacy') return <Navigate to="/pharmacy/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}

function App() {
  const { loading, user } = useAuth();

  // Only block render during initial auth check (not on navigation)
  // loading is false immediately if no token exists (sync init)
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/search" element={<SearchMedicines />} />
        <Route path="/medicines/:id" element={<MedicineDetails />} />
        <Route path="/pharmacies" element={<PharmacyList />} />
        <Route path="/pharmacies/:id" element={<PharmacyDetails />} />
      </Route>

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      </Route>

      {/* Patient Routes */}
      <Route element={<ProtectedRoute allowedRoles={['patient', 'pharmacy', 'admin']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<PatientDashboard />} />
          <Route path="/orders" element={<MyOrders />} />
          <Route path="/orders/:id" element={<OrderDetails />} />
          <Route path="/alerts" element={<MyAlerts />} />
        </Route>
        <Route element={<MainLayout />}>
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
        </Route>
      </Route>

      {/* Pharmacy Routes */}
      <Route element={<ProtectedRoute allowedRoles={['pharmacy', 'admin']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/pharmacy/dashboard" element={<PharmacyDashboard />} />
          <Route path="/pharmacy/analytics" element={<PharmacyAnalytics />} />
          <Route path="/pharmacy/stock" element={<ManageStock />} />
          <Route path="/pharmacy/orders" element={<PharmacyOrders />} />
          <Route path="/pharmacy/profile" element={<PharmacyProfile />} />
        </Route>
      </Route>

      {/* Admin Routes */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<ManageUsers />} />
          <Route path="/admin/pharmacies" element={<ManagePharmacies />} />
          <Route path="/admin/medicines" element={<ManageMedicines />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
