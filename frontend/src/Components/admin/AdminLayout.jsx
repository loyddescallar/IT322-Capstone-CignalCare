import { useState } from "react";
import { NavLink } from "react-router-dom";

export default function AdminLayout({ children }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-100">

      {/* SIDEBAR */}
      <div className={`bg-[#0f172a] text-white transition-all duration-300 ${open ? "w-64" : "w-20"}`}>

        <div className="p-4 font-bold border-b border-gray-700">
          {open ? "CIGNAL ADMIN" : "CA"}
        </div>

        <nav className="mt-6 flex flex-col gap-2 px-2">

          <NavLink to="/admin/dashboard" className="p-3 rounded hover:bg-blue-600">
            📊 {open && "Dashboard"}
          </NavLink>

          <NavLink to="/admin/load-requests" className="p-3 rounded hover:bg-blue-600">
            📡 {open && "Load Requests"}
          </NavLink>

          <NavLink to="/admin/customers" className="p-3 rounded hover:bg-blue-600">
            👤 {open && "Customers"}
          </NavLink>

          <NavLink to="/admin/tickets" className="p-3 rounded hover:bg-blue-600">
            🎫 {open && "Tickets"}
          </NavLink>

        </nav>
      </div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col">

        {/* TOPBAR */}
        <div className="bg-white shadow px-4 py-3 flex justify-between">
          <button onClick={() => setOpen(!open)} className="px-2 py-1 bg-gray-200 rounded">
            ☰
          </button>

          <div className="font-semibold">Admin Panel</div>

          <div className="text-sm text-gray-500">Admin</div>
        </div>

        {/* CONTENT */}
        <div className="p-4 overflow-auto">
          {children}
        </div>

      </div>
    </div>
  );
}