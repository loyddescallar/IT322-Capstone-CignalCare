import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Admin
const AdminWorkspace = lazy(() => import('./pages/admin/AdminWorkspace'));
const AdminChat = lazy(() => import('./pages/admin/AdminChat'));

// Auth
const Login = lazy(() => import('./pages/auth/Login'));
const ChangePassword = lazy(() => import('./pages/auth/ChangePassword'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const AdminLogin = lazy(() => import('./pages/auth/AdminLogin'));

// User
const UserDashboard = lazy(() => import('./pages/user/UserDashboard'));
const UserTickets = lazy(() => import('./pages/user/UserTickets'));
const UserChat = lazy(() => import('./pages/user/UserChat'));
const TicketDetails = lazy(() => import('./pages/user/TicketDetails'));
const UserTechnicianRequest = lazy(() => import('./pages/user/UserTechnicianRequest'));
const UserReportProblem = lazy(() => import('./pages/user/UserReportProblem'));
const UserRetrieveInfo = lazy(() => import('./pages/user/UserRetrieveInfo'));
const UserLoadRequest = lazy(() => import('./pages/user/UserLoadRequest'));
const UserLoadHistory = lazy(() => import('./pages/user/UserLoadHistory'));
const Troubleshoot = lazy(() => import('./pages/user/Troubleshoot'));
const TroubleshootModel = lazy(() => import('./pages/user/TroubleshootModel'));
const TroubleshootIssue = lazy(() => import('./pages/user/TroubleshootIssue'));
const AccountSecurity = lazy(() => import('./pages/user/AccountSecurity'));
const TermsAcceptance = lazy(() => import('./pages/user/TermsAcceptance'));

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

  if (role === 'user' && user.termsAccepted !== true) {
    return <Navigate to="/user/terms" replace />;
  }

  return children;
}

function UserTermsRoute({ children }) {
  const token = localStorage.getItem('token');
  const user = readStoredUser();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role !== 'user') return <Navigate to="/admin-dashboard" replace />;
  return children;
}

function AdminLoginRoute() {
  const token = localStorage.getItem('token');
  const user = readStoredUser();
  if (token && user?.role === 'user') return <Navigate to="/user-dashboard" replace />;
  if (token && user?.role === 'admin') return <Navigate to="/admin-dashboard" replace />;
  return <AdminLogin />;
}

const adminRoute = (element) => <RoleRoute role="admin">{element}</RoleRoute>;
const userRoute = (element) => <RoleRoute role="user">{element}</RoleRoute>;

export default function App() {
  return (
    <Suspense fallback={<div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center p-6 text-sm text-gray-500">Loading page…</div>}>
      <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/admin-login" element={<AdminLoginRoute />} />

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
      <Route path="/user/terms" element={<UserTermsRoute><TermsAcceptance /></UserTermsRoute>} />

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
    </Suspense>
  );
}
