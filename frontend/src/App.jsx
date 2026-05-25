import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe } from './store/slices/authSlice';
import AppLayout from './components/layout/AppLayout';

const LoginPage    = lazy(() => import('./pages/auth/LoginPage'));
const SignupPage   = lazy(() => import('./pages/auth/SignupPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const ContractPage  = lazy(() => import('./pages/contract/ContractPage'));
const ExportPage    = lazy(() => import('./pages/export/ExportPage'));
const InvitePage    = lazy(() => import('./pages/invite/InvitePage'));
const ProfilePage   = lazy(() => import('./pages/profile/ProfilePage'));
const AdminPage     = lazy(() => import('./pages/admin/AdminPage'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b', fontSize: 14 }}>
      טוען...
    </div>
  );
}

function RequireAuth({ children }) {
  const user = useSelector((s) => s.auth.user);
  const status = useSelector((s) => s.auth.status);
  if (status === 'loading') return null;
  return user ? children : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }) {
  const user = useSelector((s) => s.auth.user);
  const status = useSelector((s) => s.auth.status);
  if (status === 'loading') return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    if (localStorage.getItem('accessToken')) {
      dispatch(fetchMe());
    }
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/signup"        element={<SignupPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />

        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index                 element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"     element={<DashboardPage />} />
          <Route path="/contracts/:id"        element={<ContractPage />} />
          <Route path="/contracts/:id/export" element={<ExportPage />} />
          <Route path="/profile"       element={<ProfilePage />} />
          <Route path="/admin"         element={<RequireAdmin><AdminPage /></RequireAdmin>} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
