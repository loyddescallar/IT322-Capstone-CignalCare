import { useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import CignalBot from './CignalBot';
import ServiceAdvisoryBanner from './ServiceAdvisoryBanner';

export default function UserLayout({ children }) {
  const navigate=useNavigate();
  const location=useLocation();

  useEffect(()=>{
    const token=localStorage.getItem('token');
    const user=JSON.parse(localStorage.getItem('user')||'{}');
    const noAuthPaths=['/login','/register','/admin-login','/change-password'];
    if(!token&&!noAuthPaths.includes(location.pathname)){navigate('/login',{replace:true});}
    if(token&&user.role==='admin'&&!location.pathname.startsWith('/admin')){/* allow admin to see user pages */}
  },[navigate,location.pathname]);

  const hidePaths=['/login','/register','/admin-login','/change-password'];
  const showNavbar=!hidePaths.includes(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      {showNavbar&&<Navbar/>}
      {showNavbar&&<ServiceAdvisoryBanner/>}
      <div>{children||<Outlet/>}</div>
      {showNavbar&&<CignalBot/>}
    </div>
  );
}
