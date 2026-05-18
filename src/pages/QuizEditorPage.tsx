import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { ArrowLeft, Plus, Check, X, CalendarClock, Pencil, Trash2, ArrowUp, ArrowDown, Radio, Timer, FileText, LayoutList, Repeat, CalendarDays } from 'lucide-react';
import { toErrorMessage } from '../utils/errors';
import { formatScheduleDate, statusColors, statusLabels } from '../utils/format';
import ConfirmModal from '../components/ConfirmModal';

export default function QuizEditorPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Schedule editing

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
  const [qType, setQType] = useState<'multiple_choice' | 'short_answer'>('multiple_choice');
  const [qPoints, setQPoints] = useState(10);
  const [qCaseSensitive, setQCaseSensitive] = useState(false);
  const [qSpaceSensitive, setQSpaceSensitive] = useState(false);
  const [qOptions, setQOptions] = useState([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);

  const [quizShuffleQuestions, setQuizShuffleQuestions] = useState(false);
  const [quizShuffleOptions, setQuizShuffleOptions] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [editingQ, setEditingQ] = useState<any>(null);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, open: false }));

  const canEdit = useMemo(() => quiz?.status === 'draft', [quiz?.status]);



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
      // Init schedule fields (convert UTC → local for datetime-local inputs)
      const toLocalInput = (iso: string) => {
        const d = new Date(iso);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      };
      if (q.scheduledOpen) setSchedOpen(toLocalInput(q.scheduledOpen));
      if (q.scheduledClose) setSchedClose(toLocalInput(q.scheduledClose));
      // Init metadata fields
      setQuizTitle(q.title || '');
      setQuizDesc(q.description || '');
      setQuizDuration(Number(q.duration || 10));
      setQuizAttemptLimit(Number(q.attemptLimit || 1));
      setQuizMode((q.mode || 'manual') as any);
      setQuizShuffleQuestions(q.shuffleQuestions || false);
      setQuizShuffleOptions(q.shuffleOptions || false);
    } catch (e: any) {
      setError(toErrorMessage(e));
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [quizId]);



  const handleDeleteQuiz = async () => {
    setConfirmModal({
      open: true,
      title: 'Hapus Kuis',
      message: 'Hapus kuis ini? Semua soal dan hasil akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.',
      confirmLabel: 'Hapus',
      variant: 'danger',
      onConfirm: async () => {
        closeConfirm();
        try {
          setError(null);
          await api.delete(`/quizzes/${quizId}`);
          navigate(-1);
        } catch (e: any) {
          setError(toErrorMessage(e));
        }
      },
    });
  };

  const openEditQuiz = () => {
    setQuizTitle(quiz?.title || '');
    setQuizDesc(quiz?.description || '');
    setQuizDuration(Number(quiz?.duration || 10));
    setQuizAttemptLimit(Number(quiz?.attemptLimit || 1));
    setQuizMode((quiz?.mode || 'manual') as any);
    setQuizShuffleQuestions(quiz?.shuffleQuestions || false);
    setQuizShuffleOptions(quiz?.shuffleOptions || false);
    setShowEditQuiz(true);
  };

  const handleSaveQuizMeta = async () => {
    if (!quizTitle.trim()) return;
    try {
      setError(null);
      await api.patch(`/quizzes/${quizId}`, {
        title: quizTitle.trim(),
        description: quizDesc,
      });
      setShowEditQuiz(false);
      fetchData();
    } catch (e: any) {
      setError(toErrorMessage(e));
    }
  };

  const handleAutoSave = async (updates: any) => {
    try {
      setError(null);
      await api.patch(`/quizzes/${quizId}`, updates);
      fetchData();
    } catch (err: any) {
      setError(toErrorMessage(err));
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

    setConfirmModal({
      open: true,
      title: 'Terbitkan Kuis',
      message: 'Setelah diterbitkan, soal tidak dapat diubah lagi. Lanjutkan?',
      confirmLabel: 'Terbitkan',
      variant: 'info',
      onConfirm: async () => {
        closeConfirm();
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
      },
    });
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
    if (qType === 'multiple_choice') {
      const correctOpt = qOptions.find((o) => o.isCorrect);
      if (correctOpt && !correctOpt.text.trim()) {
        setError('Opsi jawaban benar tidak boleh kosong. Harap isi terlebih dahulu.');
        return;
      }
    } else if (qType === 'short_answer') {
      if (!qOptions.some((o) => o.text.trim())) {
        setError('Harap isi setidaknya satu kemungkinan jawaban yang benar.');
        return;
      }
    }
    try {
      setError(null);
      const body: any = { text: qText, type: qType, points: qPoints };
      if (qType === 'multiple_choice') {
        body.options = qOptions.filter((o) => o.text.trim());
      } else if (qType === 'short_answer') {
        body.options = qOptions.filter((o) => o.text.trim()).map(o => ({ text: o.text.trim(), isCorrect: true }));
        body.caseSensitive = qCaseSensitive;
        body.spaceSensitive = qSpaceSensitive;
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
    setError(null);
    setEditingQ(q);
    setQText(q.text || '');
    setQType(q.type || 'multiple_choice');
    setQPoints(q.points || 10);
    setQCaseSensitive(q.caseSensitive || false);
    setQSpaceSensitive(q.spaceSensitive || false);
    if (q.type === 'multiple_choice') {
      const opts = (q.options || []).map((o: any) => ({ text: o.text || '', isCorrect: !!o.isCorrect }));
      const normalized = [...opts];
      while (normalized.length < 4) normalized.push({ text: '', isCorrect: false });
      if (!normalized.some((o) => o.isCorrect) && normalized.length > 0) {
        normalized[0].isCorrect = true;
      }
      setQOptions(normalized);
    } else if (q.type === 'short_answer') {
      const opts = (q.options || []).map((o: any) => ({ text: o.text || '', isCorrect: true }));
      while (opts.length < 1) opts.push({ text: '', isCorrect: true });
      setQOptions(opts);
    } else {
      setQOptions([
        { text: '', isCorrect: true },
      ]);
    }
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!editingQ?._id) return;
    if (!qText.trim()) return;
    if (qType === 'multiple_choice') {
      const correctOpt = qOptions.find((o) => o.isCorrect);
      if (correctOpt && !correctOpt.text.trim()) {
        setError('Opsi jawaban benar tidak boleh kosong. Harap isi terlebih dahulu.');
        return;
      }
    } else if (qType === 'short_answer') {
      if (!qOptions.some((o) => o.text.trim())) {
        setError('Harap isi setidaknya satu kemungkinan jawaban yang benar.');
        return;
      }
    }
    try {
      setError(null);
      const body: any = { text: qText, type: qType, points: qPoints };
      if (qType === 'multiple_choice') {
        body.options = qOptions.filter((o) => o.text.trim());
      } else if (qType === 'short_answer') {
        body.options = qOptions.filter((o) => o.text.trim()).map(o => ({ text: o.text.trim(), isCorrect: true }));
        body.caseSensitive = qCaseSensitive;
        body.spaceSensitive = qSpaceSensitive;
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
    setConfirmModal({
      open: true,
      title: 'Hapus Soal',
      message: 'Hapus soal ini? Tindakan ini tidak dapat dibatalkan.',
      confirmLabel: 'Hapus',
      variant: 'danger',
      onConfirm: async () => {
        closeConfirm();
        try {
          setError(null);
          await api.delete(`/quizzes/${quizId}/questions/${q._id}`);
          fetchData();
        } catch (e: any) {
          setError(toErrorMessage(e));
        }
      },
    });
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
    setQCaseSensitive(false);
    setQSpaceSensitive(false);
    setQOptions([
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ]);
  };

  const handleTypeChange = (newType: 'multiple_choice' | 'short_answer') => {
    if (newType === qType) return;
    setQType(newType);
    if (newType === 'multiple_choice') {
      setQOptions([
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ]);
    } else {
      setQOptions([{ text: '', isCorrect: true }]);
    }
  };

  const handleOptionChange = (index: number, field: string, value: any) => {
    setQOptions((prev) => prev.map((o, i) => {
      if (field === 'isCorrect') {
        return { ...o, isCorrect: i === index };
      }
      return i === index ? { ...o, [field]: value } : o;
    }));
  };



  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!quiz) return <div>Kuis tidak ditemukan</div>;

  return (
    <div>
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

      {error && !showAdd && !showEdit && !showEditQuiz && (
        <div className="card" style={{ marginBottom: 12, border: '1px solid var(--red-200)', background: 'var(--red-50)' }}>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <p style={{ color: 'var(--red-700)', fontSize: '0.875rem', margin: 0 }}>{error}</p>
            <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>Tutup</button>
          </div>
        </div>
      )}

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
          <div style={{ display: 'flex', gap: 16, fontSize: '0.875rem', color: 'var(--text-secondary)', flexWrap: 'wrap', alignItems: 'center' }}>
            {canEdit ? (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Timer size={14} /> <input type="number" className="form-input" style={{ width: 60, padding: '2px 8px', height: 28 }} value={quizDuration} onChange={(e) => setQuizDuration(Number(e.target.value))} onBlur={() => handleAutoSave({ duration: quizDuration })} min={1} /> menit
                </label>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={14} /> {questions.length} soal</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <LayoutList size={14} /> Tipe: 
                  <select className="form-select" style={{ padding: '2px 24px 2px 8px', height: 28, fontSize: '0.875rem' }} value={quizMode === 'live' ? 'live' : 'biasa'} onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'live') {
                      setQuizMode('live');
                      handleAutoSave({ mode: 'live', scheduledOpen: null, scheduledClose: null });
                      setSchedOpen('');
                      setSchedClose('');
                    } else {
                      setQuizMode('manual');
                      handleAutoSave({ mode: 'manual' });
                    }
                  }}>
                    <option value="biasa">Kuis Biasa</option>
                    <option value="live">Live Quiz</option>
                  </select>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: quiz.mode === 'live' ? 0.6 : 1 }}>
                  <Repeat size={14} /> Maks. Percobaan: {quiz.mode === 'live'
                    ? <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>1 (Live)</span>
                    : <input type="number" className="form-input" style={{ width: 50, padding: '2px 8px', height: 28 }} value={quizAttemptLimit} onChange={(e) => setQuizAttemptLimit(Number(e.target.value))} onBlur={() => handleAutoSave({ attemptLimit: quizAttemptLimit })} min={1} />
                  }
                </label>
              </>
            ) : (
              <>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Timer size={14} /> {quiz.duration} menit</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={14} /> {questions.length} soal</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><LayoutList size={14} /> Tipe: {quiz.mode === 'live' ? 'Live Quiz' : 'Kuis Biasa'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Repeat size={14} /> Maks. Percobaan: {quiz.attemptLimit || 1}</span>
              </>
            )}
            <span className={`badge ${statusColors[quiz.status] || 'badge-gray'}`}>
              {statusLabels[quiz.status] || quiz.status}
            </span>
          </div>
          {quiz.mode === 'live' && quiz.status !== 'draft' && (
            <div style={{ marginTop: 10, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
              Gunakan tombol <b>Live Control</b> di kanan atas untuk memulai dan mengontrol sesi live.
            </div>
          )}
        </div>

        {/* Schedule section (Only for non-live quizzes) */}
        {quiz.mode !== 'live' && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Jadwalkan Kuis Otomatis</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Buka dan tutup kuis secara otomatis berdasarkan waktu.</p>
              </div>
              <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={quiz.mode === 'scheduled'}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setQuizMode('scheduled');
                      handleAutoSave({ mode: 'scheduled' });
                    } else {
                      setQuizMode('manual');
                      handleAutoSave({ mode: 'manual', scheduledOpen: null, scheduledClose: null });
                      setSchedOpen('');
                      setSchedClose('');
                    }
                  }}
                  style={{ display: 'none' }}
                />
                <span style={{
                  position: 'absolute', inset: 0, borderRadius: 24,
                  background: quiz.mode === 'scheduled' ? 'var(--primary-500)' : 'var(--gray-300)',
                  transition: 'background 0.2s',
                }}>
                  <span style={{
                    position: 'absolute', top: 2, left: quiz.mode === 'scheduled' ? 22 : 2,
                    width: 20, height: 20, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </span>
              </label>
            </div>

            {quiz.mode === 'scheduled' && (
              <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap', background: 'var(--gray-50)', padding: 16, borderRadius: 'var(--radius-md)' }}>
                <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CalendarDays size={14} /> Waktu Buka</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={schedOpen}
                    onChange={(e) => {
                      setSchedOpen(e.target.value);
                      if (e.target.value) handleAutoSave({ scheduledOpen: new Date(e.target.value).toISOString() });
                    }}
                  />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CalendarDays size={14} /> Waktu Tutup</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={schedClose}
                    onChange={(e) => {
                      setSchedClose(e.target.value);
                      if (e.target.value) handleAutoSave({ scheduledClose: new Date(e.target.value).toISOString() });
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Backtrack toggle */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: quiz.mode === 'live' ? 0.6 : 1 }}>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Izinkan Kembali ke Soal Sebelumnya</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              {quiz.mode === 'live'
                ? 'Live quiz selalu tidak bisa kembali ke soal sebelumnya.'
                : 'Jika dimatikan, siswa hanya bisa maju ke soal berikutnya.'}
            </p>
          </div>
          <label
            className="toggle-switch"
            style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: quiz.mode === 'live' ? 'not-allowed' : 'pointer' }}
            title={quiz.mode === 'live' ? 'Live quiz selalu tidak bisa kembali ke soal sebelumnya' : ''}
          >
            <input
              type="checkbox"
              checked={quiz.mode === 'live' ? false : (quiz.allowBacktrack !== false)}
              disabled={quiz.mode === 'live'}
              onChange={(e) => handleAutoSave({ allowBacktrack: e.target.checked })}
              style={{ display: 'none' }}
            />
            <span style={{
              position: 'absolute', inset: 0, borderRadius: 24,
              background: (quiz.mode === 'live' ? false : (quiz.allowBacktrack !== false)) ? 'var(--primary-500)' : 'var(--gray-300)',
              transition: 'background 0.2s',
            }}>
              <span style={{
                position: 'absolute', top: 2, left: (quiz.mode === 'live' ? false : (quiz.allowBacktrack !== false)) ? 22 : 2,
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </span>
          </label>
        </div>

        {/* Shuffle Questions toggle */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Acak Urutan Soal</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Setiap siswa mendapat urutan berbeda.</p>
          </div>
          <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={quiz.shuffleQuestions || false}
              onChange={(e) => handleAutoSave({ shuffleQuestions: e.target.checked })}
              style={{ display: 'none' }}
            />
            <span style={{
              position: 'absolute', inset: 0, borderRadius: 24,
              background: quiz.shuffleQuestions ? 'var(--primary-500)' : 'var(--gray-300)',
              transition: 'background 0.2s',
            }}>
              <span style={{
                position: 'absolute', top: 2, left: quiz.shuffleQuestions ? 22 : 2,
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </span>
          </label>
        </div>

        {/* Shuffle Options toggle */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Acak Pilihan Jawaban</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Opsi pada soal pilihan ganda akan diacak.</p>
          </div>
          <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={quiz.shuffleOptions || false}
              onChange={(e) => handleAutoSave({ shuffleOptions: e.target.checked })}
              style={{ display: 'none' }}
            />
            <span style={{
              position: 'absolute', inset: 0, borderRadius: 24,
              background: quiz.shuffleOptions ? 'var(--primary-500)' : 'var(--gray-300)',
              transition: 'background 0.2s',
            }}>
              <span style={{
                position: 'absolute', top: 2, left: quiz.shuffleOptions ? 22 : 2,
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </span>
          </label>
        </div>

        {/* Show Answer Key toggle */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Izinkan Siswa Melihat Kunci Jawaban</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Siswa dapat melihat kunci jawaban setelah semua attempt terpakai.</p>
          </div>
          <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={quiz.showAnswerKey || false}
              onChange={(e) => handleAutoSave({ showAnswerKey: e.target.checked })}
              style={{ display: 'none' }}
            />
            <span style={{
              position: 'absolute', inset: 0, borderRadius: 24,
              background: quiz.showAnswerKey ? 'var(--primary-500)' : 'var(--gray-300)',
              transition: 'background 0.2s',
            }}>
              <span style={{
                position: 'absolute', top: 2, left: quiz.showAnswerKey ? 22 : 2,
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </span>
          </label>
        </div>

        {/* Live quiz: single attempt notice */}
        {quiz.mode === 'live' && (
          <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', background: 'var(--amber-50)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--amber-700)' }}>⚡ Live quiz hanya bisa dikerjakan 1 kali (attempt limit otomatis = 1).</span>
          </div>
        )}
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
          <button className="btn btn-primary btn-sm" onClick={() => { setError(null); setShowAdd(true); }}>
            <Plus size={16} /> Tambah Soal
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
              <button className="btn btn-primary" onClick={() => { setError(null); setShowAdd(true); }}>
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
                        <span className={`badge ${q.type === 'short_answer' ? 'badge-purple' : 'badge-blue'}`}>
                          {q.type === 'short_answer' ? 'Jawaban Pendek' : 'Pilihan Ganda'} • {q.points} poin
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

      {/* Add Question Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tambah Soal</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAdd(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {error && (
                <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--red-200)', background: 'var(--red-50)' }}>
                  <p style={{ color: 'var(--red-700)', fontSize: '0.875rem', margin: 0 }}>{error}</p>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Pertanyaan</label>
                <textarea className="form-textarea" placeholder="Tulis pertanyaan..." value={qText} onChange={(e) => setQText(e.target.value)} rows={3} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Tipe</label>
                  <select className="form-select" value={qType} onChange={(e) => handleTypeChange(e.target.value as any)}>
                    <option value="multiple_choice">Pilihan Ganda</option>
                    <option value="short_answer">Jawaban Pendek</option>
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
                      {qOptions.length > 2 && (
                        <button className="btn btn-ghost btn-icon" onClick={() => setQOptions(qOptions.filter((_, idx) => idx !== i))}><Trash2 size={16} /></button>
                      )}
                    </div>
                  ))}
                  <button className="btn btn-ghost btn-sm" onClick={() => setQOptions([...qOptions, { text: '', isCorrect: false }])}>+ Tambah Pilihan</button>
                </div>
              )}

              {qType === 'short_answer' && (
                <div className="form-group">
                  <label className="form-label">Kemungkinan Jawaban Benar</label>
                  <p className="form-hint" style={{ marginBottom: 10 }}>Tambahkan semua variasi jawaban yang dianggap benar.</p>
                  {qOptions.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <input
                        className="form-input"
                        placeholder={`Jawaban ${i + 1}`}
                        value={opt.text}
                        onChange={(e) => handleOptionChange(i, 'text', e.target.value)}
                      />
                      {qOptions.length > 1 && (
                        <button className="btn btn-ghost btn-icon" onClick={() => setQOptions(qOptions.filter((_, idx) => idx !== i))}><Trash2 size={16} /></button>
                      )}
                    </div>
                  ))}
                  <button className="btn btn-ghost btn-sm" onClick={() => setQOptions([...qOptions, { text: '', isCorrect: true }])} style={{ marginBottom: 16 }}>+ Tambah Jawaban Benar</button>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}>
                      <input type="checkbox" checked={qCaseSensitive} onChange={(e) => setQCaseSensitive(e.target.checked)} />
                      Case Sensitive
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}>
                      <input type="checkbox" checked={qSpaceSensitive} onChange={(e) => setQSpaceSensitive(e.target.checked)} />
                      Space Sensitive
                    </label>
                  </div>
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
              {error && (
                <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--red-200)', background: 'var(--red-50)' }}>
                  <p style={{ color: 'var(--red-700)', fontSize: '0.875rem', margin: 0 }}>{error}</p>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Pertanyaan</label>
                <textarea className="form-textarea" placeholder="Tulis pertanyaan..." value={qText} onChange={(e) => setQText(e.target.value)} rows={3} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Tipe</label>
                  <select className="form-select" value={qType} onChange={(e) => handleTypeChange(e.target.value as any)}>
                    <option value="multiple_choice">Pilihan Ganda</option>
                    <option value="short_answer">Jawaban Pendek</option>
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
                      {qOptions.length > 2 && (
                        <button className="btn btn-ghost btn-icon" onClick={() => setQOptions(qOptions.filter((_, idx) => idx !== i))}><Trash2 size={16} /></button>
                      )}
                    </div>
                  ))}
                  <button className="btn btn-ghost btn-sm" onClick={() => setQOptions([...qOptions, { text: '', isCorrect: false }])}>+ Tambah Pilihan</button>
                </div>
              )}

              {qType === 'short_answer' && (
                <div className="form-group">
                  <label className="form-label">Kemungkinan Jawaban Benar</label>
                  <p className="form-hint" style={{ marginBottom: 10 }}>Tambahkan semua variasi jawaban yang dianggap benar.</p>
                  {qOptions.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <input
                        className="form-input"
                        placeholder={`Jawaban ${i + 1}`}
                        value={opt.text}
                        onChange={(e) => handleOptionChange(i, 'text', e.target.value)}
                      />
                      {qOptions.length > 1 && (
                        <button className="btn btn-ghost btn-icon" onClick={() => setQOptions(qOptions.filter((_, idx) => idx !== i))}><Trash2 size={16} /></button>
                      )}
                    </div>
                  ))}
                  <button className="btn btn-ghost btn-sm" onClick={() => setQOptions([...qOptions, { text: '', isCorrect: true }])} style={{ marginBottom: 16 }}>+ Tambah Jawaban Benar</button>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}>
                      <input type="checkbox" checked={qCaseSensitive} onChange={(e) => setQCaseSensitive(e.target.checked)} />
                      Case Sensitive
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}>
                      <input type="checkbox" checked={qSpaceSensitive} onChange={(e) => setQSpaceSensitive(e.target.checked)} />
                      Space Sensitive
                    </label>
                  </div>
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
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEditQuiz(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSaveQuizMeta} disabled={!quizTitle.trim()}>Simpan</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}
