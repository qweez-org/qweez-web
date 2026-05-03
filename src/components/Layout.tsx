import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, GraduationCap, Bell, User, LogOut, BookOpen
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/classes', icon: GraduationCap, label: 'Kelas' },
  { to: '/notifications', icon: Bell, label: 'Notifikasi' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const getPageTitle = () => {
    if (location.pathname === '/') return 'Dashboard';
    if (location.pathname === '/classes') return 'Kelas Saya';
    if (location.pathname.includes('/grades')) return 'Buku Nilai';
    if (location.pathname.startsWith('/classes/')) return 'Detail Kelas';
    if (location.pathname.includes('/live')) return 'Live Quiz';
    if (location.pathname.startsWith('/quizzes/')) return 'Editor Kuis';
    if (location.pathname === '/notifications') return 'Notifikasi';
    if (location.pathname === '/profile') return 'Profil';
    return 'Qweez';
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <BookOpen size={22} />
          </div>
          <span className="sidebar-brand-text">Qweez</span>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Menu</div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}

          <div className="sidebar-section-label" style={{ marginTop: 'auto' }}>Akun</div>
          <NavLink to="/profile" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <User size={20} />
            Profil
          </NavLink>
          <button className="sidebar-link" onClick={logout}>
            <LogOut size={20} />
            Keluar
          </button>
        </nav>
      </aside>

      {/* Topbar */}
      <header className="topbar">
        <h2 className="topbar-title">{getPageTitle()}</h2>
        <div className="topbar-actions">
          <NavLink to="/profile" className="topbar-avatar">
            {user?.name?.charAt(0).toUpperCase()}
          </NavLink>
        </div>
      </header>

      {/* Main content */}
      <main className="main-content">
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}
