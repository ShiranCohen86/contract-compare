import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';
import { SkeletonContractList } from '../../components/ui/Skeleton';
import './Dashboard.scss';

const STATUS_LABEL = {
  DRAFT:          'טיוטה',
  AWAITING_REVIEW: 'ממתין לעיון',
  NEGOTIATING:    'במשא ומתן',
  PENDING_FINAL:  'ממתין לאישור סופי',
  APPROVED:       'מאושר',
  EXPORTED:       'יוצא',
  CANCELLED:      'בוטל',
};

const STATUS_BADGE = {
  DRAFT:          'gray',
  AWAITING_REVIEW: 'blue',
  NEGOTIATING:    'yellow',
  PENDING_FINAL:  'purple',
  APPROVED:       'green',
  EXPORTED:       'green',
  CANCELLED:      'red',
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showNew, setShowNew]     = useState(false);
  const [newForm, setNewForm]     = useState({ title: '', description: '' });
  const [creating, setCreating]   = useState(false);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      const matchStatus = filterStatus === 'ALL' || c.status === filterStatus;
      const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [contracts, search, filterStatus]);

  useEffect(() => {
    api.get('/contracts')
      .then(({ data }) => setContracts(data.items))
      .catch(() => setLoadError('שגיאה בטעינת החוזים. נסה לרענן את הדף.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await api.post('/contracts', newForm);
      navigate(`/contracts/${data._id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h2 className="dashboard__title">📄 {t('myContracts')}</h2>
        <button className="btn btn--primary" onClick={() => setShowNew((v) => !v)}>
          {showNew ? '✕ סגור' : `✚ ${t('newContract')}`}
        </button>
      </div>

      {showNew && (
        <div className="dashboard__new-form card">
          <h3>✨ חוזה חדש</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>{t('contractTitle')}</label>
              <input
                type="text"
                value={newForm.title}
                onChange={(e) => setNewForm((f) => ({ ...f, title: e.target.value }))}
                required
                autoFocus
                placeholder="לדוגמה: הסכם שכירות, NDA, הסכם שיתוף פעולה..."
              />
            </div>
            <div className="form-group">
              <label>{t('contractDesc')}</label>
              <textarea
                value={newForm.description}
                onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="תיאור קצר של החוזה (אופציונלי)"
              />
            </div>
            <div className="dashboard__new-form-actions">
              <button type="submit" className="btn btn--primary" disabled={creating}>
                {creating ? '⏳ יוצר...' : `📋 ${t('createContract')}`}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setShowNew(false)}>
                {t('cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search + Filter bar */}
      {!loading && !loadError && contracts.length > 0 && (
        <div className="dashboard__filters">
          <input
            className="dashboard__search"
            type="text"
            placeholder="חיפוש לפי שם חוזה..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="dashboard__filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">כל הסטטוסים</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <SkeletonContractList count={3} />
      ) : loadError ? (
        <p className="form-error" style={{ padding: '16px 0' }}>⚠ {loadError}</p>
      ) : contracts.length === 0 ? (
        <div className="dashboard__empty">
          <div className="dashboard__empty-icon">📄</div>
          <p>אין חוזים עדיין — צור את הראשון!</p>
          <button className="btn btn--primary btn--lg" onClick={() => setShowNew(true)}>
            ✚ {t('newContract')}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="dashboard__empty">
          <div className="dashboard__empty-icon">🔍</div>
          <p>לא נמצאו חוזים התואמים לחיפוש</p>
          <button className="btn btn--ghost btn--sm" onClick={() => { setSearch(''); setFilterStatus('ALL'); }}>
            נקה סינון
          </button>
        </div>
      ) : (
        <div className="dashboard__list">
          {filtered.map((c) => (
            <Link
              to={`/contracts/${c._id}`}
              key={c._id}
              className={`contract-card contract-card--${c.status}`}
            >
              <div className="contract-card__inner">
                <span className="contract-card__icon">📋</span>
                <div className="contract-card__body">
                  <div className="contract-card__header">
                    <h3 className="contract-card__title">{c.title}</h3>
                    <span className={`badge badge--${STATUS_BADGE[c.status] || 'gray'}`}>
                      {STATUS_LABEL[c.status] || c.status}
                    </span>
                  </div>
                  {c.description && (
                    <p className="contract-card__desc">{c.description}</p>
                  )}
                  <div className="contract-card__meta">
                    <span className="contract-card__meta-item">
                      🕐 עודכן {new Date(c.updatedAt).toLocaleDateString('he-IL')}
                    </span>
                    {c.participants?.length > 0 && (
                      <span className="contract-card__meta-item">
                        👥 {c.participants.length} משתתפים
                      </span>
                    )}
                  </div>
                </div>
                <span className="contract-card__arrow">←</span>
              </div>
              <div className="contract-card__status-bar" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
