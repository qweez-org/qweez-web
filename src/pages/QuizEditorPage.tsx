import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import api from '../api/client';

import { toErrorMessage } from '../utils/errors';
import ConfirmModal from '../components/ConfirmModal';
import ErrorBanner from '../components/ErrorBanner';
import QuizPublishControls from '../components/quiz-editor/QuizPublishControls';
import QuizMetaEditor from '../components/quiz-editor/QuizMetaEditor';
import QuestionList from '../components/quiz-editor/QuestionList';
import QuestionEditor from '../components/quiz-editor/QuestionEditor';
import type { QuestionFormData } from '../components/quiz-editor/QuestionEditor';

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
  const [qType, setQType] = useState<'multiple_choice' | 'short_answer' | 'true_false'>('multiple_choice');
  const [qPoints, setQPoints] = useState(10);
  const [qCaseSensitive, setQCaseSensitive] = useState(false);
  const [qSpaceSensitive, setQSpaceSensitive] = useState(false);
  const [qOptions, setQOptions] = useState([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);

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
      if (current !== 'open' && current !== 'closed' && current !== 'scheduled') return;
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
      // Cek duplikat opsi (case-insensitive)
      const filledOptions = qOptions.filter((o) => o.text.trim());
      const optionTexts = filledOptions.map((o) => o.text.trim().toLowerCase());
      if (new Set(optionTexts).size !== optionTexts.length) {
        setError('Pilihan jawaban tidak boleh ada yang sama persis. Harap ubah opsi yang duplikat.');
        return;
      }
    } else if (qType === 'true_false') {
      // No verification needed as option texts are non-empty hardcoded Benar/Salah
    } else if (qType === 'short_answer') {
      if (!qOptions.some((o) => o.text.trim())) {
        setError('Harap isi setidaknya satu kemungkinan jawaban yang benar.');
        return;
      }
    }
    try {
      setError(null);
      const body: any = { text: qText, type: qType, points: qPoints };
      if (qType === 'multiple_choice' || qType === 'true_false') {
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
    } else if (q.type === 'true_false') {
      const opts = (q.options || []).map((o: any) => ({ text: o.text || '', isCorrect: !!o.isCorrect }));
      setQOptions(opts);
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
      // Cek duplikat opsi (case-insensitive)
      const filledOptions = qOptions.filter((o) => o.text.trim());
      const optionTexts = filledOptions.map((o) => o.text.trim().toLowerCase());
      if (new Set(optionTexts).size !== optionTexts.length) {
        setError('Pilihan jawaban tidak boleh ada yang sama persis. Harap ubah opsi yang duplikat.');
        return;
      }
    } else if (qType === 'true_false') {
      // No verification needed as option texts are non-empty hardcoded Benar/Salah
    } else if (qType === 'short_answer') {
      if (!qOptions.some((o) => o.text.trim())) {
        setError('Harap isi setidaknya satu kemungkinan jawaban yang benar.');
        return;
      }
    }
    try {
      setError(null);
      const body: any = { text: qText, type: qType, points: qPoints };
      if (qType === 'multiple_choice' || qType === 'true_false') {
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

  const handleTypeChange = (newType: 'multiple_choice' | 'short_answer' | 'true_false') => {
    if (newType === qType) return;
    setQType(newType);
    if (newType === 'multiple_choice') {
      setQOptions([
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ]);
    } else if (newType === 'true_false') {
      setQOptions([
        { text: 'Benar', isCorrect: true },
        { text: 'Salah', isCorrect: false },
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

  const questionFormData: QuestionFormData = {
    text: qText,
    type: qType,
    points: qPoints,
    caseSensitive: qCaseSensitive,
    spaceSensitive: qSpaceSensitive,
    options: qOptions,
  };

  return (
    <div>
      <QuizPublishControls
        quiz={quiz}
        onNavigateBack={() => navigate(-1)}
        onNavigateLive={() => navigate(`/quizzes/${quizId}/live`)}
        onToggleOpenClosed={handleToggleOpenClosed}
        onPublish={handlePublish}
        onDeleteQuiz={handleDeleteQuiz}
      />

      {!showAdd && !showEdit && !showEditQuiz && (
        <ErrorBanner error={error} onDismiss={() => setError(null)} />
      )}

      <QuizMetaEditor
        quiz={quiz}
        questions={questions}
        canEdit={canEdit}
        quizDuration={quizDuration}
        quizAttemptLimit={quizAttemptLimit}
        quizMode={quizMode}
        schedOpen={schedOpen}
        schedClose={schedClose}
        setQuizMode={setQuizMode}
        setQuizDuration={setQuizDuration}
        setQuizAttemptLimit={setQuizAttemptLimit}
        setSchedOpen={setSchedOpen}
        setSchedClose={setSchedClose}
        onAutoSave={handleAutoSave}
        onOpenEditQuiz={openEditQuiz}
      />

      <QuestionList
        questions={questions}
        canEdit={canEdit}
        onAdd={() => { setError(null); setShowAdd(true); }}
        onEdit={openEdit}
        onDelete={handleDeleteQuestion}
        onMove={handleMoveQuestion}
      />

      <QuestionEditor
        open={showAdd || showEdit}
        editingQ={showEdit ? editingQ : null}
        data={questionFormData}
        error={error}
        onChange={(data) => {
          setQText(data.text);
          setQType(data.type);
          setQPoints(data.points);
          setQCaseSensitive(data.caseSensitive);
          setQSpaceSensitive(data.spaceSensitive);
          setQOptions(data.options);
        }}
        onOptionChange={handleOptionChange}
        onTypeChange={handleTypeChange}
        onClose={() => {
          if (showAdd) setShowAdd(false);
          if (showEdit) { setShowEdit(false); setEditingQ(null); }
          resetForm();
        }}
        onSave={showEdit ? handleSaveEdit : handleAddQuestion}
      />

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
