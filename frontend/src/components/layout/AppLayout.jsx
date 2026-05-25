import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { logout } from '../../store/slices/authSlice';
import './AppLayout.scss';

const NAV_ITEMS = [
  { to: '/dashboard', icon: '📄', label: 'myContracts' },
  { to: '/profile',   icon: '👤', label: 'profile'     },
];

const ADMIN_ITEMS = [
  { to: '/admin', icon: '🔧', label: 'adminPanel' },
];

export default function AppLayout() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((s) => s.auth.user);
  const unread = useSelector((s) => s.notifications.unread);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile nav)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar on wide screens
  useEffect(() => {
    function onResize() {
      if (window.innerWidth > 768) setSidebarOpen(false);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  async function handleLogout() {
    await dispatch(logout());
    navigate('/login');
  }

  const initials = user?.name
    ? user.name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('')
    : '?';

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
        {/* Logo */}
        <div className="sidebar__logo">
          <div className="sidebar__logo-mark">📋</div>
          <div>
            <div className="sidebar__logo-text">ContractOS</div>
            <div className="sidebar__logo-sub">ניהול חוזים</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav">
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
              }
            >
              <span className="sidebar__link-icon">{icon}</span>
              {t(label)}
            </NavLink>
          ))}

          {user?.isAdmin && (
            <>
              <div className="sidebar__section-label">ניהול</div>
              {ADMIN_ITEMS.map(({ to, icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
                  }
                >
                  <span className="sidebar__link-icon">{icon}</span>
                  {t(label)}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Footer / User */}
        <div className="sidebar__footer">
          <div className="sidebar__avatar">{initials}</div>
          <div className="sidebar__user-info">
            <span className="sidebar__user">{user?.name}</span>
            <span className="sidebar__user-role">
              {user?.isAdmin ? 'מנהל מערכת' : 'משתמש'}
            </span>
          </div>
          <button className="sidebar__logout" onClick={handleLogout} title="התנתקות">
            🚪
          </button>
        </div>
      </aside>

      <div className="app-content">
        {/* Topbar */}
        <header className="topbar">
          {/* Hamburger — mobile only */}
          <button
            className="topbar__hamburger"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="פתח תפריט"
          >
            <span /><span /><span />
          </button>

          <div className="topbar__notif">
            🔔
            {unread > 0 && (
              <span className="topbar__badge">{unread > 99 ? '99+' : unread}</span>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
