import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import CignalBot from './CignalBot';
import EmailModal from './EmailModal'; // Import mo yung ginawa nating component

export default function UserLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const noAuthPaths = ['/login', '/register', '/admin-login'];
    
    if (!token && !noAuthPaths.includes(location.pathname)) {
      navigate('/login', { replace: true });
    }

    // Check kung may token at kung wala pang email ang user
    if (token && user.id && !user.email) {
      setShowEmailModal(true);
    }
  }, [navigate, location.pathname]);

  const handleSaveEmail = (email) => {
    // Dito mo i-save sa Firestore gamit ang Firebase SDK
    // Pagkatapos ma-save, i-update ang localStorage para hindi na lumabas ulit ang modal
    const user = JSON.parse(localStorage.getItem('user'));
    localStorage.setItem('user', JSON.stringify({ ...user, email }));
    
    setShowEmailModal(false);
  };

  const hidePaths = ['/login', '/register', '/admin-login'];
  const showNavbar = !hidePaths.includes(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* I-render ang Modal kung kailangan */}
      {showEmailModal && <EmailModal onSave={handleSaveEmail} />}
      
      {showNavbar && <Navbar />}
      <div>{children || <Outlet />}</div>
      {showNavbar && <CignalBot />}
    </div>
  );
}