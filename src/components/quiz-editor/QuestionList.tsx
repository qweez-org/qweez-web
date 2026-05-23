import { FileText, ArrowUp, ArrowDown, Pencil, Trash2, Check } from 'lucide-react';

interface Props {
  questions: any[];
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (q: any) => void;
  onDelete: (q: any) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
}

export default function QuestionList({ questions, canEdit, onAdd, onEdit, onDelete, onMove }: Props) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ marginBottom: 4 }}>Daftar Soal ({questions.length})</h3>
          {!canEdit && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>Kuis sudah diterbitkan. Soal tidak dapat diubah.</p>
          )}
        </div>
        {canEdit && (
          <button className="btn btn-primary btn-sm" onClick={onAdd}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg> Tambah Soal
          </button>
        )}
      </div>

      {questions.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 40 }}>
            <FileText size={48} style={{ color: 'var(--gray-400)', marginBottom: 16 }} />
            <h3>Belum ada soal</h3>
            <p>Tambahkan soal pilihan ganda atau esai.</p>
            {canEdit && (
              <button className="btn btn-primary" onClick={onAdd}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg> Tambah Soal
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {questions.map((q, i) => (
            <div key={q._id} className="card">
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: 'var(--radius-full)',
                    background: 'var(--primary-100)', color: 'var(--primary-700)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.8125rem', flexShrink: 0,
                  }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <p style={{ fontWeight: 600 }}>{q.text}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className={`badge ${q.type === 'short_answer' ? 'badge-purple' : q.type === 'true_false' ? 'badge-green' : 'badge-blue'}`}>
                          {q.type === 'short_answer' ? 'Jawaban Pendek' : q.type === 'true_false' ? 'Benar/Salah' : 'Pilihan Ganda'} • {q.points} poin
                        </span>
                        {canEdit && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-ghost btn-icon" onClick={() => onMove(i, i - 1)} disabled={i === 0} title="Pindah ke atas">
                              <ArrowUp size={16} />
                            </button>
                            <button className="btn btn-ghost btn-icon" onClick={() => onMove(i, i + 1)} disabled={i === questions.length - 1} title="Pindah ke bawah">
                              <ArrowDown size={16} />
                            </button>
                            <button className="btn btn-ghost btn-icon" onClick={() => onEdit(q)} title="Edit">
                              <Pencil size={16} />
                            </button>
                            <button className="btn btn-ghost btn-icon" onClick={() => onDelete(q)} title="Hapus">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {(q.type === 'multiple_choice' || q.type === 'true_false') && q.options && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 8 }}>
                        {q.options.map((opt: any, oi: number) => (
                          <div key={oi} style={{
                            padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem',
                            background: opt.isCorrect ? 'var(--primary-50)' : 'var(--gray-50)',
                            border: `1px solid ${opt.isCorrect ? 'var(--primary-300)' : 'var(--border)'}`,
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}>
                            {opt.isCorrect && <Check size={14} color="var(--primary-600)" />}
                            {opt.text}
                          </div>
                        ))}
                      </div>
                    )}
                    {q.type === 'short_answer' && q.options && (
                      <div style={{ marginTop: 8, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        <b>Jawaban Benar:</b> {q.options.map((o: any) => o.text).join(' | ')}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                          Case Sensitive: {q.caseSensitive ? 'Ya' : 'Tidak'} • Space Sensitive: {q.spaceSensitive ? 'Ya' : 'Tidak'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
