import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { ArrowLeft, Radio, Play, X, Trophy, Users, Copy, Check, Hash, Clock } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { toErrorMessage } from '../utils/errors';
import ConfirmModal from '../components/ConfirmModal';
import ErrorBanner from '../components/ErrorBanner';
import Spinner from '../components/Spinner';

type LiveState = 'setup' | 'lobby' | 'active' | 'finished';

interface Participant {
  userId: string;
  displayName: string;
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
  const [error, setError] = useState<string | null>(null);



  // Session state
  const [state, setState] = useState<LiveState>('setup');
  const [pin, setPin] = useState('');
  const [pinCopied, setPinCopied] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Live progress state
  const [finishedCount, setFinishedCount] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const elapsedRef = useRef(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [liveLeaderboard, setLiveLeaderboard] = useState<LeaderboardEntry[]>([]);

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
  const [answeredCounts, setAnsweredCounts] = useState<Record<string, number>>({});
  const [totalQuestions, setTotalQuestions] = useState(0);

  // Track if start_quiz already fired
  const startedRef = useRef(false);

  // ── Load quiz data ───────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const { data } = await api.get(`/quizzes/${quizId}`);
        setQuiz(data.quiz);

        if (data.quiz.status === 'finished') {
          const lbRes = await api.get(`/quizzes/${quizId}/live/leaderboard`).catch(() => null);
          if (lbRes?.data?.leaderboard) {
            setLeaderboard(lbRes.data.leaderboard);
            setState('finished');
          }
        }

        // If quiz already has an active session, try to resume
        if (data.quiz.status === 'waiting' || data.quiz.status === 'in_progress') {
          const sessionRes = await api.get(`/quizzes/${quizId}/live/participants`).catch(() => null);
          if (sessionRes?.data?.pin) {
            setPin(sessionRes.data.pin);
            setParticipants(sessionRes.data.participants || []);
            setState(data.quiz.status === 'waiting' ? 'lobby' : 'active');
          }
        }
      } catch (e: any) {
        setError(toErrorMessage(e));
      }
      setLoading(false);
    };
    load();
  }, [quizId]);

  const handleRefreshParticipants = async () => {
    if (!pin) return;
    try {
      setError(null);
      const { data } = await api.get(`/quizzes/${quizId}/live/participants`);
      if (data?.pin) setPin(data.pin);
      setParticipants(data.participants || []);
    } catch (e: any) {
      setError(toErrorMessage(e));
    }
  };

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

    const onParticipantLeft = (_data: any) => {
      // Just update count, participant list will be refreshed
    };

    const onQuizStarted = (data: any) => {
      setState('active');
      setFinishedCount(0);
      const dur = data.totalDurationSec || 0;
      setTotalDuration(dur);
      elapsedRef.current = 0;
      setElapsedSec(0);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsedSec(elapsedRef.current);
      }, 1000);
    };

    const onStudentFinished = (data: { finishCount: number; total: number; displayName: string }) => {
      setFinishedCount(data.finishCount);
    };

    const onLeaderboardUpdate = (data: { leaderboard: LeaderboardEntry[]; answeredCounts: Record<string, number>; totalQuestions: number }) => {
      setLiveLeaderboard(data.leaderboard);
      setAnsweredCounts(data.answeredCounts);
      setTotalQuestions(data.totalQuestions);
    };

    const onQuizEnded = (data: { leaderboard: LeaderboardEntry[] }) => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setLeaderboard(data.leaderboard);
      setState('finished');
    };

    socket.on('session_info', onSessionInfo);
    socket.on('participant_joined', onParticipantJoined);
    socket.on('participant_left', onParticipantLeft);
    socket.on('quiz_started', onQuizStarted);
    socket.on('student_finished', onStudentFinished);
    socket.on('leaderboard_update', onLeaderboardUpdate);
    socket.on('quiz_ended', onQuizEnded);

    return () => {
      socket.off('session_info', onSessionInfo);
      socket.off('participant_joined', onParticipantJoined);
      socket.off('participant_left', onParticipantLeft);
      socket.off('quiz_started', onQuizStarted);
      socket.off('student_finished', onStudentFinished);
      socket.off('leaderboard_update', onLeaderboardUpdate);
      socket.off('quiz_ended', onQuizEnded);
    };
  }, [socket, connected, pin]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleCreateSession = async () => {
    setActionLoading(true);
    try {
      setError(null);
      const { data } = await api.post(`/quizzes/${quizId}/live/start`);
      setPin(data.pin);
      setState('lobby');
    } catch (e: any) {
      setError(toErrorMessage(e));
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

  const handleForceEnd = () => {
    if (!socket || !pin) return;
    setConfirmModal({
      open: true,
      title: 'Akhiri Kuis',
      message: 'Akhiri kuis sekarang? Semua siswa yang belum selesai akan dinilai berdasarkan jawaban yang sudah dikumpulkan.',
      confirmLabel: 'Akhiri',
      variant: 'danger',
      onConfirm: () => {
        closeConfirm();
        socket.emit('force_end', { pin });
      },
    });
  };

  const handleCancel = async () => {
    setConfirmModal({
      open: true,
      title: 'Batalkan Live Quiz',
      message: 'Batalkan sesi live quiz ini? Semua peserta akan dikeluarkan.',
      confirmLabel: 'Batalkan',
      variant: 'danger',
      onConfirm: async () => {
        closeConfirm();
        try {
          setError(null);
          await api.post(`/quizzes/${quizId}/live/cancel`);
          setState('setup');
          setPin('');
          setParticipants([]);
          startedRef.current = false;
        } catch (e: any) {
          setError(toErrorMessage(e));
        }
      },
    });
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
  if (loading) return <div className="loading-page"><Spinner size={32} /></div>;
  if (!quiz) return <div>Kuis tidak ditemukan</div>;

  return (
    <div>
      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Kembali
      </button>

      {(state === 'lobby' || state === 'active') && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--yellow-50)', border: '1px solid var(--yellow-200)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Radio size={18} color="var(--yellow-600)" />
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--yellow-800)', lineHeight: 1.4 }}>
            <b>Sesi live sedang berjalan.</b> Jangan menutup atau memuat ulang halaman ini agar koneksi tetap terjaga.
          </p>
        </div>
      )}

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
              <button className="btn btn-ghost btn-sm" onClick={handleRefreshParticipants} style={{ marginLeft: 8 }}>
                Refresh Peserta
              </button>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: 12 }}>
                Siswa masukkan PIN ini di aplikasi untuk bergabung
              </p>
            </div>

            {/* Participant Count */}
            <div className="participant-counter">
              <div key={participants.length} className="participant-count number-flip">{participants.length}</div>
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
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
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

        {/* ── ACTIVE (Live Progress Dashboard) ────────────────────────────── */}
        {state === 'active' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            {/* Timer */}
            <div style={{
              background: 'var(--primary-50)',
              borderRadius: 'var(--radius-xl)',
              padding: '32px',
              marginBottom: 24,
              border: '2px dashed var(--primary-300)',
            }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Clock size={14} style={{ verticalAlign: -2 }} /> Waktu Berjalan
              </p>
              <div style={{
                fontSize: '3rem',
                fontWeight: 900,
                fontFamily: 'monospace',
                color: elapsedSec >= totalDuration ? 'var(--red-500)' : 'var(--primary-600)',
                letterSpacing: '0.1em',
                lineHeight: 1,
                marginBottom: 12,
              }}>
                {Math.floor(elapsedSec / 60).toString().padStart(2, '0')}:{(elapsedSec % 60).toString().padStart(2, '0')} / {Math.floor(totalDuration / 60).toString().padStart(2, '0')}:{(totalDuration % 60).toString().padStart(2, '0')}
              </div>
              <div style={{
                width: '100%',
                height: 8,
                background: 'var(--primary-100)',
                borderRadius: 4,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${Math.min(100, (elapsedSec / Math.max(1, totalDuration)) * 100)}%`,
                  height: '100%',
                  background: elapsedSec >= totalDuration ? 'var(--red-500)' : 'var(--primary-500)',
                  borderRadius: 4,
                  transition: 'width 1s linear',
                }} />
              </div>
            </div>

            {/* Progress */}
            <div className="participant-counter">
              <div key={finishedCount} className="participant-count number-flip">{finishedCount}</div>
              <p>dari {participants.length} siswa sudah selesai</p>
            </div>

            {/* Finished students */}
            {finishedCount > 0 && (
              <div style={{ marginTop: 16, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <p>⏳ {participants.length - finishedCount} siswa masih mengerjakan...</p>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
              <button className="btn btn-danger" onClick={handleForceEnd}>
                <X size={18} /> Akhiri Kuis Sekarang
              </button>
            </div>

            {/* Live Leaderboard */}
            {liveLeaderboard.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: '1rem' }}>
                  <Trophy size={18} /> Leaderboard Live
                </h4>
                <div className="table-responsive">
                <table className="leaderboard-table" style={{ fontSize: '0.875rem' }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nama</th>
                      <th>Skor</th>
                      <th>Terjawab</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveLeaderboard.map((entry, i) => (
                      <tr key={entry.rank} className={`stagger-item ${entry.rank <= 3 ? `rank-${entry.rank}` : ''}`} style={{ animationDelay: `${0.05 * i}s` }}>
                        <td className="rank-cell">{getMedal(entry.rank)}</td>
                        <td style={{ fontWeight: 600 }}>{entry.displayName}</td>
                        <td><span className="badge badge-green">{entry.score} pts</span></td>
                        <td style={{ color: 'var(--text-tertiary)' }}>
                          {answeredCounts[entry.userId] || 0} / {totalQuestions}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
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
              <div className="table-responsive">
              <table className="leaderboard-table">
                <thead>
                  <tr><th>Peringkat</th><th>Nama</th><th>Skor</th><th>Waktu</th></tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => (
                    <tr key={entry.rank} className={`stagger-item ${entry.rank <= 3 ? `rank-${entry.rank}` : ''}`} style={{ animationDelay: `${0.05 * i}s` }}>
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
              </div>
            )}
          </div>
        )}
      </div>

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
