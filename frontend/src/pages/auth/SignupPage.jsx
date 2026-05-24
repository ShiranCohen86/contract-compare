import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signup, clearError } from '../../store/slices/authSlice';
import './Auth.scss';

const FEATURES = [
  { icon: '🔒', title: 'אבטחה מלאה', desc: 'הנתונים שלך מוצפנים ומוגנים בכל עת' },
  { icon: '📤', title: 'ייצוא PDF / DOCX', desc: 'הורד את החוזה הסופי בלחיצת כפתור' },
  { icon: '🌐', title: 'גישה מכל מקום', desc: 'עבוד מהנייד, טאבלט או מחשב' },
];

export default function SignupPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error } = useSelector((s) => s.auth);

  const [form, setForm] = useState({ name: '', email: '', password: '' });

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (error) dispatch(clearError());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const result = await dispatch(signup(form));
    if (signup.fulfilled.match(result)) navigate('/dashboard');
  }

  return (
    <div className="auth-page">
      {/* Brand panel */}
      <div className="auth-brand">
        <div className="auth-brand__logo">
          Contract<span>OS</span>
        </div>
        <p className="auth-brand__tagline">פלטפורמת ניהול החוזים המקצועית</p>
        <div className="auth-brand__features">
          {FEATURES.map((f) => (
            <div key={f.title} className="auth-brand__feature">
              <span className="auth-brand__feature-icon">{f.icon}</span>
              <div>
                <div className="auth-brand__feature-title">{f.title}</div>
                <div className="auth-brand__feature-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card__header">
            <span className="auth-card__logo-icon">🚀</span>
            <h1 className="auth-card__title">
              הצטרף ל<span className="auth-card__brand">ContractOS</span>
            </h1>
            <p className="auth-card__subtitle">צור חשבון חינמי בשניות</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('name')}</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                autoFocus
                placeholder="שם מלא"
              />
            </div>
            <div className="form-group">
              <label>{t('email')}</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="your@email.com"
              />
            </div>
            <div className="form-group">
              <label>{t('password')} (לפחות 8 תווים)</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
                placeholder="••••••••"
              />
            </div>

            {error && <p className="form-error">⚠ {error}</p>}

            <button
              type="submit"
              className="btn btn--primary btn--lg auth-card__submit"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? '⏳ רושם...' : '✨ צור חשבון בחינם'}
            </button>
          </form>

          <p className="auth-card__switch">
            יש לך חשבון?{' '}
            <Link to="/login">התחבר</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
