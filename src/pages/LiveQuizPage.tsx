import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { ArrowLeft, Radio, Play, X, Trophy } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

type LiveState = 'setup' | 'waiting' | 'active' | 'finished';

export default function LiveQuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<any>(null);
  const [state, setState] = useState<LiveState>('setup');
  const [participantCount, setParticipantCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { socket, connected } = useSocket();

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/quizzes/${quizId}`);
        setQuiz(data.quiz);
        // If quiz is already in a live state, resume
        if (data.quiz.status === 'waiting') setState('waiting');
        else if (data.quiz.status === 'in_progress') setState('active');
        else if (data.quiz.status === 'finished') setState('finished');
      } catch {}
      setLoading(false);
    };
    load();
  }, [quizId]);

  // Socket.IO real-time events
  useEffect(() => {
    if (socket && connected && quizId) {
      socket.emit('join:quiz', quizId);

      socket.on('live:participant_joined', (data: any) => {
        setParticipantCount(data.count);
      });

      socket.on('live:leaderboard_update', async () => {
        try {
          const { data } = await api.get(`/quizzes/${quizId}/live/leaderboard`);
          setLeaderboard(data.leaderboard || []);
        } catch {}
      });

      return () => {
        socket.emit('leave:quiz', quizId);
        socket.off('live:participant_joined');
        socket.off('live:leaderboard_update');
      };
    }
  }, [socket, connected, quizId]);

  // Fetch initial participants or leaderboard based on state
  useEffect(() => {
    if (state === 'waiting') {
      api.get(`/quizzes/${quizId}/live/participants`).then(({ data }) => {
        setParticipantCount(data.participantCount || 0);
      }).catch(() => {});
    } else if (state === 'active' || state === 'finished') {
      api.get(`/quizzes/${quizId}/live/leaderboard`).then(({ data }) => {
        setLeaderboard(data.leaderboard || []);
      }).catch(() => {});
    }
  }, [state, quizId]);

  const handleStart = async () => {
    setActionLoading(true);
    try {
      await api.post(`/quizzes/${quizId}/live/start`);
      setState('waiting');
    } catch {}
    setActionLoading(false);
  };

  const handleBegin = async () => {
    setActionLoading(true);
    try {
      await api.post(`/quizzes/${quizId}/live/begin`);
      setState('active');
    } catch {}
    setActionLoading(false);
  };

  const handleCancel = async () => {
    if (!confirm('Batalkan live quiz?')) return;
    try {
      await api.post(`/quizzes/${quizId}/live/cancel`);
      setState('setup');
    } catch {}
  };

  const getMedal = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

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
          <div>
            <h2>{quiz.title}</h2>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
              ⏱ {quiz.duration} menit • Mode Live Quiz
            </p>
          </div>
        </div>

        {/* Setup State */}
        {state === 'setup' && (
          <div className="live-setup">
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-state-icon"><Radio size={36} /></div>
              <h3>Mulai Live Quiz</h3>
              <p>Siswa akan menerima notifikasi dan masuk ke waiting room.</p>
              <button className="btn btn-primary btn-lg" onClick={handleStart} disabled={actionLoading}>
                <Play size={20} /> {actionLoading ? 'Memulai...' : 'Mulai Live Quiz'}
              </button>
            </div>
          </div>
        )}

        {/* Waiting Room */}
        {state === 'waiting' && (
          <div className="waiting-room">
            <div className="participant-counter">
              <div className="participant-count">{participantCount}</div>
              <p>peserta siap</p>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
              <button className="btn btn-primary btn-lg" onClick={handleBegin} disabled={actionLoading || participantCount === 0}>
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

        {/* Active / Finished */}
        {(state === 'active' || state === 'finished') && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trophy size={20} /> Leaderboard
                {state === 'active' && <span className="badge badge-green">● Berlangsung</span>}
                {state === 'finished' && <span className="badge badge-purple">Selesai</span>}
              </h3>
              {state === 'active' && (
                <button className="btn btn-danger btn-sm" onClick={handleCancel}>
                  <X size={14} /> Batalkan
                </button>
              )}
            </div>
            {leaderboard.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 40 }}>
                Belum ada jawaban yang masuk...
              </p>
            ) : (
              <table className="leaderboard-table">
                <thead>
                  <tr><th>Peringkat</th><th>Nama</th><th>Skor</th><th>Waktu Selesai</th></tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr key={entry.rank} className={entry.rank <= 3 ? `rank-${entry.rank}` : ''}>
                      <td className="rank-cell">{getMedal(entry.rank)}</td>
                      <td style={{ fontWeight: 600 }}>{(entry.user as any)?.name || 'Siswa'}</td>
                      <td><span className="badge badge-green">{entry.score}/{entry.totalPoints}</span></td>
                      <td style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                        {entry.submittedAt ? new Date(entry.submittedAt).toLocaleTimeString('id-ID') : '–'}
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
