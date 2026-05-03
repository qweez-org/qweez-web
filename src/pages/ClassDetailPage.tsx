import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import {
  BookOpen, Users, Clock, Plus, X, Check, XCircle,
  ArrowLeft, ChevronRight, Trash2, Copy, ClipboardList, Download
} from 'lucide-react';

export default function ClassDetailPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [classData, setClassData] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [activeTab, setActiveTab] = useState('topics');
  const [topics, setTopics] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Topic creation
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [topicName, setTopicName] = useState('');

  const fetchClass = async () => {
    try {
      const { data } = await api.get(`/classes/${classId}`);
      setClassData(data.class);
      setStats(data.stats);
    } catch {}
  };

  const fetchTopics = async () => {
    try {
      const { data } = await api.get(`/classes/topics/${classId}`);
      setTopics(data.topics || []);
    } catch {}
  };

  const fetchMembers = async () => {
    try {
      const { data } = await api.get(`/classes/members/${classId}`);
      setMembers(data.members || []);
    } catch {}
  };

  const fetchJoinRequests = async () => {
    try {
      const { data } = await api.get(`/classes/join-requests/${classId}`);
      setJoinRequests(data.joinRequests?.filter((r: any) => r.status === 'pending') || []);
    } catch {}
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchClass(), fetchTopics(), fetchMembers(), fetchJoinRequests()]);
      setLoading(false);
    };
    load();
  }, [classId]);

  const handleAddTopic = async () => {
    if (!topicName.trim()) return;
    try {
      await api.post(`/classes/topics/${classId}`, { name: topicName });
      setTopicName('');
      setShowAddTopic(false);
      fetchTopics();
    } catch {}
  };

  const handleApprove = async (requestId: string) => {
    try {
      await api.post(`/classes/join-requests/${classId}/approve/${requestId}`);
      fetchJoinRequests();
      fetchMembers();
      fetchClass();
    } catch {}
  };

  const handleReject = async (requestId: string) => {
    try {
      await api.post(`/classes/join-requests/${classId}/reject/${requestId}`);
      fetchJoinRequests();
      fetchClass();
    } catch {}
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Keluarkan anggota ini?')) return;
    try {
      await api.delete(`/classes/members/${classId}/${memberId}`);
      fetchMembers();
    } catch {}
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!classData) return <div>Kelas tidak ditemukan</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }} onClick={() => navigate('/classes')}>
          <ArrowLeft size={16} /> Kembali ke Kelas
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ marginBottom: 4 }}>{classData.name}</h1>
            {classData.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>{classData.description}</p>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              api.get(`/export/classes/${classId}/export/grades`, { responseType: 'blob' }).then(({ data }) => {
                const url = window.URL.createObjectURL(new Blob([data]));
                const a = document.createElement('a'); a.href = url; a.download = `gradebook-${classId}.csv`; a.click();
                window.URL.revokeObjectURL(url);
              }).catch(() => {});
            }}>
              <Download size={14} /> Export Nilai
            </button>
            <span className="class-card-code" style={{ fontSize: '1rem', padding: '6px 14px' }}>{classData.code}</span>
            <button className="btn btn-ghost btn-icon" onClick={() => navigator.clipboard.writeText(classData.code)} title="Salin kode">
              <Copy size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green"><BookOpen size={22} /></div>
          <div className="stat-info"><h4>{stats.topicCount || 0}</h4><p>Topik</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><Users size={22} /></div>
          <div className="stat-info"><h4>{stats.memberCount || 0}</h4><p>Siswa</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><Clock size={22} /></div>
          <div className="stat-info"><h4>{stats.pendingCount || 0}</h4><p>Menunggu</p></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'topics' ? 'active' : ''}`} onClick={() => setActiveTab('topics')}>
          <BookOpen size={16} style={{ marginRight: 6, verticalAlign: -3 }} /> Topik
        </button>
        <button className={`tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
          <Users size={16} style={{ marginRight: 6, verticalAlign: -3 }} /> Anggota
        </button>
        <button className={`tab ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
          <Clock size={16} style={{ marginRight: 6, verticalAlign: -3 }} /> Permintaan
          {joinRequests.length > 0 && <span className="sidebar-badge" style={{ marginLeft: 6 }}>{joinRequests.length}</span>}
        </button>
        <button className={`tab ${activeTab === 'grades' ? 'active' : ''}`} onClick={() => navigate(`/classes/${classId}/grades`)}>
          <ClipboardList size={16} style={{ marginRight: 6, verticalAlign: -3 }} /> Nilai
        </button>
      </div>

      {/* Tab: Topics */}
      {activeTab === 'topics' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddTopic(true)}>
              <Plus size={16} /> Tambah Topik
            </button>
          </div>

          {topics.length === 0 ? (
            <div className="card">
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-state-icon"><BookOpen size={36} /></div>
                <h3>Belum ada topik</h3>
                <p>Buat topik untuk mulai menambahkan kuis.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topics.map((topic) => (
                <div key={topic._id} className="card card-clickable" onClick={() => navigate(`/classes/${classId}/topics/${topic._id}`)} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: 14 }}>
                    <div className="stat-icon green" style={{ width: 42, height: 42 }}>
                      <BookOpen size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{topic.name}</h4>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                        {topic.quizCount || 0} kuis
                      </p>
                    </div>
                    <ChevronRight size={20} color="var(--text-tertiary)" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Topic Modal */}
          {showAddTopic && (
            <div className="modal-overlay" onClick={() => setShowAddTopic(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Tambah Topik</h2>
                  <button className="btn btn-ghost btn-icon" onClick={() => setShowAddTopic(false)}><X size={20} /></button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Nama Topik</label>
                    <input className="form-input" placeholder="contoh: Matematika" value={topicName} onChange={(e) => setTopicName(e.target.value)} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowAddTopic(false)}>Batal</button>
                  <button className="btn btn-primary" onClick={handleAddTopic} disabled={!topicName.trim()}>Tambah</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Members */}
      {activeTab === 'members' && (
        <div className="card">
          {members.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-state-icon"><Users size={36} /></div>
              <h3>Belum ada anggota</h3>
              <p>Bagikan kode kelas untuk mengundang siswa.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th></th></tr></thead>
              <tbody>
                {members.map((m: any) => (
                  <tr key={m._id}>
                    <td style={{ fontWeight: 600 }}>{(m.userId as any)?.name}</td>
                    <td style={{ color: 'var(--text-tertiary)' }}>{(m.userId as any)?.email}</td>
                    <td><span className={`badge ${m.role === 'co-teacher' ? 'badge-purple' : 'badge-green'}`}>{m.role === 'co-teacher' ? 'Co-Teacher' : 'Siswa'}</span></td>
                    <td>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red-400)' }} onClick={() => handleRemoveMember(m._id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Join Requests */}
      {activeTab === 'requests' && (
        <div>
          {joinRequests.length === 0 ? (
            <div className="card">
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-state-icon"><Clock size={36} /></div>
                <h3>Tidak ada permintaan</h3>
                <p>Semua permintaan bergabung sudah ditangani.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {joinRequests.map((req: any) => (
                <div key={req._id} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', gap: 14 }}>
                    <div className="topbar-avatar" style={{ width: 40, height: 40, fontSize: '0.875rem' }}>
                      {(req.userId as any)?.name?.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600 }}>{(req.userId as any)?.name}</p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                        {(req.userId as any)?.email} • <span className={`badge ${req.role === 'co-teacher' ? 'badge-purple' : 'badge-blue'}`}>{req.role}</span>
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleApprove(req._id)}>
                        <Check size={14} /> Setujui
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleReject(req._id)}>
                        <XCircle size={14} /> Tolak
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
