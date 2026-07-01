import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminLogin from "./pages/AdminLogin";

import UserDashboard from "./pages/UserDashboard";
import UserReportProblem from "./pages/UserReportProblem";
import UserTickets from "./pages/UserTickets";
import UserTechnicianRequest from "./pages/UserTechnicianRequest";
import UserRetrieveInfo from "./pages/UserRetrieveInfo";
import UserChat from "./pages/UserChat";

import AdminWorkspace from "./pages/AdminWorkspace";
import AdminChat from "./pages/AdminChat";

import Troubleshoot from "./pages/Troubleshoot";
import TroubleshootModel from "./pages/TroubleshootModel";
import TroubleshootIssue from "./pages/TroubleshootIssue";
import TicketDetails from "./pages/TicketDetails";
import UserLoadRequest from "./pages/UserLoadRequest";
import AdminLoadRequests from "./pages/AdminLoadRequests";
import UserLoadHistory from "./pages/UserLoadHistory";






export default function App() {
  return (
    <Routes>
      {/* User */}
      <Route path="/troubleshoot" element={<Troubleshoot />} />
      <Route path="/troubleshoot/:modelId" element={<TroubleshootModel />} />
      <Route path="/troubleshoot/:modelId/:issueId" element={<TroubleshootIssue />} />
      <Route path="/report-problem" element={<UserReportProblem />} />
      <Route path="/tickets/:id" element={<TicketDetails />} />

      <Route path="/user-dashboard" element={<UserDashboard />} />
      <Route path="/user/report-problem" element={<UserReportProblem />} />
      <Route path="/user/technician-request" element={<UserTechnicianRequest />} />
      <Route path="/user/retrieve-info" element={<UserRetrieveInfo />} />
      <Route path="/user/tickets" element={<UserTickets />} />
      <Route path="/user/chat/:ticketId" element={<UserChat />} />

      {/* Admin Workspace */}
      <Route path="/admin-dashboard" element={<AdminWorkspace />} />
      <Route path="/admin/customers" element={<AdminWorkspace />} />
      <Route path="/admin/plans" element={<AdminWorkspace />} />
      <Route path="/admin/tickets" element={<AdminWorkspace />} />
      <Route path="/admin/transactions" element={<AdminWorkspace />} />
      <Route path="/admin/analytics" element={<AdminWorkspace />} />
      <Route path="/admin/technicians" element={<AdminWorkspace />} />
      <Route path="/admin/pos" element={<AdminWorkspace />} />
      <Route path="/admin/chat/:ticketId" element={<AdminChat />} />

      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin-login" element={<AdminLogin />} />

      {/* Default */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/user/load-request" element={<UserLoadRequest />} />
      <Route path="/admin/load-requests" element={<AdminWorkspace />} />
      <Route path="/user/load-history" element={<UserLoadHistory />} />
    </Routes>
  );
}