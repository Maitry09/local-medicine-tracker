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
import Reviews from './pages/Reviews';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Patient Pages
import PatientDashboard from './pages/patient/Dashboard';
import PrescriptionUpload from './pages/patient/PrescriptionUpload';
import MyOrders from './pages/patient/MyOrders';
import MyReviews from './pages/patient/MyReviews';
import OrderDetails from './pages/patient/OrderDetails';
import MyAlerts from './pages/patient/MyAlerts';
import Cart from './pages/patient/Cart';
import Checkout from './pages/patient/Checkout';

// Pharmacy Pages
import PharmacyDashboard from './pages/pharmacy/PharmacyDashboard';
import ManageStock from './pages/pharmacy/PharmacyStock';
import PharmacyOrders from './pages/pharmacy/PharmacyOrders';
import PharmacyProfile from './pages/pharmacy/PharmacyProfile';
import PharmacySettings from './pages/pharmacy/PharmacySettings';
import PharmacyAnalytics from './pages/pharmacy/PharmacyAnalytics';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageUsers from './pages/admin/AdminUsers';
import ManagePharmacies from './pages/admin/AdminPharmacies';
import ManageMedicines from './pages/admin/AdminMedicines';
import AdminOrders from './pages/admin/AdminOrders';
import AdminPrescriptions from './pages/admin/AdminPrescriptions';

// Components
import ProtectedRoute from './components/ProtectedRoute';

function RootRedirect() {
  const { user, token, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!token || !user) {
    return <Home />;
  }

  if (user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (user?.role === 'pharmacy') {
    return <Navigate to="/pharmacy/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

function AuthRedirect({ children }) {
  const { token } = useAuth();

  return token ? <Navigate to="/" replace /> : children;
}

function App() {
  const { loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<RootRedirect />} />

        <Route path="/search" element={<SearchMedicines />} />

        <Route path="/medicines/:id" element={<MedicineDetails />} />

        <Route path="/pharmacies" element={<PharmacyList />} />

        <Route path="/pharmacies/:id" element={<PharmacyDetails />} />
        <Route path="/reviews" element={<Reviews />} />

        <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
        </Route>
      </Route>

      {/* AUTH ROUTES */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <AuthRedirect>
              <Login />
            </AuthRedirect>
          }
        />

        <Route
          path="/register"
          element={
            <AuthRedirect>
              <Register />
            </AuthRedirect>
          }
        />

        <Route
          path="/forgot-password"
          element={
            <AuthRedirect>
              <ForgotPassword />
            </AuthRedirect>
          }
        />

        <Route
          path="/reset-password"
          element={
            <AuthRedirect>
              <ResetPassword />
            </AuthRedirect>
          }
        />
      </Route>

      {/* PATIENT ROUTES */}
      <Route
        element={<ProtectedRoute allowedRoles={['patient']} />}
      >
        <Route element={<DashboardLayout />}>
          <Route
            path="/dashboard"
            element={<PatientDashboard />}
          />

          <Route
            path="/orders"
            element={<MyOrders />}
          />

          <Route
            path="/orders/:id"
            element={<OrderDetails />}
          />

          <Route
            path="/alerts"
            element={<MyAlerts />}
          />

          <Route
            path="/my-reviews"
            element={<MyReviews />}
          />

          <Route
            path="/patient/prescription-upload/:id?"
            element={<PrescriptionUpload />}
          />
        </Route>
      </Route>

      {/* PHARMACY ROUTES */}
      <Route
        element={<ProtectedRoute allowedRoles={['pharmacy']} />}
      >
        <Route element={<DashboardLayout />}>
          <Route
            path="/pharmacy/dashboard"
            element={<PharmacyDashboard />}
          />

          <Route
            path="/pharmacy/analytics"
            element={<PharmacyAnalytics />}
          />

          <Route
            path="/pharmacy/stock"
            element={<ManageStock />}
          />

          <Route
            path="/pharmacy/orders"
            element={<PharmacyOrders />}
          />

          <Route
            path="/pharmacy/profile"
            element={<PharmacyProfile />}
          />
          <Route
            path="/pharmacy/settings"
            element={<PharmacySettings />}
          />
        </Route>
      </Route>

      {/* ADMIN ROUTES */}
      <Route
        element={<ProtectedRoute allowedRoles={['admin']} />}
      >
        <Route element={<DashboardLayout />}>
          <Route
            path="/admin/dashboard"
            element={<AdminDashboard />}
          />

          <Route
            path="/admin/users"
            element={<ManageUsers />}
          />

          <Route
            path="/admin/pharmacies"
            element={<ManagePharmacies />}
          />

          <Route
            path="/admin/medicines"
            element={<ManageMedicines />}
          />

          <Route
            path="/admin/orders"
            element={<AdminOrders />}
          />
          <Route
            path="/admin/prescriptions"
            element={<AdminPrescriptions />}
          />
        </Route>
      </Route>

      {/* 404 */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

export default App;