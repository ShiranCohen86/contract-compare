import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { logout } from '../../store/slices/authSlice';
import { fetchNotifications, markAllRead, addNotification } from '../../store/slices/notificationsSlice';
import { getSocket } from '../../lib/socket';
import { toast } from '../../lib/toaster';
import Toaster from '../ui/Toaster';
import './AppLayout.scss';

const NAV_ITEMS = [
  { to: '/dashboard', icon: '📄', label: 'myContracts' },
  { to: '/profile',   icon: '👤', label: 'profile'     },
];

const ADMIN_ITEMS = [
  { to: '/admin', icon: '🔧', label: 'adminPanel' },
];

const NOTIF_ICONS = {
  CLAUSE_ADDED:          '➕',
  CHANGE_PROPOSED:       '✏️',
  CHANGE_APPROVED:       '✅',
  CHANGE_REJECTED:       '❌',
  CHANGE_WITHDRAWN:      '↩️',
  FINAL_APPROVAL_READY:  '🏁',
  PARTNER_APPROVED:      '🤝',
  CONTRACT_APPROVED:     '🎉',
  INVITE_ACCEPTED:       '👋',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'עכשיו';
  if (m < 60) return `לפני ${m} דק'`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} שע'`;
  return `לפני ${Math.floor(h / 24)} ימים`;
}

export default function AppLayout() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((s) => s.auth.user);
  const { items: notifItems, unread } = useSelector((s) => s.notifications);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Close sidebar on wide screens
  useEffect(() => {
    function onResize() { if (window.innerWidth > 768) setSidebarOpen(false); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Close notif panel when clicking outside
  useEffect(() => {
    function onClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Fetch notifications on mount
  useEffect(() => { dispatch(fetchNotifications()); }, [dispatch]);

  // Real-time: listen for new notifications via Socket.io
  useEffect(() => {
    const socket = getSocket();

    function onNotifNew(notif) {
      dispatch(addNotification(notif));
      // Show a toast for the incoming notification
      toast(notif.title + (notif.body ? ` — ${notif.body}` : ''), { type: 'info' });
    }

    socket.on('notification:new', onNotifNew);
    return () => socket.off('notification:new', onNotifNew);
  }, [dispatch]);

  async function handleLogout() {
    await dispatch(logout());
    navigate('/login');
  }

  function handleMarkAllRead() {
    dispatch(markAllRead());
    setNotifOpen(false);
  }

  const initials = user?.name
    ? user.name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('')
    : '?';

  return (
    <div className="app-layout">
      {/* Toast renderer */}
      <Toaster />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar__logo">
          <div className="sidebar__logo-mark">📋</div>
          <div>
            <div className="sidebar__logo-text">ContractOS</div>
            <div className="sidebar__logo-sub">ניהול חוזים</div>
          </div>
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
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
                  className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
                >
                  <span className="sidebar__link-icon">{icon}</span>
                  {t(label)}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__avatar">{initials}</div>
          <div className="sidebar__user-info">
            <span className="sidebar__user">{user?.name}</span>
            <span className="sidebar__user-role">{user?.isAdmin ? 'מנהל מערכת' : 'משתמש'}</span>
          </div>
          <button className="sidebar__logout" onClick={handleLogout} title="התנתקות">🚪</button>
        </div>
      </aside>

      <div className="app-content">
        <header className="topbar">
          <button
            className="topbar__hamburger"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="פתח תפריט"
          >
            <span /><span /><span />
          </button>

          {/* Notification Bell */}
          <div className="topbar__notif-wrap" ref={notifRef}>
            <button
              className="topbar__notif"
              onClick={() => setNotifOpen((o) => !o)}
              aria-label="התראות"
            >
              🔔
              {unread > 0 && (
                <span className="topbar__badge">{unread > 99 ? '99+' : unread}</span>
              )}
            </button>

            {notifOpen && (
              <div className="notif-panel">
                <div className="notif-panel__header">
                  <span className="notif-panel__title">התראות</span>
                  {unread > 0 && (
                    <button className="notif-panel__mark-all" onClick={handleMarkAllRead}>
                      סמן הכל כנקרא
                    </button>
                  )}
                </div>

                <div className="notif-panel__list">
                  {notifItems.length === 0 ? (
                    <p className="notif-panel__empty">אין התראות</p>
                  ) : (
                    notifItems.slice(0, 15).map((n) => (
                      <div
                        key={n._id}
                        className={`notif-item${n.isRead ? '' : ' notif-item--unread'}`}
                        onClick={() => {
                          setNotifOpen(false);
                          if (n.contractId) navigate(`/contracts/${n.contractId}`);
                        }}
                      >
                        <span className="notif-item__icon">
                          {NOTIF_ICONS[n.type] || '🔔'}
                        </span>
                        <div className="notif-item__body">
                          <p className="notif-item__title">{n.title}</p>
                          {n.body && <p className="notif-item__sub">{n.body}</p>}
                          <p className="notif-item__time">{timeAgo(n.createdAt)}</p>
                        </div>
                        {!n.isRead && <span className="notif-item__dot" />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
