import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Users, FileQuestion, TrendingUp, Clock, Plus, Bell } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ classCount: 0, quizCount: 0, studentCount: 0, pendingCount: 0 });
  const [recentAttempts, setRecentAttempts] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get('/dashboard/stats');
        setStats(data.stats || { classCount: 0, quizCount: 0, studentCount: 0, pendingCount: 0 });
        setRecentAttempts(data.recentAttempts || []);
        setChartData(data.quizCountPerClass || []);
      } catch {
        // Fallback: fetch classes directly
        try {
          const { data } = await api.get('/classes');
          const classes = data.classes || [];
          setStats((s) => ({ ...s, classCount: classes.length }));
        } catch {}
      }

    };
    fetchData();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Selamat Pagi' : hour < 17 ? 'Selamat Siang' : 'Selamat Malam';

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{
        background: 'var(--primary-400)',
        borderRadius: 'var(--radius-xl)', padding: '32px 36px', color: 'white',
        marginBottom: 28, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 200, height: 200, background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -40, width: 140, height: 140, background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
        <p style={{ opacity: 0.9, fontSize: '0.9375rem', marginBottom: 4 }}>{greeting},</p>
        <h1 style={{ color: 'white', fontSize: '1.75rem', marginBottom: 6 }}>{user?.name} 👋</h1>
        <p style={{ opacity: 0.85, fontSize: '0.9375rem' }}>Kelola kelas dan kuis Anda dari sini.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green"><GraduationCap size={24} /></div>
          <div className="stat-info"><h4>{stats.classCount}</h4><p>Total Kelas</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><FileQuestion size={24} /></div>
          <div className="stat-info"><h4>{stats.quizCount}</h4><p>Total Kuis</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><Users size={24} /></div>
          <div className="stat-info"><h4>{stats.studentCount}</h4><p>Total Siswa</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><TrendingUp size={24} /></div>
          <div className="stat-info"><h4>{stats.pendingCount}</h4><p>Menunggu Persetujuan</p></div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid-2" style={{ marginBottom: 28 }}>
        <div className="card card-clickable" onClick={() => navigate('/classes')} style={{ cursor: 'pointer' }}>
          <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="stat-icon green" style={{ width: 48, height: 48 }}><Plus size={24} /></div>
            <div><h4 style={{ fontSize: '0.9375rem' }}>Buat Kelas Baru</h4><p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>Mulai kelas dan tambah siswa</p></div>
          </div>
        </div>
        <div className="card card-clickable" onClick={() => navigate('/notifications')} style={{ cursor: 'pointer' }}>
          <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="stat-icon orange" style={{ width: 48, height: 48 }}><Bell size={24} /></div>
            <div><h4 style={{ fontSize: '0.9375rem' }}>Notifikasi</h4><p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>Lihat pemberitahuan terbaru</p></div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24 }}>
        {/* Chart */}
        <div className="card">
          <div className="card-header"><h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileQuestion size={20} /> Kuis per Kelas</h3></div>
          <div className="card-body">
            {chartData.length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}><p>Belum ada data.</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="className" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="quizCount" fill="var(--primary-400)" radius={[6, 6, 0, 0]} name="Jumlah Kuis" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Attempts */}
        <div className="card">
          <div className="card-header"><h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={20} /> Pengerjaan Terbaru</h3></div>
          <div className="card-body">
            {recentAttempts.length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}><p>Belum ada pengerjaan.</p></div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Siswa</th><th>Kuis</th><th>Skor</th></tr></thead>
                <tbody>
                  {recentAttempts.map((a: any) => (
                    <tr key={a._id}>
                      <td style={{ fontWeight: 600 }}>{(a.userId as any)?.name || '–'}</td>
                      <td style={{ fontSize: '0.875rem' }}>{(a.quizId as any)?.title || '–'}</td>
                      <td><span className="badge badge-green">{a.score ?? 0}/{a.totalPoints ?? 0}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
