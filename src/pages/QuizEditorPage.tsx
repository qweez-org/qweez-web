import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { ArrowLeft, Plus, Check, X, CalendarClock } from 'lucide-react';

export default function QuizEditorPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Schedule editing
  const [editSchedule, setEditSchedule] = useState(false);
  const [schedOpen, setSchedOpen] = useState('');
  const [schedClose, setSchedClose] = useState('');

  // Add question form
  const [showAdd, setShowAdd] = useState(false);
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<'multiple_choice' | 'essay'>('multiple_choice');
  const [qPoints, setQPoints] = useState(10);
  const [qOptions, setQOptions] = useState([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);

  const fetchData = async () => {
    try {
      const [quizRes, qRes] = await Promise.all([
        api.get(`/quizzes/${quizId}`),
        api.get(`/quizzes/${quizId}/questions`),
      ]);
      const q = quizRes.data.quiz;
      setQuiz(q);
      setQuestions(qRes.data.questions || []);
      // Init schedule fields
      if (q.scheduledOpen) setSchedOpen(new Date(q.scheduledOpen).toISOString().slice(0, 16));
      if (q.scheduledClose) setSchedClose(new Date(q.scheduledClose).toISOString().slice(0, 16));
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [quizId]);

  const handleSaveSchedule = async () => {
    try {
      await api.patch(`/quizzes/${quizId}`, {
        scheduledOpen: schedOpen ? new Date(schedOpen).toISOString() : null,
        scheduledClose: schedClose ? new Date(schedClose).toISOString() : null,
        mode: 'scheduled',
      });
      setEditSchedule(false);
      fetchData();
    } catch {}
  };

  const handlePublish = async () => {
    if (!confirm('Terbitkan kuis? Setelah diterbitkan, soal tidak dapat diubah lagi.')) return;
    try {
      let targetStatus = 'open';
      if (quiz.mode === 'scheduled') targetStatus = 'scheduled';
      if (quiz.mode === 'live') targetStatus = 'waiting';
      
      await api.patch(`/quizzes/${quizId}`, { status: targetStatus });
      fetchData();
    } catch {}
  };

  const handleAddQuestion = async () => {
    if (!qText.trim()) return;
    try {
      const body: any = { text: qText, type: qType, points: qPoints };
      if (qType === 'multiple_choice') {
        body.options = qOptions.filter((o) => o.text.trim());
      }
      await api.post(`/quizzes/${quizId}/questions`, body);
      setShowAdd(false);
      resetForm();
      fetchData();
    } catch {}
  };

  const resetForm = () => {
    setQText('');
    setQType('multiple_choice');
    setQPoints(10);
    setQOptions([
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ]);
  };

  const handleOptionChange = (index: number, field: string, value: any) => {
    setQOptions((prev) => prev.map((o, i) => {
      if (field === 'isCorrect') {
        return { ...o, isCorrect: i === index };
      }
      return i === index ? { ...o, [field]: value } : o;
    }));
  };

  const formatDate = (d?: string) => {
    if (!d) return '–';
    return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!quiz) return <div>Kuis tidak ditemukan</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Kembali
        </button>
        {quiz.status === 'draft' && (
          <button className="btn btn-primary btn-sm" onClick={handlePublish}>
            <Check size={16} /> Terbitkan Kuis
          </button>
        )}
      </div>

      {/* Quiz Info */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{
          padding: '24px',
          background: 'var(--primary-50)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        }}>
          <h2 style={{ marginBottom: 8 }}>{quiz.title}</h2>
          <div style={{ display: 'flex', gap: 12, fontSize: '0.875rem', color: 'var(--text-secondary)', flexWrap: 'wrap', alignItems: 'center' }}>
            <span>⏱ {quiz.duration} menit</span>
            <span>📝 {questions.length} soal</span>
            <span>🔄 Mode: {quiz.mode}</span>
            <span className={`badge ${quiz.status === 'open' ? 'badge-green' : quiz.status === 'draft' ? 'badge-gray' : quiz.status === 'scheduled' ? 'badge-yellow' : 'badge-gray'}`}>
              {quiz.status}
            </span>
          </div>
        </div>

        {/* Schedule section */}
        {(quiz.mode === 'scheduled' || quiz.scheduledOpen || quiz.scheduledClose) && !editSchedule && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <CalendarClock size={18} style={{ color: 'var(--text-tertiary)' }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Jadwal Kuis</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                Buka: {formatDate(quiz.scheduledOpen)} — Tutup: {formatDate(quiz.scheduledClose)}
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditSchedule(true)}>Ubah Jadwal</button>
          </div>
        )}

        {editSchedule && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--gray-50)' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CalendarClock size={16} /> Ubah Jadwal Kuis
            </p>
            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Waktu Buka</label>
                <input type="datetime-local" className="form-input" value={schedOpen} onChange={(e) => setSchedOpen(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Waktu Tutup</label>
                <input type="datetime-local" className="form-input" value={schedClose} onChange={(e) => setSchedClose(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditSchedule(false)}>Batal</button>
              <button className="btn btn-primary btn-sm" onClick={handleSaveSchedule}>Simpan Jadwal</button>
            </div>
          </div>
        )}

        {/* Add schedule button for non-scheduled quizzes */}
        {quiz.mode !== 'scheduled' && !quiz.scheduledOpen && !editSchedule && (
          <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditSchedule(true)}>
              <CalendarClock size={14} /> Tambah Jadwal Buka/Tutup
            </button>
          </div>
        )}
      </div>

      {/* Questions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ marginBottom: 4 }}>Daftar Soal ({questions.length})</h3>
          {quiz.status !== 'draft' && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>Kuis sudah diterbitkan. Soal tidak dapat diubah.</p>
          )}
        </div>
        {quiz.status === 'draft' && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Tambah Soal
          </button>
        )}
      </div>

      {questions.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 40 }}>
            <h3>Belum ada soal</h3>
            <p>Tambahkan soal pilihan ganda atau esai.</p>
            {quiz.status === 'draft' && (
              <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                <Plus size={18} /> Tambah Soal
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
                      <span className={`badge ${q.type === 'essay' ? 'badge-purple' : 'badge-blue'}`}>
                        {q.type === 'essay' ? 'Esai' : 'Pilihan Ganda'} • {q.points} poin
                      </span>
                    </div>
                    {q.type === 'multiple_choice' && q.options && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 8 }}>
                        {q.options.map((opt: any, oi: number) => (
                          <div key={oi} style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.875rem',
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
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Question Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tambah Soal</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAdd(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Pertanyaan</label>
                <textarea className="form-textarea" placeholder="Tulis pertanyaan..." value={qText} onChange={(e) => setQText(e.target.value)} rows={3} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Tipe</label>
                  <select className="form-select" value={qType} onChange={(e) => setQType(e.target.value as any)}>
                    <option value="multiple_choice">Pilihan Ganda</option>
                    <option value="essay">Esai</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Poin</label>
                  <input type="number" className="form-input" value={qPoints} onChange={(e) => setQPoints(Number(e.target.value))} min={1} />
                </div>
              </div>

              {qType === 'multiple_choice' && (
                <div className="form-group">
                  <label className="form-label">Pilihan Jawaban</label>
                  <p className="form-hint" style={{ marginBottom: 10 }}>Klik radio untuk menandai jawaban benar.</p>
                  {qOptions.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <input
                        type="radio"
                        name="correct"
                        checked={opt.isCorrect}
                        onChange={() => handleOptionChange(i, 'isCorrect', true)}
                        style={{ accentColor: 'var(--primary-500)', width: 18, height: 18 }}
                      />
                      <input
                        className="form-input"
                        placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
                        value={opt.text}
                        onChange={(e) => handleOptionChange(i, 'text', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowAdd(false); resetForm(); }}>Batal</button>
              <button className="btn btn-primary" onClick={handleAddQuestion} disabled={!qText.trim()}>Tambah Soal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
