import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { ArrowLeft, Plus, Check, X, CalendarClock, Pencil, Trash2, ArrowUp, ArrowDown, Radio } from 'lucide-react';

export default function QuizEditorPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Schedule editing
  const [editSchedule, setEditSchedule] = useState(false);
  const [schedOpen, setSchedOpen] = useState('');
  const [schedClose, setSchedClose] = useState('');

  // Quiz metadata editing
  const [showEditQuiz, setShowEditQuiz] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDesc, setQuizDesc] = useState('');
  const [quizDuration, setQuizDuration] = useState(10);
  const [quizAttemptLimit, setQuizAttemptLimit] = useState(1);
  const [quizMode, setQuizMode] = useState<'manual' | 'scheduled' | 'live'>('manual');

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

  const [showEdit, setShowEdit] = useState(false);
  const [editingQ, setEditingQ] = useState<any>(null);

  const canEdit = useMemo(() => quiz?.status === 'draft', [quiz?.status]);

  const toErrorMessage = (e: any) => {
    return e?.response?.data?.message || e?.message || 'Terjadi kesalahan';
  };

  const fetchData = async () => {
    try {
      setError(null);
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
      // Init metadata fields
      setQuizTitle(q.title || '');
      setQuizDesc(q.description || '');
      setQuizDuration(Number(q.duration || 10));
      setQuizAttemptLimit(Number(q.attemptLimit || 1));
      setQuizMode((q.mode || 'manual') as any);
    } catch (e: any) {
      setError(toErrorMessage(e));
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [quizId]);

  const handleSaveSchedule = async () => {
    try {
      setError(null);
      await api.patch(`/quizzes/${quizId}`, {
        scheduledOpen: schedOpen ? new Date(schedOpen).toISOString() : null,
        scheduledClose: schedClose ? new Date(schedClose).toISOString() : null,
        mode: 'scheduled',
      });
      setEditSchedule(false);
      fetchData();
    } catch (e: any) {
      setError(toErrorMessage(e));
    }
  };

  const handleCancelSchedule = async () => {
    if (!confirm('Batalkan jadwal kuis? Jadwal buka/tutup akan dihapus dan mode kembali ke manual.')) return;
    try {
      setError(null);
      await api.patch(`/quizzes/${quizId}`, {
        scheduledOpen: null,
        scheduledClose: null,
        mode: 'manual',
      });
      setSchedOpen('');
      setSchedClose('');
      setEditSchedule(false);
      fetchData();
    } catch (e: any) {
      setError(toErrorMessage(e));
    }
  };

  const handleDeleteQuiz = async () => {
    if (!confirm('Hapus kuis ini? Semua soal dan hasil akan terhapus.')) return;
    try {
      setError(null);
      await api.delete(`/quizzes/${quizId}`);
      navigate(-1);
    } catch (e: any) {
      setError(toErrorMessage(e));
    }
  };

  const openEditQuiz = () => {
    setQuizTitle(quiz?.title || '');
    setQuizDesc(quiz?.description || '');
    setQuizDuration(Number(quiz?.duration || 10));
    setQuizAttemptLimit(Number(quiz?.attemptLimit || 1));
    setQuizMode((quiz?.mode || 'manual') as any);
    setShowEditQuiz(true);
  };

  const handleSaveQuizMeta = async () => {
    if (!quizTitle.trim()) return;
    try {
      setError(null);
      await api.patch(`/quizzes/${quizId}`, {
        title: quizTitle.trim(),
        description: quizDesc,
        duration: quizDuration,
        attemptLimit: quizAttemptLimit,
        mode: quizMode,
      });
      setShowEditQuiz(false);
      fetchData();
    } catch (e: any) {
      setError(toErrorMessage(e));
    }
  };

  const handlePublish = async () => {
    if (questions.length === 0) {
      setError('Tambahkan minimal 1 soal sebelum menerbitkan kuis.');
      return;
    }

    if (quiz.mode === 'scheduled') {
      if (!schedOpen || !schedClose) {
        setError('Untuk mode scheduled, isi jadwal buka dan tutup terlebih dulu.');
        return;
      }
      if (new Date(schedClose) <= new Date(schedOpen)) {
        setError('Waktu tutup harus setelah waktu buka.');
        return;
      }
    }

    if (!confirm('Terbitkan kuis? Setelah diterbitkan, soal tidak dapat diubah lagi.')) return;
    try {
      setError(null);
      let targetStatus = 'open';
      if (quiz.mode === 'scheduled') targetStatus = 'scheduled';
      if (quiz.mode === 'live') targetStatus = 'waiting';
      
      await api.patch(`/quizzes/${quizId}`, { status: targetStatus });
      if (quiz.mode === 'live') {
        navigate(`/quizzes/${quizId}/live`);
        return;
      }
      fetchData();
    } catch (e: any) {
      setError(toErrorMessage(e));
    }
  };

  const handleToggleOpenClosed = async () => {
    try {
      setError(null);
      const current = quiz?.status;
      if (current !== 'open' && current !== 'closed') return;
      const next = current === 'open' ? 'closed' : 'open';
      await api.patch(`/quizzes/${quizId}`, { status: next });
      fetchData();
    } catch (e: any) {
      setError(toErrorMessage(e));
    }
  };

  const handleAddQuestion = async () => {
    if (!qText.trim()) return;
    try {
      setError(null);
      const body: any = { text: qText, type: qType, points: qPoints };
      if (qType === 'multiple_choice') {
        body.options = qOptions.filter((o) => o.text.trim());
      }
      await api.post(`/quizzes/${quizId}/questions`, body);
      setShowAdd(false);
      resetForm();
      fetchData();
    } catch (e: any) {
      setError(toErrorMessage(e));
    }
  };

  const openEdit = (q: any) => {
    setEditingQ(q);
    setQText(q.text || '');
    setQType(q.type || 'multiple_choice');
    setQPoints(q.points || 10);
    if (q.type === 'multiple_choice') {
      const opts = (q.options || []).map((o: any) => ({ text: o.text || '', isCorrect: !!o.isCorrect }));
      const normalized = [...opts];
      while (normalized.length < 4) normalized.push({ text: '', isCorrect: false });
      if (!normalized.some((o) => o.isCorrect) && normalized.length > 0) {
        normalized[0].isCorrect = true;
      }
      setQOptions(normalized.slice(0, 4));
    } else {
      setQOptions([
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ]);
    }
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!editingQ?._id) return;
    if (!qText.trim()) return;
    try {
      setError(null);
      const body: any = { text: qText, type: qType, points: qPoints };
      if (qType === 'multiple_choice') {
        body.options = qOptions.filter((o) => o.text.trim());
      } else {
        body.options = [];
      }
      await api.patch(`/quizzes/${quizId}/questions/${editingQ._id}`, body);
      setShowEdit(false);
      setEditingQ(null);
      resetForm();
      fetchData();
    } catch (e: any) {
      setError(toErrorMessage(e));
    }
  };

  const handleDeleteQuestion = async (q: any) => {
    if (!q?._id) return;
    if (!confirm('Hapus soal ini?')) return;
    try {
      setError(null);
      await api.delete(`/quizzes/${quizId}/questions/${q._id}`);
      fetchData();
    } catch (e: any) {
      setError(toErrorMessage(e));
    }
  };

  const handleMoveQuestion = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= questions.length) return;
    const next = [...questions];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setQuestions(next);
    try {
      setError(null);
      await api.put(`/quizzes/${quizId}/questions/reorder`, {
        questionIds: next.map((q) => q._id),
      });
      fetchData();
    } catch (e: any) {
      setError(toErrorMessage(e));
      fetchData();
    }
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
      {error && (
        <div className="card" style={{ marginBottom: 12, border: '1px solid var(--red-200)', background: 'var(--red-50)' }}>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <p style={{ color: 'var(--red-700)', fontSize: '0.875rem', margin: 0 }}>{error}</p>
            <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>Tutup</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Kembali
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          {quiz.status !== 'draft' && quiz.mode === 'live' && (
            <button
              className="btn btn-sm"
              style={{ background: 'var(--red-50)', color: 'var(--red-500)', border: '1px solid var(--red-100)' }}
              onClick={() => navigate(`/quizzes/${quizId}/live`)}
              title="Buka kontrol Live Quiz"
            >
              <Radio size={14} /> Live Control
            </button>
          )}

          {quiz.status !== 'draft' && (quiz.status === 'open' || quiz.status === 'closed') && quiz.mode === 'manual' && (
            <button className={`btn btn-sm ${quiz.status === 'open' ? 'btn-danger' : 'btn-primary'}`} onClick={handleToggleOpenClosed}>
              {quiz.status === 'open' ? 'Tutup Kuis' : 'Buka Kuis'}
            </button>
          )}

          {quiz.status === 'draft' && (
            <>
              <button className="btn btn-danger btn-sm" onClick={handleDeleteQuiz}>
                <Trash2 size={16} /> Hapus
              </button>
              <button className="btn btn-primary btn-sm" onClick={handlePublish}>
                <Check size={16} /> {quiz.mode === 'live' ? 'Siapkan Live Quiz' : 'Terbitkan Kuis'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Quiz Info */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{
          padding: '24px',
          background: 'var(--primary-50)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h2 style={{ marginBottom: 8 }}>{quiz.title}</h2>
              {quiz.description && (
                <p style={{ marginTop: -2, marginBottom: 8, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{quiz.description}</p>
              )}
            </div>
            {canEdit && (
              <button className="btn btn-secondary btn-sm" onClick={openEditQuiz}>
                <Pencil size={14} /> Edit Info
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: '0.875rem', color: 'var(--text-secondary)', flexWrap: 'wrap', alignItems: 'center' }}>
            <span>⏱ {quiz.duration} menit</span>
            <span>📝 {questions.length} soal</span>
            <span>🔄 Mode: {quiz.mode}</span>
            <span>🔁 Maks. Percobaan: {quiz.attemptLimit || 1}</span>
            <span className={`badge ${quiz.status === 'open' ? 'badge-green' : quiz.status === 'draft' ? 'badge-gray' : quiz.status === 'scheduled' ? 'badge-yellow' : 'badge-gray'}`}>
              {quiz.status}
            </span>
          </div>
          {quiz.mode === 'live' && quiz.status !== 'draft' && (
            <div style={{ marginTop: 10, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
              Gunakan tombol <b>Live Control</b> di kanan atas untuk memulai dan mengontrol sesi live.
            </div>
          )}
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
            <div style={{ display: 'flex', gap: 8 }}>
              {canEdit && quiz.mode === 'scheduled' && (
                <button className="btn btn-danger btn-sm" onClick={handleCancelSchedule}>Batalkan Jadwal</button>
              )}
              <button className="btn btn-secondary btn-sm" onClick={() => setEditSchedule(true)}>Ubah Jadwal</button>
            </div>
          </div>
        )}

        {editSchedule && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--gray-50)' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CalendarClock size={16} /> Ubah Jadwal Kuis
            </p>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">📅 Waktu Buka</label>
              <input
                type="datetime-local"
                className="form-input"
                value={schedOpen}
                onChange={(e) => setSchedOpen(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                style={{ width: '100%' }}
              />
              <p className="form-hint">Kuis akan otomatis terbuka pada waktu ini.</p>
            </div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label">📅 Waktu Tutup</label>
              <input
                type="datetime-local"
                className="form-input"
                value={schedClose}
                onChange={(e) => setSchedClose(e.target.value)}
                min={schedOpen || new Date().toISOString().slice(0, 16)}
                style={{ width: '100%' }}
              />
              <p className="form-hint">Kuis akan otomatis ditutup pada waktu ini.</p>
            </div>
            {schedOpen && schedClose && new Date(schedClose) <= new Date(schedOpen) && (
              <p className="form-error" style={{ marginBottom: 8 }}>⚠️ Waktu tutup harus setelah waktu buka!</p>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {canEdit && quiz.mode === 'scheduled' && (
                <button className="btn btn-danger btn-sm" onClick={handleCancelSchedule}>Batalkan Jadwal</button>
              )}
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

        {/* Backtrack toggle */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Izinkan Kembali ke Soal Sebelumnya</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Jika dimatikan, siswa hanya bisa maju ke soal berikutnya.</p>
          </div>
          <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={quiz.allowBacktrack !== false}
              onChange={async (e) => {
                try {
                  setError(null);
                  await api.patch(`/quizzes/${quizId}`, { allowBacktrack: e.target.checked });
                  fetchData();
                } catch (err: any) {
                  setError(toErrorMessage(err));
                }
              }}
              style={{ display: 'none' }}
            />
            <span style={{
              position: 'absolute', inset: 0, borderRadius: 24,
              background: quiz.allowBacktrack !== false ? 'var(--primary-500)' : 'var(--gray-300)',
              transition: 'background 0.2s',
            }}>
              <span style={{
                position: 'absolute', top: 2, left: quiz.allowBacktrack !== false ? 22 : 2,
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </span>
          </label>
        </div>
      </div>

      {/* Questions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ marginBottom: 4 }}>Daftar Soal ({questions.length})</h3>
          {!canEdit && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>Kuis sudah diterbitkan. Soal tidak dapat diubah.</p>
          )}
        </div>
        {canEdit && (
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
            {canEdit && (
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className={`badge ${q.type === 'essay' ? 'badge-purple' : 'badge-blue'}`}>
                          {q.type === 'essay' ? 'Esai' : 'Pilihan Ganda'} • {q.points} poin
                        </span>
                        {canEdit && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-ghost btn-icon"
                              onClick={() => handleMoveQuestion(i, i - 1)}
                              disabled={i === 0}
                              title="Pindah ke atas"
                            >
                              <ArrowUp size={16} />
                            </button>
                            <button
                              className="btn btn-ghost btn-icon"
                              onClick={() => handleMoveQuestion(i, i + 1)}
                              disabled={i === questions.length - 1}
                              title="Pindah ke bawah"
                            >
                              <ArrowDown size={16} />
                            </button>
                            <button
                              className="btn btn-ghost btn-icon"
                              onClick={() => openEdit(q)}
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className="btn btn-ghost btn-icon"
                              onClick={() => handleDeleteQuestion(q)}
                              title="Hapus"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
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

      {/* Edit Question Modal */}
      {showEdit && (
        <div className="modal-overlay" onClick={() => { setShowEdit(false); setEditingQ(null); resetForm(); }}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Soal</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => { setShowEdit(false); setEditingQ(null); resetForm(); }}><X size={20} /></button>
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
                        name="correct_edit"
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
              <button className="btn btn-secondary" onClick={() => { setShowEdit(false); setEditingQ(null); resetForm(); }}>Batal</button>
              <button className="btn btn-primary" onClick={handleSaveEdit} disabled={!qText.trim()}>Simpan Perubahan</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Quiz Modal */}
      {showEditQuiz && (
        <div className="modal-overlay" onClick={() => setShowEditQuiz(false)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Info Kuis</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowEditQuiz(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Judul</label>
                <input className="form-input" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Deskripsi (opsional)</label>
                <textarea className="form-textarea" value={quizDesc} onChange={(e) => setQuizDesc(e.target.value)} rows={3} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Durasi (menit)</label>
                  <input type="number" className="form-input" value={quizDuration} onChange={(e) => setQuizDuration(Number(e.target.value))} min={1} max={480} />
                </div>
                <div className="form-group">
                  <label className="form-label">Batas Percobaan</label>
                  <input type="number" className="form-input" value={quizAttemptLimit} onChange={(e) => setQuizAttemptLimit(Number(e.target.value))} min={1} max={10} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Mode</label>
                <select className="form-select" value={quizMode} onChange={(e) => setQuizMode(e.target.value as any)}>
                  <option value="manual">manual</option>
                  <option value="scheduled">scheduled</option>
                  <option value="live">live</option>
                </select>
                <p className="form-hint">Jika memilih <b>scheduled</b>, kamu bisa atur jadwal di bawah kartu info.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEditQuiz(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSaveQuizMeta} disabled={!quizTitle.trim()}>Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
