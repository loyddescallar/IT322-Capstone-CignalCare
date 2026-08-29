import { Routes, Route, Navigate } from 'react-router-dom';

// Admin
import AdminWorkspace from './pages/admin/AdminWorkspace';
import AdminChat from './pages/admin/AdminChat';

// Auth
import Login from './pages/auth/Login';
import ChangePassword from './pages/auth/ChangePassword';
import ForgotPassword from './pages/auth/ForgotPassword';
import AdminLogin from './pages/auth/AdminLogin';

// User
import UserDashboard from './pages/user/UserDashboard';
import UserTickets from './pages/user/UserTickets';
import UserChat from './pages/user/UserChat';
import TicketDetails from './pages/user/TicketDetails';
import UserTechnicianRequest from './pages/user/UserTechnicianRequest';
import UserReportProblem from './pages/user/UserReportProblem';
import UserRetrieveInfo from './pages/user/UserRetrieveInfo';
import UserLoadRequest from './pages/user/UserLoadRequest';
import UserLoadHistory from './pages/user/UserLoadHistory';
import Troubleshoot from './pages/user/Troubleshoot';
import TroubleshootModel from './pages/user/TroubleshootModel';
import TroubleshootIssue from './pages/user/TroubleshootIssue';
import AccountSecurity from './pages/user/AccountSecurity';

function readStoredUser() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.role) return user;

    const adminUser = JSON.parse(localStorage.getItem('adminUser') || 'null');
    return adminUser?.role ? adminUser : null;
  } catch {
    return null;
  }
}

function RoleRoute({ role, children }) {
  const token = localStorage.getItem('token');
  const user = readStoredUser();

  if (!token || !user) {
    return <Navigate to={role === 'admin' ? '/admin-login' : '/login'} replace />;
  }

  if (user.role !== role) {
    return (
      <Navigate
        to={user.role === 'admin' ? '/admin-dashboard' : '/user-dashboard'}
        replace
      />
    );
  }

  return children;
}

const adminRoute = (element) => <RoleRoute role="admin">{element}</RoleRoute>;
const userRoute = (element) => <RoleRoute role="user">{element}</RoleRoute>;

export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/admin-login" element={<AdminLogin />} />

      {/* Admin */}
      <Route path="/admin-dashboard" element={adminRoute(<AdminWorkspace />)} />
      <Route path="/admin/customers" element={adminRoute(<AdminWorkspace />)} />
      <Route path="/admin/customers/:id" element={adminRoute(<AdminWorkspace />)} />
      <Route path="/admin/tickets" element={adminRoute(<AdminWorkspace />)} />
      <Route path="/admin/technicians" element={adminRoute(<AdminWorkspace />)} />
      <Route path="/admin/incidents" element={adminRoute(<AdminWorkspace />)} />
      <Route path="/admin/plans" element={adminRoute(<AdminWorkspace />)} />
      <Route path="/admin/pos" element={adminRoute(<AdminWorkspace />)} />
      <Route path="/admin/transactions" element={adminRoute(<AdminWorkspace />)} />
      <Route path="/admin/load-requests" element={adminRoute(<AdminWorkspace />)} />
      <Route path="/admin/analytics" element={adminRoute(<AdminWorkspace />)} />
      <Route path="/admin/security" element={adminRoute(<AdminWorkspace />)} />
      <Route path="/admin/chat/:ticketId" element={adminRoute(<AdminChat />)} />

      {/* User */}
      <Route path="/user-dashboard" element={userRoute(<UserDashboard />)} />
      <Route path="/user/tickets" element={userRoute(<UserTickets />)} />
      <Route path="/user/tickets/:id" element={userRoute(<TicketDetails />)} />
      <Route path="/user/chat/:ticketId" element={userRoute(<UserChat />)} />
      <Route path="/user/technician-request" element={userRoute(<UserTechnicianRequest />)} />
      <Route path="/user/report-problem" element={userRoute(<UserReportProblem />)} />
      <Route path="/user/retrieve-info" element={userRoute(<UserRetrieveInfo />)} />
      <Route path="/user/load-request" element={userRoute(<UserLoadRequest />)} />
      <Route path="/user/load-history" element={userRoute(<UserLoadHistory />)} />
      <Route path="/user/account-security" element={userRoute(<AccountSecurity />)} />

      {/* Troubleshooting */}
      <Route path="/troubleshoot" element={userRoute(<Troubleshoot />)} />
      <Route path="/troubleshoot/:modelId" element={userRoute(<TroubleshootModel />)} />
      <Route path="/troubleshoot/:modelId/:issueId" element={userRoute(<TroubleshootIssue />)} />

      {/* Navigation aliases */}
      <Route
        path="/report-problem"
        element={<Navigate to="/user/report-problem" replace />}
      />

      {/* Default */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
