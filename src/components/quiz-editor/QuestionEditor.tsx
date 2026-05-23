import { Trash2, X } from 'lucide-react';

export interface QuestionFormData {
  text: string;
  type: 'multiple_choice' | 'short_answer' | 'true_false';
  points: number;
  caseSensitive: boolean;
  spaceSensitive: boolean;
  options: { text: string; isCorrect: boolean }[];
}

interface Props {
  open: boolean;
  editingQ: any;
  data: QuestionFormData;
  error: string | null;
  onChange: (data: QuestionFormData) => void;
  onOptionChange: (index: number, field: string, value: any) => void;
  onTypeChange: (type: 'multiple_choice' | 'short_answer' | 'true_false') => void;
  onClose: () => void;
  onSave: () => void;
}

export default function QuestionEditor({ open, editingQ, data, error, onChange, onOptionChange, onTypeChange, onClose, onSave }: Props) {
  if (!open) return null;

  const title = editingQ ? 'Edit Soal' : 'Tambah Soal';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--red-200)', background: 'var(--red-50)' }}>
              <p style={{ color: 'var(--red-700)', fontSize: '0.875rem', margin: 0 }}>{error}</p>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Pertanyaan</label>
            <textarea className="form-textarea" placeholder="Tulis pertanyaan..." value={data.text} onChange={(e) => onChange({ ...data, text: e.target.value })} rows={3} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Tipe</label>
              <select className="form-select" value={data.type} onChange={(e) => onTypeChange(e.target.value as any)}>
                <option value="multiple_choice">Pilihan Ganda</option>
                <option value="short_answer">Jawaban Pendek</option>
                <option value="true_false">Benar / Salah</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Poin</label>
              <input type="number" className="form-input" value={data.points} onChange={(e) => onChange({ ...data, points: Number(e.target.value) })} min={1} />
            </div>
          </div>

          {data.type === 'multiple_choice' && (
            <div className="form-group">
              <label className="form-label">Pilihan Jawaban</label>
              <p className="form-hint" style={{ marginBottom: 10 }}>Klik radio untuk menandai jawaban benar.</p>
              {data.options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <input
                    type="radio"
                    name="correct"
                    checked={opt.isCorrect}
                    onChange={() => onOptionChange(i, 'isCorrect', true)}
                    style={{ accentColor: 'var(--primary-500)', width: 18, height: 18 }}
                  />
                  <input className="form-input" placeholder={`Opsi ${String.fromCharCode(65 + i)}`} value={opt.text} onChange={(e) => onOptionChange(i, 'text', e.target.value)} />
                  {data.options.length > 2 && (
                    <button className="btn btn-ghost btn-icon" onClick={() => onChange({ ...data, options: data.options.filter((_, idx) => idx !== i) })}><Trash2 size={16} /></button>
                  )}
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={() => onChange({ ...data, options: [...data.options, { text: '', isCorrect: false }] })}>+ Tambah Pilihan</button>
            </div>
          )}

          {data.type === 'true_false' && (
            <div className="form-group">
              <label className="form-label">Jawaban Benar</label>
              <p className="form-hint" style={{ marginBottom: 10 }}>Pilih salah satu sebagai jawaban yang benar.</p>
              <div style={{ display: 'flex', gap: 16 }}>
                {data.options.map((opt, i) => {
                  const isCorrect = opt.isCorrect;
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`btn ${isCorrect ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '16px 24px', fontSize: '1rem', height: 'auto' }}
                      onClick={() => onOptionChange(i, 'isCorrect', true)}
                    >
                      {opt.text === 'Benar' ? '✓ Benar' : '✗ Salah'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {data.type === 'short_answer' && (
            <>
              <div className="form-group">
                <label className="form-label">Kemungkinan Jawaban Benar</label>
                <p className="form-hint" style={{ marginBottom: 10 }}>Tambahkan semua variasi jawaban yang dianggap benar.</p>
                {data.options.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <input className="form-input" placeholder={`Jawaban ${i + 1}`} value={opt.text} onChange={(e) => onOptionChange(i, 'text', e.target.value)} />
                  </div>
                ))}
              </div>
              <div className="grid-2" style={{ marginTop: 8 }}>
                <label className="form-checkbox" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={data.caseSensitive} onChange={(e) => onChange({ ...data, caseSensitive: e.target.checked })} />
                  <span style={{ fontSize: '0.875rem' }}>Case Sensitive</span>
                </label>
                <label className="form-checkbox" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={data.spaceSensitive} onChange={(e) => onChange({ ...data, spaceSensitive: e.target.checked })} />
                  <span style={{ fontSize: '0.875rem' }}>Space Sensitive</span>
                </label>
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" onClick={onSave}>{editingQ ? 'Simpan Perubahan' : 'Tambah Soal'}</button>
        </div>
      </div>
    </div>
  );
}
