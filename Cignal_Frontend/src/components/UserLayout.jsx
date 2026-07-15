import { useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import CignalBot from './CignalBot';

export default function UserLayout({ children }) {
  const navigate=useNavigate();
  const location=useLocation();

  useEffect(()=>{
    const token=localStorage.getItem('token');
    const user=JSON.parse(localStorage.getItem('user')||'{}');
    const noAuthPaths=['/login','/register','/admin-login'];
    if(!token&&!noAuthPaths.includes(location.pathname)){navigate('/login',{replace:true});}
    if(token&&user.role==='admin'&&!location.pathname.startsWith('/admin')){/* allow admin to see user pages */}
  },[navigate,location.pathname]);

  const hidePaths=['/login','/register','/admin-login'];
  const showNavbar=!hidePaths.includes(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      {showNavbar&&<Navbar/>}
      <div>{children||<Outlet/>}</div>
      {showNavbar&&<CignalBot/>}
    </div>
  );
}
