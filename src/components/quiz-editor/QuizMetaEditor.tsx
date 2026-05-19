import { Timer, FileText, LayoutList, Repeat, CalendarDays } from 'lucide-react';
import { statusColors, statusLabels } from '../../utils/format';

interface Props {
  quiz: any;
  questions: any[];
  canEdit: boolean;
  quizDuration: number;
  quizAttemptLimit: number;
  quizMode: string;
  schedOpen: string;
  schedClose: string;
  setQuizMode: (m: 'manual' | 'scheduled' | 'live') => void;
  setQuizDuration: (v: number) => void;
  setQuizAttemptLimit: (v: number) => void;
  setSchedOpen: (v: string) => void;
  setSchedClose: (v: string) => void;
  onAutoSave: (updates: any) => void;
  onOpenEditQuiz: () => void;
}

export default function QuizMetaEditor(props: Props) {
  const {
    quiz, questions, canEdit, quizDuration, quizAttemptLimit, quizMode,
    schedOpen, schedClose,
    setQuizMode, setQuizDuration, setQuizAttemptLimit, setSchedOpen, setSchedClose,
    onAutoSave, onOpenEditQuiz,
  } = props;

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div style={{ padding: '24px', background: 'var(--primary-50)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2 style={{ marginBottom: 8 }}>{quiz.title}</h2>
            {quiz.description && (
              <p style={{ marginTop: -2, marginBottom: 8, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{quiz.description}</p>
            )}
          </div>
          {canEdit && (
            <button className="btn btn-secondary btn-sm" onClick={onOpenEditQuiz}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg> Edit Info
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: '0.875rem', color: 'var(--text-secondary)', flexWrap: 'wrap', alignItems: 'center' }}>
          {canEdit ? (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Timer size={14} /> <input type="number" className="form-input" style={{ width: 60, padding: '2px 8px', height: 28 }} value={quizDuration} onChange={(e) => setQuizDuration(Number(e.target.value))} onBlur={() => onAutoSave({ duration: quizDuration })} min={1} /> menit
              </label>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={14} /> {questions.length} soal</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <LayoutList size={14} /> Tipe:
                <select className="form-select" style={{ padding: '2px 24px 2px 8px', height: 28, fontSize: '0.875rem' }} value={quizMode === 'live' ? 'live' : 'biasa'} onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'live') {
                    setQuizMode('live');
                    onAutoSave({ mode: 'live', scheduledOpen: null, scheduledClose: null });
                    setSchedOpen('');
                    setSchedClose('');
                  } else {
                    setQuizMode('manual');
                    onAutoSave({ mode: 'manual' });
                  }
                }}>
                  <option value="biasa">Kuis Biasa</option>
                  <option value="live">Live Quiz</option>
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: quiz.mode === 'live' ? 0.6 : 1 }}>
                <Repeat size={14} /> Maks. Percobaan: {quiz.mode === 'live'
                  ? <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>1 (Live)</span>
                  : <input type="number" className="form-input" style={{ width: 50, padding: '2px 8px', height: 28 }} value={quizAttemptLimit} onChange={(e) => setQuizAttemptLimit(Number(e.target.value))} onBlur={() => onAutoSave({ attemptLimit: quizAttemptLimit })} min={1} />
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
                    onAutoSave({ mode: 'scheduled' });
                  } else {
                    setQuizMode('manual');
                    onAutoSave({ mode: 'manual', scheduledOpen: null, scheduledClose: null });
                    setSchedOpen('');
                    setSchedClose('');
                  }
                }}
                style={{ display: 'none' }}
              />
              <span style={{ position: 'absolute', inset: 0, borderRadius: 24, background: quiz.mode === 'scheduled' ? 'var(--primary-500)' : 'var(--gray-300)', transition: 'background 0.2s' }}>
                <span style={{ position: 'absolute', top: 2, left: quiz.mode === 'scheduled' ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </span>
            </label>
          </div>

          {quiz.mode === 'scheduled' && (
            <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap', background: 'var(--gray-50)', padding: 16, borderRadius: 'var(--radius-md)' }}>
              <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CalendarDays size={14} /> Waktu Buka</label>
                <input type="datetime-local" className="form-input" value={schedOpen} onChange={(e) => { setSchedOpen(e.target.value); if (e.target.value) onAutoSave({ scheduledOpen: new Date(e.target.value).toISOString() }); }} />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CalendarDays size={14} /> Waktu Tutup</label>
                <input type="datetime-local" className="form-input" value={schedClose} onChange={(e) => { setSchedClose(e.target.value); if (e.target.value) onAutoSave({ scheduledClose: new Date(e.target.value).toISOString() }); }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Backtrack toggle */}
      <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: quiz.mode === 'live' ? 0.6 : 1 }}>
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Izinkan Kembali ke Soal Sebelumnya</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{quiz.mode === 'live' ? 'Live quiz selalu tidak bisa kembali ke soal sebelumnya.' : 'Jika dimatikan, siswa hanya bisa maju ke soal berikutnya.'}</p>
        </div>
        <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: quiz.mode === 'live' ? 'not-allowed' : 'pointer' }} title={quiz.mode === 'live' ? 'Live quiz selalu tidak bisa kembali ke soal sebelumnya' : ''}>
          <input type="checkbox" checked={quiz.mode === 'live' ? false : (quiz.allowBacktrack !== false)} disabled={quiz.mode === 'live'} onChange={(e) => onAutoSave({ allowBacktrack: e.target.checked })} style={{ display: 'none' }} />
          <span style={{ position: 'absolute', inset: 0, borderRadius: 24, background: (quiz.mode === 'live' ? false : (quiz.allowBacktrack !== false)) ? 'var(--primary-500)' : 'var(--gray-300)', transition: 'background 0.2s' }}>
            <span style={{ position: 'absolute', top: 2, left: (quiz.mode === 'live' ? false : (quiz.allowBacktrack !== false)) ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
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
          <input type="checkbox" checked={quiz.shuffleQuestions || false} onChange={(e) => onAutoSave({ shuffleQuestions: e.target.checked })} style={{ display: 'none' }} />
          <span style={{ position: 'absolute', inset: 0, borderRadius: 24, background: quiz.shuffleQuestions ? 'var(--primary-500)' : 'var(--gray-300)', transition: 'background 0.2s' }}>
            <span style={{ position: 'absolute', top: 2, left: quiz.shuffleQuestions ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
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
          <input type="checkbox" checked={quiz.shuffleOptions || false} onChange={(e) => onAutoSave({ shuffleOptions: e.target.checked })} style={{ display: 'none' }} />
          <span style={{ position: 'absolute', inset: 0, borderRadius: 24, background: quiz.shuffleOptions ? 'var(--primary-500)' : 'var(--gray-300)', transition: 'background 0.2s' }}>
            <span style={{ position: 'absolute', top: 2, left: quiz.shuffleOptions ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
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
          <input type="checkbox" checked={quiz.showAnswerKey || false} onChange={(e) => onAutoSave({ showAnswerKey: e.target.checked })} style={{ display: 'none' }} />
          <span style={{ position: 'absolute', inset: 0, borderRadius: 24, background: quiz.showAnswerKey ? 'var(--primary-500)' : 'var(--gray-300)', transition: 'background 0.2s' }}>
            <span style={{ position: 'absolute', top: 2, left: quiz.showAnswerKey ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
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
  );
}
