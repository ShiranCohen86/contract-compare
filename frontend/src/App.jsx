import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe } from './store/slices/authSlice';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ContractPage from './pages/contract/ContractPage';
import InvitePage from './pages/invite/InvitePage';
import ProfilePage from './pages/profile/ProfilePage';
import AdminPage from './pages/admin/AdminPage';

function RequireAuth({ children }) {
  const user = useSelector((s) => s.auth.user);
  const status = useSelector((s) => s.auth.status);
  if (status === 'loading') return null;
  return user ? children : <Navigate to="/login" replace />;
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
      <Routes>
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/signup"        element={<SignupPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />

        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index                 element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"     element={<DashboardPage />} />
          <Route path="/contracts/:id" element={<ContractPage />} />
          <Route path="/profile"       element={<ProfilePage />} />
          <Route path="/admin"         element={<AdminPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
