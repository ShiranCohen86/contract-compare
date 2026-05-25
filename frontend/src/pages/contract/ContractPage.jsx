import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import api from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { toast } from '../../lib/toaster';
import './Contract.scss';

const STATUS_HE = {
  DRAFT: 'טיוטה', AWAITING_REVIEW: 'ממתין לעיון', NEGOTIATING: 'במשא ומתן',
  PENDING_FINAL: 'ממתין לאישור סופי', APPROVED: 'מאושר', EXPORTED: 'יוצא', CANCELLED: 'בוטל',
};
const STATUS_BADGE = {
  DRAFT: 'gray', AWAITING_REVIEW: 'blue', NEGOTIATING: 'yellow',
  PENDING_FINAL: 'yellow', APPROVED: 'green', EXPORTED: 'green', CANCELLED: 'red',
};

// Inline confirmation widget instead of window.confirm
function ConfirmInline({ message, onConfirm, onCancel }) {
  return (
    <div className="confirm-inline">
      <p className="confirm-inline__msg">{message}</p>
      <div className="confirm-inline__actions">
        <button className="btn btn--danger btn--sm" onClick={onConfirm}>אישור</button>
        <button className="btn btn--ghost btn--sm" onClick={onCancel}>ביטול</button>
      </div>
    </div>
  );
}

export default function ContractPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const me = useSelector((s) => s.auth.user);

  const [data, setData]                 = useState(null);
  const [loading, setLoading]           = useState(true);
  const [addingClause, setAddingClause] = useState(false);
  const [clauseForm, setClauseForm]     = useState({ title: '', content: '' });
  const [editingId, setEditingId]       = useState(null);   // clauseId being edited
  const [editForm, setEditForm]         = useState({ title: '', content: '' });
  const [deletingId, setDeletingId]     = useState(null);   // confirm-inline for delete
  const [inviteEmail, setInviteEmail]   = useState('');
  const [inviteRole, setInviteRole]     = useState('COUNTERPARTY');
  const [inviting, setInviting]         = useState(false);
  const [inviteUrl, setInviteUrl]       = useState(null);
  const [respondingId, setRespondingId] = useState(null);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [cancelling, setCancelling]     = useState(false);
  const [leaving, setLeaving]           = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [leaveConfirm, setLeaveConfirm]   = useState(false);
  const [rejectPrompt, setRejectPrompt]   = useState({ open: false, changeId: null, reason: '' });

  const load = useCallback(async () => {
    try {
      const { data: res } = await api.get(`/contracts/${id}`);
      setData(res);
    } catch {
      toast('שגיאה בטעינת החוזה', { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Join socket room and listen for live contract updates
  useEffect(() => {
    const socket = getSocket();
    socket.emit('contract:join', { contractId: id });

    function onUpdated() { load(); }
    socket.on('contract:updated', onUpdated);

    return () => {
      socket.emit('contract:leave', { contractId: id });
      socket.off('contract:updated', onUpdated);
    };
  }, [id, load]);

  // ── Clause actions ──────────────────────────────────────────────────────────

  async function handleAddClause(e) {
    e.preventDefault();
    try {
      await api.post(`/clauses/contract/${id}`, clauseForm);
      setClauseForm({ title: '', content: '' });
      setAddingClause(false);
      toast('הסעיף נוסף בהצלחה');
      load();
    } catch (err) {
      toast(err.response?.data?.error || 'שגיאה בהוספת סעיף', { type: 'error' });
    }
  }

  function startEdit(clause) {
    setEditingId(clause._id);
    setEditForm({ title: clause.title || '', content: clause.content });
  }

  async function handleEditClause(e) {
    e.preventDefault();
    try {
      await api.patch(`/clauses/${editingId}`, editForm);
      setEditingId(null);
      toast('עריכה הוצעה בהצלחה');
      load();
    } catch (err) {
      toast(err.response?.data?.error || 'שגיאה בעריכת סעיף', { type: 'error' });
    }
  }

  async function handleDeleteClause(clauseId) {
    setDeletingId(null);
    try {
      await api.delete(`/clauses/${clauseId}`);
      toast('בקשת מחיקה הוגשה');
      load();
    } catch (err) {
      toast(err.response?.data?.error || 'שגיאה במחיקת סעיף', { type: 'error' });
    }
  }

  // ── Change actions ──────────────────────────────────────────────────────────

  async function handleApproveChange(changeId) {
    setRespondingId(changeId);
    try {
      await api.post(`/changes/${changeId}/approve`);
      toast('השינוי אושר ✓');
      load();
    } catch (err) {
      toast(err.response?.data?.error || 'שגיאה באישור', { type: 'error' });
    } finally {
      setRespondingId(null);
    }
  }

  async function handleRejectChange() {
    const { changeId, reason } = rejectPrompt;
    setRejectPrompt({ open: false, changeId: null, reason: '' });
    setRespondingId(changeId);
    try {
      await api.post(`/changes/${changeId}/reject`, { reason });
      toast('השינוי נדחה');
      load();
    } catch (err) {
      toast(err.response?.data?.error || 'שגיאה בדחייה', { type: 'error' });
    } finally {
      setRespondingId(null);
    }
  }

  async function handleWithdrawChange(changeId) {
    setWithdrawingId(changeId);
    try {
      await api.post(`/changes/${changeId}/withdraw`);
      toast('ההצעה בוטלה');
      load();
    } catch (err) {
      toast(err.response?.data?.error || 'שגיאה בביטול', { type: 'error' });
    } finally {
      setWithdrawingId(null);
    }
  }

  // ── Invite ──────────────────────────────────────────────────────────────────

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    try {
      const { data: inv } = await api.post(`/contracts/${id}/invites`, { email: inviteEmail, role: inviteRole });
      setInviteEmail('');
      setInviteUrl(inv.inviteUrl || null);
      toast(`ההזמנה נשלחה ל-${inviteEmail} ✓`);
    } catch (err) {
      toast(err.response?.data?.error || 'שגיאה בשליחת ההזמנה', { type: 'error' });
    } finally {
      setInviting(false);
    }
  }

  // ── Final approval ───────────────────────────────────────────────────────────

  async function handleFinalApprove() {
    try {
      await api.post(`/approvals/${id}/approve`);
      toast('אישור סופי ניתן ✓');
      load();
    } catch (err) {
      toast(err.response?.data?.error || 'שגיאה באישור', { type: 'error' });
    }
  }

  // ── Export ───────────────────────────────────────────────────────────────────

  async function handleExport(format) {
    try {
      const res = await api.post(`/export/${id}/${format}`, {}, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract-${id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast(`קובץ ${format.toUpperCase()} הורד בהצלחה`);
    } catch {
      toast('שגיאה בייצוא הקובץ', { type: 'error' });
    }
  }

  // ── Cancel / Leave ───────────────────────────────────────────────────────────

  async function handleCancel() {
    setCancelConfirm(false);
    setCancelling(true);
    try {
      await api.post(`/contracts/${id}/cancel`);
      toast('החוזה בוטל');
      load();
    } catch (err) {
      toast(err.response?.data?.error || 'שגיאה בביטול החוזה', { type: 'error' });
    } finally {
      setCancelling(false);
    }
  }

  async function handleLeave() {
    setLeaveConfirm(false);
    setLeaving(true);
    try {
      await api.post(`/contracts/${id}/leave`);
      navigate('/dashboard');
    } catch (err) {
      toast(err.response?.data?.error || 'שגיאה ביציאה מהחוזה', { type: 'error' });
      setLeaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) return <p className="contract-loading">{t('loading')}</p>;
  if (!data)   return <p className="contract-loading">לא נמצא</p>;

  const { contract, clauses, pendingChanges } = data;
  const isOwner       = String(contract.ownerId._id || contract.ownerId) === me?.id;
  const myParticipant = contract.participants?.find((p) => String(p.userId?._id || p.userId) === me?.id);
  const myRole        = isOwner ? 'OWNER' : (myParticipant?.role ?? 'COUNTERPARTY');
  const isObserver    = myRole === 'OBSERVER';
  const isCounterparty = myRole === 'COUNTERPARTY';

  const isDraft     = contract.status === 'DRAFT';
  const isCancelled = contract.status === 'CANCELLED';
  const isActive    = !['APPROVED', 'EXPORTED', 'CANCELLED'].includes(contract.status);

  const canInvite       = isDraft && isOwner;
  const canFinalApprove = !isObserver && ['AWAITING_REVIEW', 'PENDING_FINAL'].includes(contract.status);
  const canCancel       = isOwner && isActive;
  const canLeave        = isCounterparty && isActive;
  const canWrite        = !isObserver && isActive;

  const expiresAt      = contract.expiresAt ? new Date(contract.expiresAt) : null;
  const isExpired      = expiresAt && expiresAt < new Date();
  const expiresWarning = expiresAt && !isExpired && (expiresAt - new Date()) < 3 * 24 * 60 * 60 * 1000;

  return (
    <div className="contract-page">
      {/* Topbar */}
      <div className="contract-page__topbar">
        <button className="btn btn--ghost btn--sm" onClick={() => navigate('/dashboard')}>← חזרה</button>
        <h2 className="contract-page__title">{contract.title}</h2>
        <span className={`badge badge--${STATUS_BADGE[contract.status] || 'gray'}`}>{STATUS_HE[contract.status]}</span>
        {isObserver && <span className="badge badge--gray">צופה בלבד</span>}
      </div>

      {/* Banners */}
      {expiresAt && (
        <div className={`contract-banner ${isExpired ? 'contract-banner--danger' : 'contract-banner--warning'}`}>
          {isExpired
            ? `⚠ תוקף החוזה פג ב-${expiresAt.toLocaleDateString('he-IL')}`
            : `⏰ החוזה יפוג ב-${expiresAt.toLocaleDateString('he-IL')}`}
        </div>
      )}
      {isCancelled && contract.cancelReason && (
        <div className="contract-banner contract-banner--danger">סיבת ביטול: {contract.cancelReason}</div>
      )}
      {isObserver && (
        <div className="contract-banner contract-banner--info">
          אתה צופה בלבד — אין באפשרותך לבצע שינויים או אישורים.
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
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="invite-role-select">
              <option value="COUNTERPARTY">צד שני (יכול לערוך)</option>
              <option value="OBSERVER">צופה בלבד</option>
            </select>
            <button type="submit" className="btn btn--primary" disabled={inviting}>
              {inviting ? t('loading') : t('sendInvite')}
            </button>
          </form>
          {inviteUrl && (
            <div className="invite-link-box">
              <span className="invite-link-box__label">קישור הזמנה (אם המייל לא הגיע):</span>
              <div className="invite-link-box__row">
                <input readOnly value={inviteUrl} className="invite-link-box__input" onFocus={(e) => e.target.select()} />
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => { navigator.clipboard.writeText(inviteUrl); toast('הקישור הועתק ✓'); }}
                >
                  העתק
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pending changes */}
      {pendingChanges.length > 0 && (
        <div className="card contract-section">
          <h3>שינויים ממתינים ({pendingChanges.length})</h3>
          {pendingChanges.map((ch) => {
            const isMine     = String(ch.proposedById._id || ch.proposedById) === me?.id;
            const responding = respondingId === ch._id;
            const withdrawing = withdrawingId === ch._id;
            return (
              <div key={ch._id} className={`change-item change-${ch.changeType.toLowerCase()}`}>
                <div className="change-item__header">
                  <span className="change-item__type">
                    {ch.changeType === 'ADD' ? '➕ הוספה' : ch.changeType === 'EDIT' ? '✏️ עריכה' : '🗑️ מחיקה'}
                  </span>
                  <span className="change-item__by">הוצע ע"י {ch.proposedById?.name || '—'}</span>
                </div>
                {ch.previousContent && <p className="diff-before">{ch.previousContent}</p>}
                {ch.newContent      && <p className="diff-after">{ch.newContent}</p>}

                <div className="change-item__actions">
                  {!isMine && !isObserver && (
                    <>
                      <button
                        className="btn btn--success btn--sm"
                        onClick={() => handleApproveChange(ch._id)}
                        disabled={responding}
                      >
                        {responding ? '...' : `✓ ${t('approve')}`}
                      </button>
                      <button
                        className="btn btn--danger btn--sm"
                        onClick={() => setRejectPrompt({ open: true, changeId: ch._id, reason: '' })}
                        disabled={responding}
                      >
                        {responding ? '...' : `✗ ${t('reject')}`}
                      </button>
                    </>
                  )}
                  {isMine && (
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => handleWithdrawChange(ch._id)}
                      disabled={withdrawing}
                    >
                      {withdrawing ? '...' : '↩ בטל הצעה'}
                    </button>
                  )}
                </div>

                {/* Reject reason prompt */}
                {rejectPrompt.open && rejectPrompt.changeId === ch._id && (
                  <div className="reject-prompt">
                    <input
                      type="text"
                      placeholder="סיבת דחייה (אופציונלי)"
                      value={rejectPrompt.reason}
                      onChange={(e) => setRejectPrompt((p) => ({ ...p, reason: e.target.value }))}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button className="btn btn--danger btn--sm" onClick={handleRejectChange}>דחה</button>
                      <button className="btn btn--ghost btn--sm" onClick={() => setRejectPrompt({ open: false, changeId: null, reason: '' })}>ביטול</button>
                    </div>
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
          {canWrite && !addingClause && (
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
                placeholder="כותרת סעיף (אופציונלי)"
              />
            </div>
            <div className="form-group">
              <label>{t('clauseContent')} *</label>
              <textarea
                value={clauseForm.content}
                onChange={(e) => setClauseForm((f) => ({ ...f, content: e.target.value }))}
                required
                autoFocus
                placeholder="תוכן הסעיף..."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn--primary btn--sm">{t('save')}</button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setAddingClause(false); setClauseForm({ title: '', content: '' }); }}>
                {t('cancel')}
              </button>
            </div>
          </form>
        )}

        {clauses.length === 0 ? (
          <div className="contract-section__empty-state">
            <span className="contract-section__empty-icon">📄</span>
            <p>{isObserver ? 'אין סעיפים עדיין.' : 'אין סעיפים עדיין. הוסף את הסעיף הראשון!'}</p>
          </div>
        ) : (
          clauses.map((cl) => (
            <div
              key={cl._id}
              className={`clause-block ${
                cl.status === 'PENDING_ADD'    ? 'change-add'    :
                cl.status === 'PENDING_DELETE' ? 'change-delete' : ''
              }`}
            >
              {/* Edit mode */}
              {editingId === cl._id ? (
                <form onSubmit={handleEditClause} className="clause-edit-form">
                  <div className="form-group">
                    <label>כותרת</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>תוכן *</label>
                    <textarea
                      value={editForm.content}
                      onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))}
                      required
                      autoFocus
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="submit" className="btn btn--primary btn--sm">שלח לאישור</button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditingId(null)}>ביטול</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="clause-block__header">
                    <span className="clause-block__num">{cl.position}.</span>
                    {cl.title && <span className="clause-block__title">{cl.title}</span>}
                    <div className="clause-block__badges">
                      {cl.status === 'PENDING_ADD' && (
                        <span className="badge badge--yellow">ממתין לאישור הוספה</span>
                      )}
                      {cl.status === 'PENDING_DELETE' && (
                        <span className="badge badge--red">ממתין לאישור מחיקה</span>
                      )}
                    </div>
                    {canWrite && cl.status === 'ACTIVE' && (
                      <div className="clause-block__actions">
                        <button
                          className="clause-block__action-btn"
                          onClick={() => startEdit(cl)}
                          title="ערוך סעיף"
                        >✏️</button>
                        <button
                          className="clause-block__action-btn clause-block__action-btn--danger"
                          onClick={() => setDeletingId(cl._id)}
                          title="מחק סעיף"
                        >🗑️</button>
                      </div>
                    )}
                  </div>
                  <p className="clause-block__content">{cl.content}</p>

                  {/* Delete confirmation inline */}
                  {deletingId === cl._id && (
                    <ConfirmInline
                      message="האם להציע מחיקת סעיף זה? הצד השני יצטרך לאשר."
                      onConfirm={() => handleDeleteClause(cl._id)}
                      onCancel={() => setDeletingId(null)}
                    />
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Participants */}
      {contract.participants?.length > 0 && (
        <div className="card contract-section">
          <h3>משתתפים</h3>
          <div className="participants-list">
            {contract.participants.map((p) => {
              const u        = p.userId;
              const roleName = p.role === 'OWNER' ? 'יוצר' : p.role === 'OBSERVER' ? 'צופה' : 'צד שני';
              return (
                <div key={String(u?._id || u)} className="participant-item">
                  <div className="participant-item__avatar">{(u?.name || '?')[0]}</div>
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
          <h3>✅ אישור סופי</h3>
          <p>כל השינויים אושרו. ניתן לאשר את החוזה הסופי.</p>
          <button className="btn btn--success" onClick={handleFinalApprove}>
            ✓ {t('approveContract')}
          </button>
        </div>
      )}

      {/* Export */}
      {['APPROVED', 'EXPORTED'].includes(contract.status) && (
        <div className="card contract-section">
          <h3>⬇ ייצוא</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn--primary" onClick={() => handleExport('pdf')}>⬇ {t('exportPdf')}</button>
            <button className="btn btn--ghost"   onClick={() => handleExport('docx')}>⬇ {t('exportDocx')}</button>
          </div>
        </div>
      )}

      {/* Danger zone */}
      {(canCancel || canLeave) && (
        <div className="card contract-section contract-section--danger">
          <h3>⚠ אזור סכנה</h3>
          {canLeave && (
            leaveConfirm
              ? <ConfirmInline
                  message="האם אתה בטוח שברצונך לעזוב את החוזה?"
                  onConfirm={handleLeave}
                  onCancel={() => setLeaveConfirm(false)}
                />
              : <button className="btn btn--ghost btn--sm" onClick={() => setLeaveConfirm(true)} disabled={leaving}>
                  {leaving ? t('loading') : '🚪 עזוב חוזה'}
                </button>
          )}
          {canCancel && (
            cancelConfirm
              ? <ConfirmInline
                  message="ביטול החוזה אינו הפיך. האם להמשיך?"
                  onConfirm={handleCancel}
                  onCancel={() => setCancelConfirm(false)}
                />
              : <button className="btn btn--danger btn--sm" onClick={() => setCancelConfirm(true)} disabled={cancelling} style={{ marginTop: canLeave ? 8 : 0 }}>
                  {cancelling ? t('loading') : '🗑 בטל חוזה'}
                </button>
          )}
        </div>
      )}
    </div>
  );
}
