import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, Lock, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const token = searchParams.get('token') || '';
  const userId = searchParams.get('userId') || '';

  useEffect(() => {
    if (!token || !userId || token.length !== 64) {
      setError('Tautan reset tidak valid atau sudah kadaluarsa.');
    }
  }, [token, userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }
    if (password !== confirm) {
      setError('Password dan konfirmasi tidak cocok.');
      return;
    }
    setLoading(true);
    try {
      await axios.post('/api/auth/reset-password', { token, userId, password });
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mereset password. Tautan mungkin sudah kadaluarsa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon"><BookOpen size={28} /></div>
          <h1>Qweez</h1>
          <p>Buat Password Baru</p>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle size={48} style={{ color: 'var(--green-500)', marginBottom: 16 }} />
            <h3 style={{ marginBottom: 8, fontSize: '1.125rem', fontWeight: 600 }}>Password berhasil diubah</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 20 }}>
              Silakan login dengan password baru Anda.
            </p>
            <Link to="/login" className="btn btn-primary">Login</Link>
          </div>
        ) : (
          <>
            <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 20, fontSize: '0.875rem', color: '#9a3412' }}>
              Fitur reset password masih belum aktif penuh di deployment saat ini. Jika proses ini gagal, gunakan bantuan admin atau pengelola sistem.
            </div>
            {error && (
              <div style={{ background: 'var(--red-50)', border: '1px solid var(--red-100)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', color: 'var(--red-500)' }}>
                <AlertCircle size={18} /> {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Password Baru</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'} className="form-input"
                    style={{ paddingLeft: 40, paddingRight: 40 }}
                    placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)} required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0 }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Konfirmasi Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input
                    type="password" className="form-input"
                    style={{ paddingLeft: 40 }}
                    placeholder="••••••••"
                    value={confirm} onChange={(e) => setConfirm(e.target.value)} required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading || !token || !userId}>
                {loading ? <span className="spinner" /> : 'Ubah Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
