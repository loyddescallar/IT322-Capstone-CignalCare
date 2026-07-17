import { Routes, Route, Navigate } from 'react-router-dom';
import Chatbot from './components/Chatbot';

// Admin
import AdminWorkspace from './pages/admin/AdminWorkspace';
import AdminChat from './pages/admin/AdminChat';

// Auth
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
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

export default function App() {
  return (
    <>
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin-login" element={<AdminLogin />} />

        {/* Admin */}
        <Route path="/admin-dashboard" element={<AdminWorkspace />} />
        <Route path="/admin/customers" element={<AdminWorkspace />} />
        <Route path="/admin/customers/:id" element={<AdminWorkspace />} />
        <Route path="/admin/tickets" element={<AdminWorkspace />} />
        <Route path="/admin/technicians" element={<AdminWorkspace />} />
        <Route path="/admin/plans" element={<AdminWorkspace />} />
        <Route path="/admin/pos" element={<AdminWorkspace />} />
        <Route path="/admin/transactions" element={<AdminWorkspace />} />
        <Route path="/admin/load-requests" element={<AdminWorkspace />} />
        <Route path="/admin/analytics" element={<AdminWorkspace />} />
        <Route path="/admin/chat/:ticketId" element={<AdminChat />} />

        {/* User */}
        <Route path="/user-dashboard" element={<UserDashboard />} />
        <Route path="/user/tickets" element={<UserTickets />} />
        <Route path="/user/tickets/:id" element={<TicketDetails />} />
        <Route path="/user/chat/:ticketId" element={<UserChat />} />
        <Route
          path="/user/technician-request"
          element={<UserTechnicianRequest />}
        />
        <Route path="/user/report-problem" element={<UserReportProblem />} />
        <Route path="/user/retrieve-info" element={<UserRetrieveInfo />} />
        <Route path="/user/load-request" element={<UserLoadRequest />} />
        <Route path="/user/load-history" element={<UserLoadHistory />} />

        {/* Troubleshooting */}
        <Route path="/troubleshoot" element={<Troubleshoot />} />
        <Route path="/troubleshoot/:modelId" element={<TroubleshootModel />} />
        <Route
          path="/troubleshoot/:modelId/:issueId"
          element={<TroubleshootIssue />}
        />

        {/* Navigation aliases */}
        <Route
          path="/report-problem"
          element={<Navigate to="/user/report-problem" replace />}
        />

        {/* Default */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      <Chatbot />
    </>
  );
}