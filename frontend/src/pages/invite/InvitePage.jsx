import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../lib/api';
import '../auth/Auth.scss';

const ROLE_LABEL = {
  COUNTERPARTY: 'צד שני — תוכל לעיין, להציע שינויים ולאשר',
  OBSERVER:     'צופה בלבד — תוכל לעיין בחוזה ולא לערוך',
};

export default function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    api.get(`/invites/${token}`)
      .then(({ data }) => setInvite(data))
      .catch((err) => setError(err.response?.data?.error || 'שגיאה בטעינת ההזמנה'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    if (!user) {
      navigate(`/login?redirect=/invite/${token}`);
      return;
    }
    setAccepting(true);
    try {
      const { data } = await api.post(`/invites/${token}/accept`);
      navigate(`/contracts/${data._id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'שגיאה בקבלת ההזמנה');
    } finally {
      setAccepting(false);
    }
  }

  if (loading) return <div className="auth-page"><p>טוען...</p></div>;

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <h1 className="auth-card__title">ContractOS</h1>
        {error ? (
          <p className="form-error" style={{ textAlign: 'center' }}>{error}</p>
        ) : invite ? (
          <>
            <p style={{ textAlign: 'center', marginBottom: 8, color: '#64748b', fontSize: 14 }}>הוזמנת לחוזה</p>
            <h2 style={{ textAlign: 'center', marginBottom: 12 }}>{invite.contractId?.title}</h2>
            <p style={{ textAlign: 'center', color: '#64748b', marginBottom: 8, fontSize: 14 }}>
              מאת <strong>{invite.invitedById?.name}</strong>
            </p>

            {invite.role && (
              <div style={{
                background: invite.role === 'OBSERVER' ? '#fef9c3' : '#dbeafe',
                border: `1px solid ${invite.role === 'OBSERVER' ? '#fde68a' : '#bfdbfe'}`,
                borderRadius: 8, padding: '10px 14px', marginBottom: 20, textAlign: 'center', fontSize: 13,
              }}>
                <strong>{invite.role === 'OBSERVER' ? '👁 צופה בלבד' : '🤝 צד שני'}</strong>
                <p style={{ marginTop: 4, color: '#475569' }}>{ROLE_LABEL[invite.role]}</p>
              </div>
            )}

            {!user && (
              <p style={{ color: '#d97706', textAlign: 'center', marginBottom: 16, fontSize: 13 }}>
                יש להתחבר כדי לקבל את ההזמנה
              </p>
            )}
            <button
              className="btn btn--primary btn--lg"
              style={{ width: '100%' }}
              onClick={handleAccept}
              disabled={accepting}
            >
              {accepting ? 'מצטרף...' : '✓ הצטרף לחוזה'}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
