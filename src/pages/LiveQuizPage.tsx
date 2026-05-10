import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { ArrowLeft, Radio, Play, X, Trophy, Users, Copy, Check, ChevronRight, Hash } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

type LiveState = 'setup' | 'lobby' | 'active' | 'result' | 'finished';

interface Participant {
  userId: string;
  displayName: string;
}

interface QuestionPayload {
  questionIndex: number;
  question: {
    _id: string;
    text: string;
    type: string;
    points: number;
    options: { text: string }[];
  };
  timeLimit: number;
  totalQuestions: number;
}

interface QuestionResult {
  questionIndex: number;
  correctAnswer: string;
  stats: {
    totalAnswered: number;
    correctCount: number;
    wrongCount: number;
  };
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
  totalTime: number;
}

export default function LiveQuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();

  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Session state
  const [state, setState] = useState<LiveState>('setup');
  const [pin, setPin] = useState('');
  const [pinCopied, setPinCopied] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Question state
  const [currentQuestion, setCurrentQuestion] = useState<QuestionPayload | null>(null);
  const [answerCount, setAnswerCount] = useState(0);
  const [lastResult, setLastResult] = useState<QuestionResult | null>(null);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Track if start_quiz already fired
  const startedRef = useRef(false);

  // ── Load quiz data ───────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/quizzes/${quizId}`);
        setQuiz(data.quiz);
        // If quiz already has an active session, try to resume
        if (data.quiz.status === 'waiting' || data.quiz.status === 'in_progress') {
          const sessionRes = await api.get(`/quizzes/${quizId}/live/participants`).catch(() => null);
          if (sessionRes?.data?.pin) {
            setPin(sessionRes.data.pin);
            setParticipants(sessionRes.data.participants || []);
            setState(data.quiz.status === 'waiting' ? 'lobby' : 'active');
          }
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [quizId]);

  // ── Socket event listeners ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !connected || !pin) return;

    // Teacher joins the live room
    socket.emit('teacher_ready', { pin });

    const onSessionInfo = (data: any) => {
      setParticipants(data.participants || []);
    };

    const onParticipantJoined = (data: any) => {
      setParticipants(data.participants || []);
    };

    const onParticipantLeft = (data: any) => {
      // Just update count, participant list will be refreshed
    };

    const onQuizStarted = (data: QuestionPayload) => {
      setState('active');
      setCurrentQuestion(data);
      setAnswerCount(0);
      setLastResult(null);
    };

    const onQuestionStart = (data: QuestionPayload) => {
      setState('active');
      setCurrentQuestion(data);
      setAnswerCount(0);
      setLastResult(null);
    };

    const onAnswerCountUpdate = (data: { questionIndex: number; count: number; total: number }) => {
      setAnswerCount(data.count);
    };

    const onQuestionResult = (data: QuestionResult) => {
      setLastResult(data);
      setState('result');
    };

    const onQuizEnded = (data: { leaderboard: LeaderboardEntry[] }) => {
      setLeaderboard(data.leaderboard);
      setState('finished');
    };

    socket.on('session_info', onSessionInfo);
    socket.on('participant_joined', onParticipantJoined);
    socket.on('participant_left', onParticipantLeft);
    socket.on('quiz_started', onQuizStarted);
    socket.on('question_start', onQuestionStart);
    socket.on('answer_count_update', onAnswerCountUpdate);
    socket.on('question_result', onQuestionResult);
    socket.on('quiz_ended', onQuizEnded);

    return () => {
      socket.off('session_info', onSessionInfo);
      socket.off('participant_joined', onParticipantJoined);
      socket.off('participant_left', onParticipantLeft);
      socket.off('quiz_started', onQuizStarted);
      socket.off('question_start', onQuestionStart);
      socket.off('answer_count_update', onAnswerCountUpdate);
      socket.off('question_result', onQuestionResult);
      socket.off('quiz_ended', onQuizEnded);
    };
  }, [socket, connected, pin]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleCreateSession = async () => {
    setActionLoading(true);
    try {
      const { data } = await api.post(`/quizzes/${quizId}/live/start`);
      setPin(data.pin);
      setState('lobby');
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to create session');
    }
    setActionLoading(false);
  };

  const handleStartQuiz = () => {
    if (!socket || !pin || startedRef.current) return;
    startedRef.current = true;
    setActionLoading(true);
    socket.emit('start_quiz', { pin });
    // State will be updated by quiz_started event
    setTimeout(() => setActionLoading(false), 1000);
  };

  const handleNextQuestion = () => {
    if (!socket || !pin) return;
    socket.emit('next_question', { pin });
    setLastResult(null);
  };

  const handleCancel = async () => {
    if (!confirm('Batalkan live quiz?')) return;
    try {
      await api.post(`/quizzes/${quizId}/live/cancel`);
      setState('setup');
      setPin('');
      setParticipants([]);
      startedRef.current = false;
    } catch {}
  };

  const handleCopyPin = () => {
    navigator.clipboard.writeText(pin);
    setPinCopied(true);
    setTimeout(() => setPinCopied(false), 2000);
  };

  const getMedal = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!quiz) return <div>Kuis tidak ditemukan</div>;

  return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Kembali
      </button>

      <div className="live-panel">
        {/* Header */}
        <div className="live-header">
          <Radio size={24} className={state !== 'setup' ? 'live-pulse' : ''} />
          <div style={{ flex: 1 }}>
            <h2>{quiz.title}</h2>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
              ⏱ {quiz.duration} menit • Mode Live Quiz
            </p>
          </div>
          {pin && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PIN</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--primary-600)', letterSpacing: '0.15em' }}>{pin}</div>
            </div>
          )}
        </div>

        {/* ── SETUP ──────────────────────────────────────────────────────── */}
        {state === 'setup' && (
          <div className="live-setup">
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-state-icon"><Radio size={36} /></div>
              <h3>Mulai Live Quiz</h3>
              <p>Buat sesi dan bagikan PIN ke siswa untuk bergabung.</p>
              <button className="btn btn-primary btn-lg" onClick={handleCreateSession} disabled={actionLoading}>
                <Play size={20} /> {actionLoading ? 'Membuat sesi...' : 'Buat Sesi Live'}
              </button>
            </div>
          </div>
        )}

        {/* ── LOBBY ──────────────────────────────────────────────────────── */}
        {state === 'lobby' && (
          <div style={{ textAlign: 'center' }}>
            {/* PIN Display */}
            <div style={{
              background: 'var(--primary-50)',
              borderRadius: 'var(--radius-xl)',
              padding: '32px',
              marginBottom: 24,
              border: '2px dashed var(--primary-300)',
            }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Hash size={14} style={{ verticalAlign: -2 }} /> Kode PIN
              </p>
              <div style={{
                fontSize: '3.5rem',
                fontWeight: 900,
                fontFamily: 'monospace',
                color: 'var(--primary-600)',
                letterSpacing: '0.2em',
                lineHeight: 1,
                marginBottom: 12,
              }}>
                {pin}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleCopyPin}>
                {pinCopied ? <><Check size={14} /> Tersalin!</> : <><Copy size={14} /> Salin PIN</>}
              </button>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: 12 }}>
                Siswa masukkan PIN ini di aplikasi untuk bergabung
              </p>
            </div>

            {/* Participant Count */}
            <div className="participant-counter">
              <div className="participant-count">{participants.length}</div>
              <p>peserta siap</p>
            </div>

            {/* Participant List */}
            {participants.length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {participants.map((p) => (
                  <span key={p.userId} className="badge badge-green" style={{ padding: '6px 12px', fontSize: '0.8125rem' }}>
                    <Users size={12} /> {p.displayName}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleStartQuiz}
                disabled={actionLoading || participants.length === 0}
              >
                <Play size={20} /> {actionLoading ? 'Memulai...' : 'Mulai Kuis Sekarang'}
              </button>
              <button className="btn btn-danger" onClick={handleCancel}>
                <X size={18} /> Batalkan
              </button>
            </div>

            <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
              ⏳ Menunggu siswa bergabung... (terhubung secara live)
            </p>
          </div>
        )}

        {/* ── ACTIVE (Question Control) ──────────────────────────────────── */}
        {state === 'active' && currentQuestion && (
          <div>
            {/* Question info */}
            <div style={{
              background: 'var(--primary-50)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              marginBottom: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span className="badge badge-blue" style={{ fontSize: '0.875rem', padding: '6px 14px' }}>
                  Soal {currentQuestion.questionIndex + 1} / {currentQuestion.totalQuestions}
                </span>
                <span className="badge badge-green">
                  ● Berlangsung
                </span>
              </div>
              <h3 style={{ fontSize: '1.125rem', marginBottom: 12 }}>{currentQuestion.question.text}</h3>
              {currentQuestion.question.options.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {currentQuestion.question.options.map((opt, i) => (
                    <div key={i} style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--surface-card)',
                      border: '1px solid var(--border)',
                      fontSize: '0.9375rem',
                    }}>
                      <strong style={{ color: 'var(--primary-600)', marginRight: 8 }}>
                        {String.fromCharCode(65 + i)}.
                      </strong>
                      {opt.text}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Answer count + controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <Users size={14} style={{ verticalAlign: -2 }} /> {answerCount} / {participants.length} menjawab
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={handleNextQuestion}>
                  {currentQuestion.questionIndex + 1 >= currentQuestion.totalQuestions
                    ? <><Trophy size={16} /> Selesai &amp; Lihat Hasil</>
                    : <><ChevronRight size={16} /> Soal Selanjutnya</>
                  }
                </button>
                <button className="btn btn-danger btn-sm" onClick={handleCancel}>
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── RESULT (between questions) ──────────────────────────────────── */}
        {state === 'result' && lastResult && (
          <div style={{ textAlign: 'center', padding: '32px 20px' }}>
            <h3 style={{ marginBottom: 16 }}>📊 Hasil Soal {lastResult.questionIndex + 1}</h3>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 24 }}>
              <div style={{
                padding: '20px 32px',
                background: 'var(--primary-50)',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-600)' }}>
                  {lastResult.stats.correctCount}
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>Benar</p>
              </div>
              <div style={{
                padding: '20px 32px',
                background: 'var(--red-50)',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--red-500)' }}>
                  {lastResult.stats.wrongCount}
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>Salah</p>
              </div>
            </div>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              Jawaban benar: <strong>{lastResult.correctAnswer}</strong>
            </p>
            <button className="btn btn-primary btn-lg" onClick={handleNextQuestion}>
              {currentQuestion && currentQuestion.questionIndex + 1 >= currentQuestion.totalQuestions
                ? <><Trophy size={18} /> Selesai &amp; Lihat Hasil</>
                : <><ChevronRight size={18} /> Soal Selanjutnya</>
              }
            </button>
          </div>
        )}

        {/* ── FINISHED (Leaderboard) ─────────────────────────────────────── */}
        {state === 'finished' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trophy size={20} /> Leaderboard
                <span className="badge badge-purple">Selesai</span>
              </h3>
            </div>
            {leaderboard.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 40 }}>
                Belum ada data...
              </p>
            ) : (
              <table className="leaderboard-table">
                <thead>
                  <tr><th>Peringkat</th><th>Nama</th><th>Skor</th><th>Waktu</th></tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr key={entry.rank} className={entry.rank <= 3 ? `rank-${entry.rank}` : ''}>
                      <td className="rank-cell">{getMedal(entry.rank)}</td>
                      <td style={{ fontWeight: 600 }}>{entry.displayName}</td>
                      <td><span className="badge badge-green">{entry.score} pts</span></td>
                      <td style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                        {(entry.totalTime / 1000).toFixed(1)}s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
