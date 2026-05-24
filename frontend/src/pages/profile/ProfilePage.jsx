import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../store/slices/authSlice';
import api from '../../lib/api';
import './Profile.scss';

export default function ProfilePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const [deletePass, setDeletePass] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const [exporting, setExporting] = useState(false);

  async function handleChangePassword(e) {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwError('הסיסמאות אינן תואמות');
      return;
    }
    setPwLoading(true);
    setPwError(null);
    setPwSuccess(false);
    try {
      await api.post('/auth/password/change', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwSuccess(true);
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setPwError(err.response?.data?.error || 'שגיאה בשינוי הסיסמה');
    } finally {
      setPwLoading(false);
    }
  }

  async function handleExportData() {
    setExporting(true);
    try {
      const res = await api.get('/auth/me/data', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-data.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('שגיאה בייצוא הנתונים');
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount(e) {
    e.preventDefault();
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את חשבונך לצמיתות? לא ניתן לשחזר פעולה זו.')) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await api.delete('/auth/me', { data: { password: deletePass } });
      await dispatch(logout());
      navigate('/login');
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'שגיאה במחיקת החשבון');
      setDeleteLoading(false);
    }
  }

  return (
    <div className="profile-page">
      <h2 className="profile-page__title">הפרופיל שלי</h2>

      {/* User info */}
      <div className="card profile-section">
        <h3>פרטים אישיים</h3>
        <div className="profile-info">
          <div className="profile-info__row">
            <span className="profile-info__label">שם</span>
            <span className="profile-info__value">{user?.name}</span>
          </div>
          <div className="profile-info__row">
            <span className="profile-info__label">אימייל</span>
            <span className="profile-info__value">{user?.email}</span>
          </div>
          {user?.isAdmin && (
            <div className="profile-info__row">
              <span className="profile-info__label">תפקיד</span>
              <span className="badge badge--blue">מנהל מערכת</span>
            </div>
          )}
        </div>
      </div>

      {/* Change password */}
      <div className="card profile-section">
        <h3>שינוי סיסמה</h3>
        <form onSubmit={handleChangePassword} className="profile-form">
          <div className="form-group">
            <label>סיסמה נוכחית</label>
            <input
              type="password"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label>סיסמה חדשה (לפחות 8 תווים)</label>
            <input
              type="password"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
              required minLength={8}
            />
          </div>
          <div className="form-group">
            <label>אימות סיסמה חדשה</label>
            <input
              type="password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
              required
            />
          </div>
          {pwError   && <p className="form-error">{pwError}</p>}
          {pwSuccess && <p className="form-success">הסיסמה שונתה בהצלחה!</p>}
          <button type="submit" className="btn btn--primary" disabled={pwLoading}>
            {pwLoading ? 'שומר...' : 'שנה סיסמה'}
          </button>
        </form>
      </div>

      {/* GDPR — export data */}
      <div className="card profile-section">
        <h3>הנתונים שלי (GDPR)</h3>
        <p className="profile-section__desc">
          הורד עותק של כל הנתונים שלך — פרופיל, חוזים, שינויים, אישורים והתראות.
        </p>
        <button className="btn btn--ghost" onClick={handleExportData} disabled={exporting}>
          {exporting ? 'מכין...' : '⬇ ייצוא הנתונים שלי'}
        </button>
      </div>

      {/* GDPR — delete account */}
      <div className="card profile-section profile-section--danger">
        <h3>מחיקת חשבון</h3>
        <p className="profile-section__desc">
          מחיקת החשבון היא פעולה בלתי הפיכה. הנתונים שלך יאנונימיזרו ולא ניתן יהיה לשחזרם.
        </p>
        <form onSubmit={handleDeleteAccount} className="profile-form">
          <div className="form-group">
            <label>אשר עם הסיסמה שלך</label>
            <input
              type="password"
              value={deletePass}
              onChange={(e) => setDeletePass(e.target.value)}
              required
              placeholder="הסיסמה הנוכחית"
            />
          </div>
          {deleteError && <p className="form-error">{deleteError}</p>}
          <button type="submit" className="btn btn--danger" disabled={deleteLoading}>
            {deleteLoading ? 'מוחק...' : '🗑 מחק חשבון לצמיתות'}
          </button>
        </form>
      </div>
    </div>
  );
}
