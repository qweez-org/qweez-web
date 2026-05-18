import { useEffect, useState } from 'react';
import type React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { ArrowLeft, Plus, FileQuestion, Clock, ChevronRight, Trash2, Radio, Download, CalendarClock } from 'lucide-react';
import { toErrorMessage } from '../utils/errors';
import { formatScheduleDate, statusColors, statusLabels } from '../utils/format';
import ConfirmModal from '../components/ConfirmModal';





function formatRemaining(closeStr?: string) {
  if (!closeStr) return '';
  const close = new Date(closeStr);
  const now = new Date();
  if (close <= now) return 'Sudah ditutup';
  const diffMs = close.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `Ditutup dalam ${hours}j ${minutes}m`;
  return `Ditutup dalam ${minutes}m`;
}

export default function TopicDetailPage() {
  const { classId, topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create quiz modal
  const [showCreate, setShowCreate] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDuration, setQuizDuration] = useState(30);
  const [quizMode, setQuizMode] = useState('manual');
  const [scheduledOpen, setScheduledOpen] = useState('');
  const [scheduledClose, setScheduledClose] = useState('');

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



  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const [topicRes, quizRes] = await Promise.all([
          api.get(`/classes/topics/${classId}/${topicId}`),
          api.get(`/quizzes/topics/${topicId}`),
        ]);
        setTopic(topicRes.data.topic);
        setQuizzes(quizRes.data.quizzes || []);
      } catch (e: any) {
        setError(toErrorMessage(e));
      }
      setLoading(false);
    };
    load();
  }, [classId, topicId]);

  const handleCreateQuiz = async () => {
    if (!quizTitle.trim()) return;
    try {
      setError(null);
      const body: any = {
        title: quizTitle,
        duration: quizDuration,
        mode: quizMode,
      };
      if (quizMode === 'scheduled') {
        if (scheduledOpen) body.scheduledOpen = new Date(scheduledOpen).toISOString();
        if (scheduledClose) body.scheduledClose = new Date(scheduledClose).toISOString();
      }
      const { data } = await api.post(`/quizzes/topics/${topicId}`, body);
      setShowCreate(false);
      setQuizTitle('');
      setScheduledOpen('');
      setScheduledClose('');
      navigate(`/quizzes/${data.quiz._id}/edit`);
    } catch (e: any) {
      setError(toErrorMessage(e));
    }
  };

  const handleDeleteQuiz = async (quizId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      open: true,
      title: 'Hapus Kuis',
      message: 'Hapus kuis ini? Semua soal dan hasil akan ikut terhapus.',
      confirmLabel: 'Hapus',
      variant: 'danger',
      onConfirm: async () => {
        closeConfirm();
        try {
          setError(null);
          await api.delete(`/quizzes/${quizId}`);
          setQuizzes((q) => q.filter((x) => x._id !== quizId));
        } catch (err: any) {
          setError(toErrorMessage(err));
        }
      },
    });
  };

  const handleToggleStatus = async (quiz: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = quiz.status === 'open' ? 'closed' : 'open';
    try {
      setError(null);
      await api.patch(`/quizzes/${quiz._id}`, { status: newStatus });
      setQuizzes((q) => q.map((x) => x._id === quiz._id ? { ...x, status: newStatus } : x));
    } catch (err: any) {
      setError(toErrorMessage(err));
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

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

      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => navigate(`/classes/${classId}`)}>
        <ArrowLeft size={16} /> Kembali ke Kelas
      </button>

      <div className="page-header">
        <h1><FileQuestion size={28} /> {topic?.name || 'Topik'}</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> Buat Kuis
        </button>
      </div>

      {quizzes.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><FileQuestion size={36} /></div>
            <h3>Belum ada kuis</h3>
            <p>Buat kuis dan tambahkan soal untuk topik ini.</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={18} /> Buat Kuis Baru
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {quizzes.map((quiz) => (
            <div key={quiz._id} className="card card-clickable" onClick={() => navigate(`/quizzes/${quiz._id}/edit`)} style={{ cursor: 'pointer' }}>
              <div className="quiz-card">
                <div className="quiz-card-icon stat-icon blue">
                  <FileQuestion size={22} />
                </div>
                <div className="quiz-card-info">
                  <h4>{quiz.title}</h4>
                  <p>
                    <Clock size={13} style={{ marginRight: 4, verticalAlign: -2 }} />
                    {quiz.duration} menit • {quiz.questionCount || 0} soal •{' '}
                    <span className={`badge ${statusColors[quiz.status] || 'badge-gray'}`}>
                      {statusLabels[quiz.status] || quiz.status}
                    </span>
                  </p>
                  {quiz.mode === 'scheduled' && (quiz.scheduledOpen || quiz.scheduledClose) && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CalendarClock size={12} />
                      {quiz.scheduledOpen && <>Buka: {formatScheduleDate(quiz.scheduledOpen)}</>}
                      {quiz.scheduledOpen && quiz.scheduledClose && ' — '}
                      {quiz.scheduledClose && <>Tutup: {formatScheduleDate(quiz.scheduledClose)}</>}
                    </p>
                  )}
                  {quiz.mode === 'scheduled' && quiz.status === 'open' && quiz.scheduledClose && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--red-600)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                      <Clock size={12} />
                      {formatRemaining(quiz.scheduledClose)}
                    </p>
                  )}
                </div>
                <div className="quiz-card-actions">
                  {quiz.mode === 'live' && (
                    <button className="btn btn-sm" style={{ background: 'var(--red-50)', color: 'var(--red-500)', border: '1px solid var(--red-100)' }} onClick={(e) => { e.stopPropagation(); navigate(`/quizzes/${quiz._id}/live`); }}>
                      <Radio size={14} /> Live
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" title="Export hasil" onClick={(e) => {
                    e.stopPropagation();
                    api.get(`/export/quizzes/${quiz._id}/export/results`, { responseType: 'blob' }).then(({ data }) => {
                      const url = window.URL.createObjectURL(new Blob([data]));
                      const a = document.createElement('a'); a.href = url; a.download = `quiz-results-${quiz._id}.csv`; a.click();
                      window.URL.revokeObjectURL(url);
                    }).catch((err) => { setError(toErrorMessage(err)); });
                  }}>
                    <Download size={14} />
                  </button>
                  {quiz.status !== 'draft' && quiz.mode !== 'live' && (
                    <button className={`btn btn-sm ${quiz.status === 'open' ? 'btn-danger' : 'btn-primary'}`} onClick={(e) => handleToggleStatus(quiz, e)}>
                      {quiz.status === 'open' ? 'Tutup' : 'Buka'}
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={(e) => handleDeleteQuiz(quiz._id, e)}>
                    <Trash2 size={14} />
                  </button>
                  <ChevronRight size={20} color="var(--text-tertiary)" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Quiz Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Buat Kuis Baru</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Judul Kuis</label>
                <input className="form-input" placeholder="contoh: UTS Matematika" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Durasi (menit)</label>
                  <input type="number" className="form-input" value={quizDuration} onChange={(e) => setQuizDuration(Number(e.target.value))} min={1} max={600} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mode</label>
                  <select className="form-select" value={quizMode} onChange={(e) => setQuizMode(e.target.value)}>
                    <option value="manual">Manual</option>
                    <option value="scheduled">Terjadwal</option>
                    <option value="live">Live Quiz</option>
                  </select>
                </div>
              </div>

              {/* Schedule fields — shown when mode is 'scheduled' */}
              {quizMode === 'scheduled' && (
                <div style={{ background: 'var(--gray-100)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CalendarClock size={16} /> Jadwal Kuis
                  </p>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="form-label">📅 Waktu Buka</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={scheduledOpen}
                      onChange={(e) => setScheduledOpen(e.target.value)}
                      min={(() => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); })()}
                      style={{ width: '100%' }}
                    />
                    <p className="form-hint">Kuis akan otomatis terbuka pada waktu ini.</p>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">📅 Waktu Tutup</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={scheduledClose}
                      onChange={(e) => setScheduledClose(e.target.value)}
                      min={scheduledOpen || (() => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); })()}
                      style={{ width: '100%' }}
                    />
                    <p className="form-hint">Kuis akan otomatis ditutup pada waktu ini.</p>
                  </div>
                  {scheduledOpen && scheduledClose && new Date(scheduledClose) <= new Date(scheduledOpen) && (
                    <p className="form-error" style={{ marginTop: 8 }}>⚠️ Waktu tutup harus setelah waktu buka!</p>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleCreateQuiz} disabled={!quizTitle.trim()}>Buat & Tambah Soal</button>
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
