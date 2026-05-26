import { useState } from 'react';
import { User, Mail, Save, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { toErrorMessage } from '../utils/errors';
import ErrorBanner from '../components/ErrorBanner';
import Spinner from '../components/Spinner';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.patch('/users/me', { name: name.trim() });
      if (data.user) {
        localStorage.setItem('qweez_user', JSON.stringify(data.user));
        updateUser(data.user);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(toErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1><User size={28} /> Profil</h1>
      </div>

      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      <div style={{ maxWidth: 600 }}>
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{
            padding: '32px 28px',
            background: 'linear-gradient(135deg, var(--primary-50), var(--blue-50))',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, var(--primary-400), var(--primary-600))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 800, fontSize: '1.75rem',
              boxShadow: '0 6px 20px rgba(34, 197, 94, 0.3)',
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{ marginBottom: 2 }}>{user?.name}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>{user?.email}</p>
              <span className="badge badge-green" style={{ marginTop: 6 }}>
                {user?.role === 'teacher' ? 'Guru' : 'Siswa'}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 style={{ marginBottom: 20 }}>Edit Profil</h3>

            <div className="form-group">
              <label className="form-label">Nama Lengkap</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input className="form-input" style={{ paddingLeft: 40 }} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input className="form-input" style={{ paddingLeft: 40 }} value={user?.email || ''} disabled />
              </div>
              <p className="form-hint">Email tidak dapat diubah.</p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !name.trim()}>
                {saved ? <><Check size={18} /> Tersimpan</> : saving ? <Spinner size={18} className="spinner-white" /> : <><Save size={18} /> Simpan</>}
              </button>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-body">
            <h3 style={{ marginBottom: 12, color: 'var(--red-500)' }}>Zona Bahaya</h3>
            <button className="btn btn-danger" onClick={logout}>
              Keluar dari Akun
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
