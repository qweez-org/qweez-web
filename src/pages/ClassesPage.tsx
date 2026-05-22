import { useEffect, useState } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Plus, Users, BookOpen, GraduationCap, X, Copy } from 'lucide-react';
import { toErrorMessage } from '../utils/errors';
import ErrorBanner from '../components/ErrorBanner';
import Spinner from '../components/Spinner';

const bannerVariants = ['variant-1', 'variant-2', 'variant-3', 'variant-4', 'variant-5'];

export default function ClassesPage() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);



  const fetchClasses = async () => {
    try {
      setError(null);
      const { data } = await api.get('/classes');
      setClasses(data.classes || []);
    } catch (e: any) {
      setError(toErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClasses(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      setError(null);
      await api.post('/classes', { name: newName, description: newDesc });
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      fetchClasses();
    } catch (e: any) {
      setError(toErrorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const copyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
  };

  return (
    <div>
      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      <div className="page-header">
        <h1><GraduationCap size={28} /> Kelas Saya</h1>
        <button id="create-class-btn" className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> Buat Kelas
        </button>
      </div>

      {loading ? (
        <div className="loading-page"><Spinner size={32} /></div>
      ) : classes.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><BookOpen size={36} /></div>
            <h3>Belum ada kelas</h3>
            <p>Buat kelas pertama Anda dan bagikan kode ke siswa.</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={18} /> Buat Kelas Baru
            </button>
          </div>
        </div>
      ) : (
        <div className="grid-auto">
          {classes.map((cls, i) => (
            <div key={cls._id} className="card card-clickable class-card stagger-item" style={{ animationDelay: `${0.05 * i}s` }} onClick={() => navigate(`/classes/${cls._id}`)}>
              <div className={`class-card-banner ${bannerVariants[i % bannerVariants.length]}`}>
                <h3>{cls.name}</h3>
              </div>
              <div className="class-card-body">
                {cls.description && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 12 }}>{cls.description}</p>}
                <div className="class-card-meta">
                  <span>
                    <span className="class-card-code">{cls.code}</span>
                    <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }} onClick={(e) => copyCode(cls.code, e)} title="Salin kode">
                      <Copy size={14} />
                    </button>
                  </span>
                  <span><Users size={14} /> Siswa</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Class Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Buat Kelas Baru</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nama Kelas</label>
                <input id="class-name" className="form-input" placeholder="contoh: XI RPL 1" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Deskripsi (opsional)</label>
                <textarea id="class-desc" className="form-textarea" placeholder="Deskripsi kelas..." value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Batal</button>
              <button id="class-create-submit" className="btn btn-primary" onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating ? <Spinner size={18} className="spinner-white" /> : 'Buat Kelas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
