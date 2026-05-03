
import { useState,} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Mail, Lock, User, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registrasi gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <BookOpen size={28} />
          </div>
          <h1>Qweez</h1>
          <p>Daftar Akun Guru</p>
        </div>

        {error && (
          <div style={{
            background: 'var(--red-50)', border: '1px solid var(--red-100)',
            borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', color: 'var(--red-500)'
          }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nama Lengkap</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input id="register-name" type="text" className="form-input" style={{ paddingLeft: 40 }} placeholder="Nama Anda" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input id="register-email" type="email" className="form-input" style={{ paddingLeft: 40 }} placeholder="guru@sekolah.sch.id" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input id="register-password" type="password" className="form-input" style={{ paddingLeft: 40 }} placeholder="Minimal 6 karakter" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
          </div>

          <button id="register-submit" type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? <span className="spinner" /> : 'Daftar'}
          </button>
        </form>

        <div className="auth-footer">
          Sudah punya akun? <Link to="/login">Masuk</Link>
        </div>
      </div>
    </div>
  );
}
