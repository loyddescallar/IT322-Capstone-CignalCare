import { NavLink, useNavigate } from "react-router-dom";
import {
  HomeIcon,
  UsersIcon,
  TicketIcon,
  ChartBarIcon,
  CreditCardIcon,
  WrenchScrewdriverIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

const navItems = [
  { label: "Dashboard", path: "/admin-dashboard", icon: HomeIcon },
  { label: "Customers", path: "/admin/customers", icon: UsersIcon },
  { label: "Tickets", path: "/admin/tickets", icon: TicketIcon },
  { label: "Technicians", path: "/admin/technicians", icon: WrenchScrewdriverIcon },
  { label: "Analytics", path: "/admin/analytics", icon: ChartBarIcon },
  { label: "POS / Prepaid", path: "/admin/pos", icon: CreditCardIcon },
  { label: "Load Requests", path: "/admin/load-requests", icon: CreditCardIcon },
  { label: "Analytics", path: "/admin/analytics", icon: ChartBarIcon },
  { label: "POS / Prepaid", path: "/admin/pos", icon: CreditCardIcon },
];

export default function AdminSidebar() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <aside className="w-full lg:w-72 bg-white border-r border-slate-200 min-h-screen">
      <div className="px-6 py-6 border-b border-slate-200">
        <h1 className="text-xl font-bold text-cignalRed">Admin Panel</h1>
        <p className="text-sm text-slate-500 mt-1">Descallar Satellite Services</p>
      </div>

      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-cignalRed text-white shadow"
                    : "text-slate-700 hover:bg-slate-100"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          );
        })}

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          Logout
        </button>
      </nav>
    </aside>
  );
}
