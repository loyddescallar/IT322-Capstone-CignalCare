// src/components/Navbar.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import {
  FlagIcon,
  UserCircleIcon,
  TicketIcon,
  WrenchScrewdriverIcon,
  ArrowRightOnRectangleIcon,
  WrenchIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [hidden, setHidden] = useState(false);
  const [lastY, setLastY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const navBtn =
    "relative group flex items-center gap-2 text-white font-semibold text-[14px] cursor-pointer transition-all duration-150 hover:scale-110 whitespace-nowrap";

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastY && currentY > 80) setHidden(true);
      else setHidden(false);
      setLastY(currentY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastY]);

  useEffect(() => {
    setUsername(localStorage.getItem("username"));
    setRole(localStorage.getItem("userRole"));
  }, [location.pathname]);

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const isActive = (path) => location.pathname.startsWith(path);

  const hideNavbar =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/admin-login";

  if (hideNavbar) return null;

  return (
    <>
      <header
        className={`
          w-full fixed top-0 left-0 z-50 bg-cignalRed text-white shadow-md
          transition-all duration-500 ease-in-out
          ${hidden ? "-translate-y-24 opacity-0" : "translate-y-0 opacity-100"}
        `}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-24">

          {/* LOGO */}
          <button onClick={() => navigate("/user-dashboard")} className="flex items-center">
            <img
              src="/images/CignalLogo4.png  "
              className="h-[160px] w-auto object-contain -translate-x-[40%]"
            />
          </button>

          {/* DESKTOP NAV */}
          <div className="hidden lg:flex items-center gap-8">

            <div className="flex items-center gap-2 text-[15px] font-semibold border-r-4 border-white/80 pr-6 whitespace-nowrap">
              <span>Welcome,</span>
              <span className="font-bold capitalize">{username}</span>
              <span>😊</span>
            </div>

            {role === "user" && (
              <div className="flex items-center gap-6">

                <NavItem label="Report a Problem" icon={FlagIcon}
                  onClick={() => navigate("/user/report-problem")}
                  active={isActive("/user/report-problem")} navBtn={navBtn}
                />

                <NavItem label="CCA Inquiry" icon={UserCircleIcon}
                  onClick={() => navigate("/user/retrieve-info")}
                  active={isActive("/user/retrieve-info")} navBtn={navBtn}
                />

                <NavItem label="My Tickets" icon={TicketIcon}
                  onClick={() => navigate("/user/tickets")}
                  active={isActive("/user/tickets")} navBtn={navBtn}
                />

                <NavItem label="Request Technician" icon={WrenchScrewdriverIcon}
                  onClick={() => navigate("/user/technician-request")}
                  active={isActive("/user/technician-request")} navBtn={navBtn}
                />

                <NavItem label="Troubleshoot" icon={WrenchIcon}
                  onClick={() => navigate("/troubleshoot")}
                  active={isActive("/troubleshoot")} navBtn={navBtn}
                />

                {/* 🟢 ADDED LOAD REQUEST FEATURES */}
                <NavItem label="Load Request"
                  icon={UserCircleIcon}
                  onClick={() => navigate("/user/load-request")}
                  active={isActive("/user/load-request")}
                  navBtn={navBtn}
                />

                <NavItem label="My Load Requests"
                  icon={TicketIcon}
                  onClick={() => navigate("/user/load-history")}
                  active={isActive("/user/load-history")}
                  navBtn={navBtn}
                />

              </div>
            )}

            <span onClick={logout} className={navBtn}>
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              Logout
            </span>
          </div>

          {/* MOBILE MENU BUTTON */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden text-white"
          >
            {menuOpen ? <XMarkIcon className="h-8 w-8" /> : <Bars3Icon className="h-8 w-8" />}
          </button>
        </div>

        {/* MOBILE MENU */}
        {menuOpen && (
          <div className="lg:hidden bg-cignalRed px-6 py-6 space-y-4 shadow-md">

            <div className="flex items-center gap-2 text-[15px] font-semibold">
              <span>Welcome,</span>
              <span className="font-bold capitalize">{username}</span>
              <span>😊</span>
            </div>

            {role === "user" && (
              <div className="flex flex-col gap-4">

                <MobileItem label="Report a Problem"
                  onClick={() => navigate("/user/report-problem")} />

                <MobileItem label="CCA Inquiry"
                  onClick={() => navigate("/user/retrieve-info")} />

                <MobileItem label="My Tickets"
                  onClick={() => navigate("/user/tickets")} />

                <MobileItem label="Request Technician"
                  onClick={() => navigate("/user/technician-request")} />

                <MobileItem label="Troubleshoot"
                  onClick={() => navigate("/troubleshoot")} />

                {/* 🟢 ADDED MOBILE */}
                <MobileItem label="Load Request"
                  onClick={() => navigate("/user/load-request")} />

                <MobileItem label="My Load Requests"
                  onClick={() => navigate("/user/load-history")} />

              </div>
            )}

            <MobileItem label="Logout" onClick={logout} />
          </div>
        )}
      </header>

      <div className="h-24" />
    </>
  );
}

/* HELPERS */
function NavItem({ label, icon: Icon, onClick, active, navBtn }) {
  return (
    <span onClick={onClick} className={navBtn}>
      <Icon className="h-5 w-5" />
      {label}
      {active && (
        <div className="absolute left-0 -bottom-1 w-full h-[3px] bg-white rounded-full" />
      )}
    </span>
  );
}

function MobileItem({ label, onClick }) {
  return (
    <span onClick={onClick} className="text-white font-semibold text-[14px] cursor-pointer">
      {label}
    </span>
  );
}