import { useEffect, useState } from 'react';
import api from '../api/client';
import { Bell, Check, Clock, BookOpen, FileQuestion, UserPlus, UserCheck, UserMinus } from 'lucide-react';
import { toErrorMessage } from '../utils/errors';
import ErrorBanner from '../components/ErrorBanner';
import Spinner from '../components/Spinner';

const typeIcons: Record<string, any> = {
  join_approved: Check,
  join_rejected: Clock,
  quiz_new: FileQuestion,
  quiz_open: BookOpen,
  quiz_closed: Clock,
  quiz_result: Check,
  live_quiz: FileQuestion,
  co_teacher_invite: UserPlus,
  co_teacher_accepted: UserCheck,
  co_teacher_rejected: UserMinus,
};

const typeColors: Record<string, string> = {
  join_approved: 'var(--primary-100)',
  quiz_new: 'var(--blue-100)',
  quiz_open: 'var(--primary-100)',
  quiz_closed: 'var(--red-100)',
  quiz_result: 'var(--yellow-100)',
  live_quiz: 'var(--orange-100)',
  co_teacher_invite: 'var(--blue-100)',
  co_teacher_accepted: 'var(--primary-100)',
  co_teacher_rejected: 'var(--red-100)',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);



  useEffect(() => {
    const fetch = async () => {
      try {
        setError(null);
        const { data } = await api.get('/notifications');
        setNotifications(data.notifications || []);
      } catch (e: any) {
        setError(toErrorMessage(e));
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const markRead = async (id: string) => {
    try {
      setError(null);
      await api.post(`/notifications/${id}/read`);
      setNotifications((n) => n.map((x) => x._id === id ? { ...x, isRead: true } : x));
    } catch (e: any) {
      setError(toErrorMessage(e));
    }
  };

  const handleInviteAction = async (classId: string, action: 'accept' | 'reject', e: React.MouseEvent) => {
    e.stopPropagation(); // prevent clicking notification
    try {
      setError(null);
      await api.post(`/classes/${classId}/co-teachers/${action}`);
      // Refetch notifications to get updated state
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications || []);
    } catch (err: any) {
      setError(toErrorMessage(err));
    }
  };

  if (loading) return <div className="loading-page"><Spinner size={32} /></div>;

  return (
    <div>
      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      <div className="page-header">
        <h1><Bell size={28} /> Notifikasi</h1>
      </div>

      {notifications.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Bell size={36} /></div>
            <h3>Belum ada notifikasi</h3>
            <p>Notifikasi akan muncul di sini.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map((n, i) => {
            const Icon = typeIcons[n.type] || Bell;
            return (
              <div
                key={n._id}
                className="card stagger-item"
                style={{
                  animationDelay: `${0.05 * i}s`,
                  opacity: n.isRead ? 0.7 : 1,
                  cursor: n.isRead ? 'default' : 'pointer',
                }}
                onClick={() => !n.isRead && markRead(n._id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', gap: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 'var(--radius-md)',
                    background: typeColors[n.type] || 'var(--gray-100)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                      {!n.isRead && <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: 'var(--primary-500)', display: 'inline-block',
                        marginRight: 8,
                      }} />}
                      {n.title}
                    </p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{n.message}</p>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                    {new Date(n.createdAt).toLocaleDateString('id-ID')}
                  </span>
                </div>
                {n.type === 'co_teacher_invite' && !n.isRead && n.classId && (
                  <div style={{ padding: '0 20px 14px 76px', display: 'flex', gap: 8 }}>
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={(e) => handleInviteAction(n.classId, 'accept', e)}
                    >
                      Terima
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={(e) => handleInviteAction(n.classId, 'reject', e)}
                    >
                      Tolak
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
