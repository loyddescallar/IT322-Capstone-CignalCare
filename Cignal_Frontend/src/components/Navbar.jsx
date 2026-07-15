import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  LogOut,
  Flag,
  Ticket,
  Wrench,
  Smartphone,
  FileSearch,
  Stethoscope,
} from 'lucide-react';

const LOGO_SRC = '/images/CignalLogo4.png'; 
// Example:
// If your logo is inside public/logo.png, use '/logo.png'
// If inside public/images/logo.png, use '/images/logo.png'
// If inside public/assets/cignal-logo.png, use '/assets/cignal-logo.png'

const NAV_LINKS = [
  {
    label: 'Report a Problem',
    path: '/user/report-problem',
    icon: Flag,
  },
  {
    label: 'My Tickets',
    path: '/user/tickets',
    icon: Ticket,
  },
  {
    label: 'Request Technician',
    path: '/user/technician-request',
    icon: Wrench,
  },
  {
    label: 'Troubleshoot',
    path: '/troubleshoot',
    icon: Stethoscope,
  },
  {
    label: 'Load Request',
    path: '/user/load-request',
    icon: Smartphone,
  },
  {
    label: 'CCA Inquiry',
    path: '/user/retrieve-info',
    icon: FileSearch,
  },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [hidden, setHidden] = useState(false);
  const [lastY, setLastY] = useState(0);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUsername(user.accountName || 'User');
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;

      if (currentY > lastY && currentY > 80) {
        setHidden(true);
      } else {
        setHidden(false);
      }

      setLastY(currentY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastY]);

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const isActive = (path) => location.pathname.startsWith(path);

  const navBtn =
    'relative group flex items-center gap-2 text-white font-semibold text-[13px] cursor-pointer transition-all duration-150 hover:scale-110 whitespace-nowrap';

  const hidePaths = ['/login', '/register', '/admin-login'];

  if (hidePaths.includes(location.pathname)) {
    return null;
  }

  return (
    <>
      <header
        className={`fixed left-0 top-0 z-50 w-full bg-cignalRed text-white shadow-md transition-all duration-500 ease-in-out ${
          hidden ? '-translate-y-24 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="mx-auto flex h-20 w-full max-w-[1750px] items-center justify-between px-20">
          {/* Logo */}
          <button
            onClick={() => navigate('/user-dashboard')}
            className="flex items-center"
            aria-label="Go to user dashboard"
          >
            <img
              src={LOGO_SRC}
              alt="CignalCare+ Logo"
              className="h-[140px] w-auto max-w-[180px] object-contain"
            />
          </button>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-6 lg:flex">
            <div className="flex items-center gap-2 whitespace-nowrap border-r-2 border-white/50 pr-5 text-[15px] font-semibold">
              <span>Welcome,</span>
              <span className="font-bold capitalize">{username}</span>
              <span>😊</span>
            </div>

            {NAV_LINKS.map((link) => {
              const Icon = link.icon;

              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={navBtn}
                >
                  <Icon size={14} />
                  <span>{link.label}</span>

                  {isActive(link.path) && (
                    <div className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-white" />
                  )}
                </button>
              );
            })}

            <button onClick={logout} className={navBtn}>
              <LogOut size={14} />
              Logout
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-white lg:hidden"
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="space-y-3 border-t border-white/20 bg-cignalRed px-6 py-5 shadow-md lg:hidden">
            <p className="text-sm font-semibold">
              Welcome, {username} 😊
            </p>

            {NAV_LINKS.map((link) => {
              const Icon = link.icon;

              return (
                <button
                  key={link.path}
                  onClick={() => {
                    navigate(link.path);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 text-left text-sm font-semibold text-white"
                >
                  <Icon size={14} />
                  {link.label}
                </button>
              );
            })}

            <button
              onClick={logout}
              className="flex items-center gap-2 text-sm font-semibold text-white"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        )}
      </header>

      {/* Spacer */}
      <div className="h-20" />
    </>
  );
}