import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { toast } from '../../lib/toaster';
import './Export.scss';

const FONTS = ['Arial', 'David', 'Times New Roman', 'Heebo', 'Open Sans'];
const FONT_SIZES = [10, 11, 12, 13, 14];

export default function ExportPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contract, setClauses] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [design, setDesign]     = useState({ title: '', font: 'Arial', fontSize: 12 });
  const [exporting, setExporting] = useState(null); // 'pdf' | 'docx' | null

  useEffect(() => {
    api.get(`/contracts/${id}`)
      .then(({ data }) => {
        setClauses(data.contract);
        setDesign((d) => ({ ...d, title: data.contract.title }));
      })
      .catch(() => toast('שגיאה בטעינת החוזה', { type: 'error' }))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleExport(format) {
    setExporting(format);
    try {
      const res = await api.post(`/export/${id}/${format}`, design, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${design.title || 'contract'}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast(`קובץ ${format.toUpperCase()} הורד בהצלחה ✓`);
    } catch (err) {
      const msg = err.response?.data?.error || `שגיאה בייצוא ${format.toUpperCase()}`;
      toast(msg, { type: 'error' });
    } finally {
      setExporting(null);
    }
  }

  if (loading) return <p className="contract-loading">טוען...</p>;

  return (
    <div className="export-page">
      <div className="export-page__topbar">
        <button className="btn btn--ghost btn--sm" onClick={() => navigate(`/contracts/${id}`)}>
          ← חזרה לחוזה
        </button>
        <h2 className="export-page__title">ייצוא חוזה</h2>
      </div>

      <div className="export-layout">
        {/* Settings panel */}
        <div className="card export-settings">
          <h3 className="export-settings__heading">הגדרות עיצוב</h3>

          <div className="form-group">
            <label>כותרת סופית לחוזה</label>
            <input
              type="text"
              value={design.title}
              onChange={(e) => setDesign((d) => ({ ...d, title: e.target.value }))}
              placeholder={contract?.title}
            />
          </div>

          <div className="form-group">
            <label>גופן</label>
            <select
              value={design.font}
              onChange={(e) => setDesign((d) => ({ ...d, font: e.target.value }))}
              className="export-settings__select"
            >
              {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>גודל גופן (pt)</label>
            <select
              value={design.fontSize}
              onChange={(e) => setDesign((d) => ({ ...d, fontSize: Number(e.target.value) }))}
              className="export-settings__select"
            >
              {FONT_SIZES.map((s) => <option key={s} value={s}>{s}pt</option>)}
            </select>
          </div>

          <div className="export-settings__actions">
            <button
              className="btn btn--primary"
              onClick={() => handleExport('pdf')}
              disabled={!!exporting}
            >
              {exporting === 'pdf' ? 'מייצא...' : '⬇ הורד PDF'}
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => handleExport('docx')}
              disabled={!!exporting}
            >
              {exporting === 'docx' ? 'מייצא...' : '⬇ הורד DOCX'}
            </button>
          </div>
        </div>

        {/* Preview panel */}
        <div className="card export-preview">
          <h3 className="export-preview__heading">תצוגה מקדימה</h3>
          <div
            className="export-preview__doc"
            style={{ fontFamily: design.font, fontSize: `${design.fontSize}pt` }}
          >
            <h1 className="export-preview__doc-title">{design.title || contract?.title}</h1>
            {contract?.snapshot?.clauses?.map((c, i) => (
              <div key={i} className="export-preview__clause">
                <strong>{c.position}. {c.title}</strong>
                <div dangerouslySetInnerHTML={{ __html: c.content }} />
              </div>
            )) ?? (
              <p className="export-preview__empty">תצוגה מקדימה תופיע כאן לאחר האישור הסופי</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
