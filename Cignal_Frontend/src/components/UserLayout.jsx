import { useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import CignalBot from './CignalBot';
import ServiceAdvisoryBanner from './ServiceAdvisoryBanner';

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

export default function UserLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = readStoredUser();
    const noAuthPaths = [
      '/login',
      '/register',
      '/admin-login',
      '/change-password',
      '/forgot-password',
    ];

    if (!token && !noAuthPaths.includes(location.pathname)) {
      navigate('/login', { replace: true });
      return;
    }

    if (token && user?.role === 'admin') {
      navigate('/admin-dashboard', { replace: true });
      return;
    }

    if (token && user?.role !== 'user') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login', { replace: true });
    }
  }, [navigate, location.pathname]);

  const hidePaths = [
    '/login',
    '/register',
    '/admin-login',
    '/change-password',
    '/forgot-password',
  ];
  const showNavbar = !hidePaths.includes(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      {showNavbar && <Navbar />}
      {showNavbar && <ServiceAdvisoryBanner />}
      <div>{children || <Outlet />}</div>
      {showNavbar && <CignalBot />}
    </div>
  );
}
