import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login, clearError } from '../../store/slices/authSlice';
import './Auth.scss';

const FEATURES = [
  { icon: '📋', title: 'ניהול חוזים חכם', desc: 'ארגן וערוך חוזים בסביבה מאובטחת ונוחה' },
  { icon: '🤝', title: 'שיתוף פעולה בזמן אמת', desc: 'עבוד עם הצד השני על אותו מסמך בו-זמנית' },
  { icon: '✅', title: 'מעקב שינויים ואישורים', desc: 'כל שינוי מתועד ומאושר — שקיפות מלאה' },
];

export default function LoginPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { status, error } = useSelector((s) => s.auth);

  const [form, setForm] = useState({ email: '', password: '' });

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (error) dispatch(clearError());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const result = await dispatch(login(form));
    if (login.fulfilled.match(result)) {
      const redirect = searchParams.get('redirect');
      navigate(redirect || '/dashboard');
    }
  }

  return (
    <div className="auth-page">
      {/* Brand panel */}
      <div className="auth-brand">
        <div className="auth-brand__logo">
          Contract<span>OS</span>
        </div>
        <p className="auth-brand__tagline">ניהול חוזים מקצועי — פשוט, בטוח, חכם</p>
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
            <span className="auth-card__logo-icon">📋</span>
            <h1 className="auth-card__title">
              ברוך הבא ל<span className="auth-card__brand">ContractOS</span>
            </h1>
            <p className="auth-card__subtitle">התחבר לחשבונך כדי להמשיך</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('email')}</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                autoFocus
                placeholder="your@email.com"
              />
            </div>
            <div className="form-group">
              <label>{t('password')}</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
              />
            </div>

            {error && <p className="form-error">⚠ {error}</p>}

            <button
              type="submit"
              className="btn btn--primary btn--lg auth-card__submit"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? '⏳ מתחבר...' : '🔐 התחברות'}
            </button>
          </form>

          <p className="auth-card__switch">
            אין לך חשבון?{' '}
            <Link to="/signup">הירשם בחינם</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
