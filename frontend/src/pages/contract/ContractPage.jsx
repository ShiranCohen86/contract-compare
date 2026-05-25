import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import api from '../../lib/api';
import './Contract.scss';

const STATUS_HE = {
  DRAFT: 'טיוטה', AWAITING_REVIEW: 'ממתין לעיון', NEGOTIATING: 'במשא ומתן',
  PENDING_FINAL: 'ממתין לאישור סופי', APPROVED: 'מאושר', EXPORTED: 'יוצא',
  CANCELLED: 'בוטל',
};
const STATUS_BADGE = {
  DRAFT: 'gray', AWAITING_REVIEW: 'blue', NEGOTIATING: 'yellow',
  PENDING_FINAL: 'yellow', APPROVED: 'green', EXPORTED: 'green', CANCELLED: 'red',
};

export default function ContractPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const me = useSelector((s) => s.auth.user);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingClause, setAddingClause] = useState(false);
  const [clauseForm, setClauseForm] = useState({ title: '', content: '' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('COUNTERPARTY');
  const [inviting, setInviting] = useState(false);
  const [respondingChangeId, setRespondingChangeId] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [leaving, setLeaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data: res } = await api.get(`/contracts/${id}`);
      setData(res);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleAddClause(e) {
    e.preventDefault();
    await api.post(`/clauses/contract/${id}`, clauseForm);
    setClauseForm({ title: '', content: '' });
    setAddingClause(false);
    load();
  }

  async function handleApproveChange(changeId) {
    setRespondingChangeId(changeId);
    try {
      await api.post(`/changes/${changeId}/approve`);
      load();
    } finally {
      setRespondingChangeId(null);
    }
  }

  async function handleRejectChange(changeId) {
    const reason = window.prompt('סיבת דחייה (אופציונלי):') ?? '';
    setRespondingChangeId(changeId);
    try {
      await api.post(`/changes/${changeId}/reject`, { reason });
      load();
    } finally {
      setRespondingChangeId(null);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    try {
      await api.post(`/contracts/${id}/invites`, { email: inviteEmail, role: inviteRole });
      setInviteEmail('');
      alert('ההזמנה נשלחה בהצלחה!');
    } finally {
      setInviting(false);
    }
  }

  async function handleFinalApprove() {
    await api.post(`/approvals/${id}/approve`);
    load();
  }

  async function handleExport(format) {
    try {
      const res = await api.post(`/export/${id}/${format}`, {}, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract-${id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('שגיאה בייצוא הקובץ');
    }
  }

  async function handleCancel() {
    const reason = window.prompt('סיבת ביטול (אופציונלי):') ?? '';
    if (!window.confirm('האם אתה בטוח שברצונך לבטל את החוזה? פעולה זו אינה הפיכה.')) return;
    setCancelling(true);
    try {
      await api.post(`/contracts/${id}/cancel`, { reason });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'שגיאה בביטול החוזה');
    } finally {
      setCancelling(false);
    }
  }

  async function handleLeave() {
    if (!window.confirm('האם אתה בטוח שברצונך לעזוב את החוזה?')) return;
    setLeaving(true);
    try {
      await api.post(`/contracts/${id}/leave`);
      navigate('/dashboard');
    } catch (err) {
      alert(err.response?.data?.error || 'שגיאה ביציאה מהחוזה');
      setLeaving(false);
    }
  }

  if (loading) return <p className="contract-loading">{t('loading')}</p>;
  if (!data)   return <p className="contract-loading">לא נמצא</p>;

  const { contract, clauses, pendingChanges } = data;
  const isOwner = String(contract.ownerId._id || contract.ownerId) === me?.id;

  // Derive my role from participants list
  const myParticipant = contract.participants?.find((p) => String(p.userId?._id || p.userId) === me?.id);
  const myRole = isOwner ? 'OWNER' : (myParticipant?.role ?? 'COUNTERPARTY');
  const isObserver = myRole === 'OBSERVER';
  const isCounterparty = myRole === 'COUNTERPARTY';

  const isDraft = contract.status === 'DRAFT';
  const isCancelled = contract.status === 'CANCELLED';
  const isActive = !['APPROVED', 'EXPORTED', 'CANCELLED'].includes(contract.status);

  const canInvite = isDraft && isOwner;
  const canFinalApprove = !isObserver && ['AWAITING_REVIEW', 'PENDING_FINAL'].includes(contract.status);
  const canCancel = isOwner && isActive;
  const canLeave = isCounterparty && isActive;
  const canWrite = !isObserver && isActive;

  // Expiry warning
  const expiresAt = contract.expiresAt ? new Date(contract.expiresAt) : null;
  const isExpired = expiresAt && expiresAt < new Date();
  const expiresWarning = expiresAt && !isExpired && (expiresAt - new Date()) < 3 * 24 * 60 * 60 * 1000;

  return (
    <div className="contract-page">
      <div className="contract-page__topbar">
        <button className="btn btn--ghost btn--sm" onClick={() => navigate('/dashboard')}>← חזרה</button>
        <h2 className="contract-page__title">{contract.title}</h2>
        <span className={`badge badge--${STATUS_BADGE[contract.status] || 'gray'}`}>{STATUS_HE[contract.status]}</span>
        {isObserver && <span className="badge badge--gray">צופה בלבד</span>}
      </div>

      {/* Expiry warning */}
      {expiresAt && (
        <div className={`contract-banner ${isExpired ? 'contract-banner--danger' : 'contract-banner--warning'}`}>
          {isExpired
            ? `⚠ תוקף החוזה פג ב-${expiresAt.toLocaleDateString('he-IL')}`
            : `⏰ החוזה יפוג ב-${expiresAt.toLocaleDateString('he-IL')}`}
        </div>
      )}

      {/* Cancel reason */}
      {isCancelled && contract.cancelReason && (
        <div className="contract-banner contract-banner--danger">
          סיבת ביטול: {contract.cancelReason}
        </div>
      )}

      {/* Observer notice */}
      {isObserver && (
        <div className="contract-banner contract-banner--info">
          אתה צופה בלבד בחוזה זה — אין באפשרותך לבצע שינויים או אישורים.
        </div>
      )}

      {/* Invite */}
      {canInvite && (
        <div className="card contract-section">
          <h3>{t('inviteParty')}</h3>
          <form onSubmit={handleInvite} className="contract-section__invite-form">
            <input
              type="email"
              placeholder={t('inviteEmail')}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="invite-role-select"
            >
              <option value="COUNTERPARTY">צד שני (יכול לערוך)</option>
              <option value="OBSERVER">צופה בלבד</option>
            </select>
            <button type="submit" className="btn btn--primary" disabled={inviting}>
              {inviting ? t('loading') : t('sendInvite')}
            </button>
          </form>
        </div>
      )}

      {/* Pending changes */}
      {pendingChanges.length > 0 && (
        <div className="card contract-section">
          <h3>שינויים ממתינים ({pendingChanges.length})</h3>
          {pendingChanges.map((ch) => {
            const isMine = String(ch.proposedById._id || ch.proposedById) === me?.id;
            const responding = respondingChangeId === ch._id;
            return (
              <div key={ch._id} className={`change-item change-${ch.changeType.toLowerCase()}`}>
                <div className="change-item__header">
                  <span className="change-item__type">
                    {ch.changeType === 'ADD' ? '➕ הוספה' : ch.changeType === 'EDIT' ? '✏️ עריכה' : '🗑️ מחיקה'}
                  </span>
                  <span className="change-item__by">הוצע ע"י {ch.proposedById?.name || '—'}</span>
                </div>
                {ch.previousContent && <p className="diff-before">{ch.previousContent}</p>}
                {ch.newContent && <p className="diff-after">{ch.newContent}</p>}
                {!isMine && !isObserver && (
                  <div className="change-item__actions">
                    <button
                      className="btn btn--success btn--sm"
                      onClick={() => handleApproveChange(ch._id)}
                      disabled={responding}
                    >
                      {responding ? t('loading') : `✓ ${t('approve')}`}
                    </button>
                    <button
                      className="btn btn--danger btn--sm"
                      onClick={() => handleRejectChange(ch._id)}
                      disabled={responding}
                    >
                      {responding ? t('loading') : `✗ ${t('reject')}`}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Clauses */}
      <div className="card contract-section">
        <div className="contract-section__header">
          <h3>סעיפי החוזה</h3>
          {canWrite && (
            <button className="btn btn--ghost btn--sm" onClick={() => setAddingClause(true)}>
              + {t('addClause')}
            </button>
          )}
        </div>

        {addingClause && (
          <form onSubmit={handleAddClause} className="clause-add-form">
            <div className="form-group">
              <label>{t('clauseTitle')}</label>
              <input
                type="text"
                value={clauseForm.title}
                onChange={(e) => setClauseForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>{t('clauseContent')} *</label>
              <textarea
                value={clauseForm.content}
                onChange={(e) => setClauseForm((f) => ({ ...f, content: e.target.value }))}
                required autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn--primary btn--sm">{t('save')}</button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAddingClause(false)}>{t('cancel')}</button>
            </div>
          </form>
        )}

        {clauses.length === 0 ? (
          <p className="contract-section__empty">
            {isObserver ? 'אין סעיפים עדיין.' : 'אין סעיפים עדיין. הוסף את הסעיף הראשון!'}
          </p>
        ) : (
          clauses.map((cl) => (
            <div
              key={cl._id}
              className={`clause-block ${cl.status === 'PENDING_ADD' ? 'change-add' : cl.status === 'PENDING_DELETE' ? 'change-delete' : ''}`}
            >
              <div className="clause-block__header">
                <span className="clause-block__num">{cl.position}.</span>
                {cl.title && <span className="clause-block__title">{cl.title}</span>}
                {cl.status !== 'ACTIVE' && (
                  <span className="badge badge--yellow">{t('pendingApproval')}</span>
                )}
              </div>
              <p className="clause-block__content">{cl.content}</p>
            </div>
          ))
        )}
      </div>

      {/* Participants list */}
      {contract.participants?.length > 0 && (
        <div className="card contract-section">
          <h3>משתתפים</h3>
          <div className="participants-list">
            {contract.participants.map((p) => {
              const u = p.userId;
              const roleName = p.role === 'OWNER' ? 'יוצר' : p.role === 'OBSERVER' ? 'צופה' : 'צד שני';
              return (
                <div key={String(u?._id || u)} className="participant-item">
                  <span className="participant-item__name">{u?.name || '—'}</span>
                  <span className="badge badge--gray">{roleName}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Final approval */}
      {canFinalApprove && pendingChanges.length === 0 && (
        <div className="card contract-section contract-section--final">
          <h3>אישור סופי</h3>
          <p>כל השינויים אושרו. ניתן לאשר את החוזה הסופי.</p>
          <button className="btn btn--success" onClick={handleFinalApprove}>
            ✓ {t('approveContract')}
          </button>
        </div>
      )}

      {/* Export */}
      {['APPROVED', 'EXPORTED'].includes(contract.status) && (
        <div className="card contract-section">
          <h3>ייצוא</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn--primary" onClick={() => handleExport('pdf')}>⬇ {t('exportPdf')}</button>
            <button className="btn btn--ghost"   onClick={() => handleExport('docx')}>⬇ {t('exportDocx')}</button>
          </div>
        </div>
      )}

      {/* Danger zone */}
      {(canCancel || canLeave) && (
        <div className="card contract-section contract-section--danger">
          <h3>אזור סכנה</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {canLeave && (
              <button className="btn btn--ghost btn--sm" onClick={handleLeave} disabled={leaving}>
                {leaving ? t('loading') : '🚪 עזוב חוזה'}
              </button>
            )}
            {canCancel && (
              <button className="btn btn--danger btn--sm" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? t('loading') : '🗑 בטל חוזה'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
