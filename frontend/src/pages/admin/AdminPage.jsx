import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import './Admin.scss';

const STATUS_HE = {
  DRAFT: 'טיוטה', AWAITING_REVIEW: 'ממתין לעיון', NEGOTIATING: 'במשא ומתן',
  PENDING_FINAL: 'ממתין לאישור סופי', APPROVED: 'מאושר', EXPORTED: 'יוצא', CANCELLED: 'בוטל',
};
const STATUS_BADGE = {
  DRAFT: 'gray', AWAITING_REVIEW: 'blue', NEGOTIATING: 'yellow',
  PENDING_FINAL: 'yellow', APPROVED: 'green', EXPORTED: 'green', CANCELLED: 'red',
};

function StatsCard({ label, value, color }) {
  return (
    <div className="stats-card" style={{ borderTop: `4px solid ${color}` }}>
      <div className="stats-card__value">{value ?? '—'}</div>
      <div className="stats-card__label">{label}</div>
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [contracts, setContracts] = useState([]);
  const [contractStatus, setContractStatus] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditAction, setAuditAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = userSearch ? `?search=${encodeURIComponent(userSearch)}` : '';
      const { data } = await api.get(`/admin/users${params}`);
      setUsers(data.items || []);
    } finally {
      setLoading(false);
    }
  }, [userSearch]);

  const loadContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params = contractStatus ? `?status=${contractStatus}` : '';
      const { data } = await api.get(`/admin/contracts${params}`);
      setContracts(data.items || []);
    } finally {
      setLoading(false);
    }
  }, [contractStatus]);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = auditAction ? `?action=${encodeURIComponent(auditAction)}` : '';
      const { data } = await api.get(`/admin/audit-logs${params}`);
      setAuditLogs(data.items || []);
    } finally {
      setLoading(false);
    }
  }, [auditAction]);

  useEffect(() => {
    if (tab === 'stats')     loadStats();
    if (tab === 'users')     loadUsers();
    if (tab === 'contracts') loadContracts();
    if (tab === 'audit')     loadAuditLogs();
  }, [tab, loadStats, loadUsers, loadContracts, loadAuditLogs]);

  async function handleUserAction(userId, action) {
    setActionLoading(userId + action);
    try {
      await api.patch(`/admin/users/${userId}/${action}`);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'שגיאה');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="admin-page">
      <h2 className="admin-page__title">🔧 ממשק מנהל</h2>

      <div className="admin-tabs">
        {[
          { key: 'stats',     label: '📊 סטטיסטיקות' },
          { key: 'users',     label: '👥 משתמשים' },
          { key: 'contracts', label: '📄 חוזים' },
          { key: 'audit',     label: '📋 יומן ביקורת' },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`admin-tab ${tab === key ? 'admin-tab--active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p className="admin-loading">טוען...</p>}

      {/* Stats */}
      {tab === 'stats' && stats && !loading && (
        <div>
          <div className="stats-grid">
            <StatsCard label="סה״כ משתמשים"    value={stats.totalUsers}   color="#2563eb" />
            <StatsCard label="משתמשים פעילים"  value={stats.activeUsers}  color="#16a34a" />
            <StatsCard label="סה״כ חוזים"       value={stats.totalContracts} color="#7c3aed" />
            <StatsCard label="חוזים מאושרים"   value={stats.contractsByStatus?.APPROVED ?? 0} color="#16a34a" />
            <StatsCard label="טיוטות"           value={stats.contractsByStatus?.DRAFT ?? 0} color="#64748b" />
            <StatsCard label="במשא ומתן"        value={(stats.contractsByStatus?.NEGOTIATING ?? 0) + (stats.contractsByStatus?.AWAITING_REVIEW ?? 0)} color="#d97706" />
            <StatsCard label="מבוטלים"          value={stats.contractsByStatus?.CANCELLED ?? 0} color="#dc2626" />
            <StatsCard label="יוצאו"            value={stats.contractsByStatus?.EXPORTED ?? 0} color="#0891b2" />
          </div>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && !loading && (
        <div>
          <div className="admin-toolbar">
            <input
              type="text"
              placeholder="חיפוש לפי שם או אימייל..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
              className="admin-search"
            />
            <button className="btn btn--ghost btn--sm" onClick={loadUsers}>חפש</button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>שם</th>
                  <th>אימייל</th>
                  <th>סטטוס</th>
                  <th>תפקיד</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge badge--${u.isActive ? 'green' : 'red'}`}>
                        {u.isActive ? 'פעיל' : 'מושבת'}
                      </span>
                    </td>
                    <td>
                      {u.isAdmin && <span className="badge badge--blue">Admin</span>}
                    </td>
                    <td className="admin-table__actions">
                      {u.isActive ? (
                        <button
                          className="btn btn--danger btn--sm"
                          onClick={() => handleUserAction(u._id, 'deactivate')}
                          disabled={actionLoading === u._id + 'deactivate'}
                        >
                          השבת
                        </button>
                      ) : (
                        <button
                          className="btn btn--success btn--sm"
                          onClick={() => handleUserAction(u._id, 'activate')}
                          disabled={actionLoading === u._id + 'activate'}
                        >
                          הפעל
                        </button>
                      )}
                      {!u.isAdmin && (
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => {
                            if (window.confirm(`הפוך את ${u.name} למנהל?`)) handleUserAction(u._id, 'make-admin');
                          }}
                          disabled={actionLoading === u._id + 'make-admin'}
                        >
                          הפוך Admin
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>אין תוצאות</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contracts */}
      {tab === 'contracts' && !loading && (
        <div>
          <div className="admin-toolbar">
            <select
              value={contractStatus}
              onChange={(e) => setContractStatus(e.target.value)}
              className="admin-select"
            >
              <option value="">כל הסטטוסים</option>
              {Object.entries(STATUS_HE).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <button className="btn btn--ghost btn--sm" onClick={loadContracts}>רענן</button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>כותרת</th>
                  <th>יוצר</th>
                  <th>סטטוס</th>
                  <th>משתתפים</th>
                  <th>עודכן</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c._id}>
                    <td>{c.title}</td>
                    <td>{c.ownerId?.name || '—'}</td>
                    <td>
                      <span className={`badge badge--${STATUS_BADGE[c.status] || 'gray'}`}>
                        {STATUS_HE[c.status] || c.status}
                      </span>
                    </td>
                    <td>{c.participants?.length ?? 0}</td>
                    <td>{new Date(c.updatedAt).toLocaleDateString('he-IL')}</td>
                  </tr>
                ))}
                {contracts.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>אין חוזים</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit logs */}
      {tab === 'audit' && !loading && (
        <div>
          <div className="admin-toolbar">
            <input
              type="text"
              placeholder="סינון לפי פעולה (auth.login, gdpr...)"
              value={auditAction}
              onChange={(e) => setAuditAction(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadAuditLogs()}
              className="admin-search"
            />
            <button className="btn btn--ghost btn--sm" onClick={loadAuditLogs}>חפש</button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>משתמש</th>
                  <th>פעולה</th>
                  <th>IP</th>
                  <th>מטא</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log._id}>
                    <td style={{ fontSize: 12 }}>
                      {new Date(log.createdAt).toLocaleString('he-IL')}
                    </td>
                    <td>{log.userId?.name || log.userId || '—'}</td>
                    <td><code style={{ fontSize: 12 }}>{log.action}</code></td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{log.ip || '—'}</td>
                    <td style={{ fontSize: 11, color: '#94a3b8' }}>
                      {log.meta && Object.keys(log.meta).length > 0
                        ? JSON.stringify(log.meta).slice(0, 60)
                        : '—'}
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>אין רשומות</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
