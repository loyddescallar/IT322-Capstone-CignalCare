import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  HomeIcon,
  UsersIcon,
  CreditCardIcon,
  ClipboardDocumentListIcon,
  TicketIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  Bars3Icon,
  BellIcon,
  EnvelopeIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

import AdminDashboard from "./AdminDashboard";
import AdminCustomers from "./AdminCustomers";
import AdminPOS from "./AdminPOS";
import AdminTickets from "./AdminTickets";
import AdminTechnicianRequests from "./AdminTechnicianRequests";
import AdminAnalytics from "./AdminAnalytics";
import AdminPlans from "./AdminPlans";
import AdminTransactions from "./AdminTransactions";
import AdminLoadRequests from "./AdminLoadRequests";

const menuItems = [
  { key: "dashboard", label: "Dashboard", icon: HomeIcon, path: "/admin-dashboard" },
  { key: "customers", label: "Customers", icon: UsersIcon, path: "/admin/customers" },
  { key: "plans", label: "Plans", icon: ClipboardDocumentListIcon, path: "/admin/plans" },
  { key: "pos", label: "POS / Prepaid Loading", icon: CreditCardIcon, path: "/admin/pos" },
  { key: "transactions", label: "Transactions", icon: ClipboardDocumentListIcon, path: "/admin/transactions" },
  { key: "load-requests", label: "Load Requests", icon: CreditCardIcon, path: "/admin/load-requests" },
  { key: "tickets", label: "Tickets", icon: TicketIcon, path: "/admin/tickets" },
  { key: "technicians", label: "Technician Requests", icon: WrenchScrewdriverIcon, path: "/admin/technicians" },
  { key: "reports", label: "Reports", icon: ChartBarIcon, path: "/admin/analytics" },
];

function getSectionFromPath(pathname) {
  const match = menuItems.find((item) => item.path === pathname);
  return match?.key || "dashboard";
}

function getSearchRoute(query) {
  const q = query.toLowerCase();
  if (q.includes("customer") || q.includes("account") || q.includes("cca")) return "/admin/customers";
  if (q.includes("ticket") || q.includes("chat") || q.includes("support")) return "/admin/tickets";
  if (q.includes("tech")) return "/admin/technicians";
  if (q.includes("request") && q.includes("load")) return "/admin/load-requests";
  if (q.includes("load") || q.includes("pos") || q.includes("prepaid")) return "/admin/pos";
  if (q.includes("transaction") || q.includes("payment")) return "/admin/transactions";
  if (q.includes("report") || q.includes("analytic")) return "/admin/analytics";
  return "/admin-dashboard";
}

export default function AdminWorkspace() {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const activeSection = useMemo(() => getSectionFromPath(location.pathname), [location.pathname]);

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <AdminDashboard embedded />;
      case "customers":
        return <AdminCustomers embedded />;
      case "plans":
        return <AdminPlans embedded />;
      case "pos":
        return <AdminPOS embedded />;
      case "transactions":
        return <AdminTransactions embedded />;
      case "load-requests":
        return <AdminLoadRequests embedded />;
      case "tickets":
        return <AdminTickets embedded />;
      case "technicians":
        return <AdminTechnicianRequests embedded />;
      case "reports":
        return <AdminAnalytics embedded />;
      default:
        return <AdminDashboard embedded />;
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    navigate(getSearchRoute(search));
  };

  return (
    <div className="min-h-screen bg-slate-200 flex">
      <aside className="w-[320px] bg-slate-950 text-white min-h-screen flex flex-col">
        <div className="bg-cignalRed px-6 py-6">
          <h1 className="text-3xl font-bold leading-tight">
            Descallar
            <br />
            Satellite Services
          </h1>
        </div>

        <div className="px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center text-xl font-bold">
              A
            </div>
            <div>
              <p className="text-3xl font-semibold leading-none">Admin</p>
              <p className="text-slate-300 text-lg">Super Administrator</p>
            </div>
          </div>
        </div>

        <nav className="px-3 py-4 space-y-2 flex-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.key;

            return (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left font-semibold transition ${
                  active ? "bg-red-600 text-white" : "text-slate-200 hover:bg-white/5"
                }`}
              >
                <Icon className="h-7 w-7 shrink-0" />
                <span className="text-2xl leading-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-6 py-6 border-t border-white/10 text-slate-300 text-sm">
          © 2025 Descallar Satellite Services
        </div>
      </aside>

      <main className="flex-1 min-w-0 bg-slate-200">
        <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <button className="p-2 rounded-xl hover:bg-slate-100" type="button">
              <Bars3Icon className="h-8 w-8 text-slate-700" />
            </button>

            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search (Account, Customer, Ticket...)"
                className="w-full rounded-2xl border border-slate-300 px-6 py-4 text-xl outline-none focus:ring-2 focus:ring-red-500"
              />
            </form>
          </div>

          <div className="flex items-center gap-5 shrink-0">
            <BellIcon className="h-8 w-8 text-slate-700" />
            <EnvelopeIcon className="h-8 w-8 text-slate-700" />

            <div className="flex items-center gap-3 border-b-2 border-red-500 pb-1">
              <div className="h-12 w-12 rounded-full bg-slate-200" />
              <div className="font-semibold text-slate-800 text-xl">
                {localStorage.getItem("username") || "Admin John D."}
              </div>
              <ChevronDownIcon className="h-5 w-5 text-slate-700" />
            </div>
          </div>
        </div>

        <div className="p-6">{renderContent()}</div>
      </main>
    </div>
  );
}
