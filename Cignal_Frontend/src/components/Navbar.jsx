import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  LogOut,
  Flag,
  Ticket,
  Wrench,
  Smartphone,
  FileSearch,
  Stethoscope,
  ShieldCheck,
} from 'lucide-react';

const LOGO_SRC = '/images/CignalLogo4.png';

const NAV_LINKS = [
  {
    label: 'Report a Problem',
    compactLabel: 'Report',
    path: '/user/report-problem',
    icon: Flag,
  },
  {
    label: 'My Tickets',
    compactLabel: 'Tickets',
    path: '/user/tickets',
    icon: Ticket,
  },
  {
    label: 'Request Technician',
    compactLabel: 'Technician',
    path: '/user/technician-request',
    icon: Wrench,
  },
  {
    label: 'Troubleshoot',
    compactLabel: 'Troubleshoot',
    path: '/troubleshoot',
    icon: Stethoscope,
  },
  {
    label: 'Load Request',
    compactLabel: 'Load',
    path: '/user/load-request',
    icon: Smartphone,
  },
  {
    label: 'CCA Inquiry',
    compactLabel: 'CCA',
    path: '/user/retrieve-info',
    icon: FileSearch,
  },
  {
    label: 'Account Security',
    compactLabel: 'Security',
    path: '/user/account-security',
    icon: ShieldCheck,
  },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [hidden, setHidden] = useState(false);
  const [lastY, setLastY] = useState(0);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUsername(user.accountName || 'User');
  }, [location.pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;

      if (currentY > lastY && currentY > 80) {
        setHidden(true);
      } else {
        setHidden(false);
      }

      setLastY(currentY);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastY]);

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const isActive = (path) => location.pathname.startsWith(path);

  const navBtn =
    'relative group flex shrink-0 items-center gap-1 whitespace-nowrap text-white font-semibold text-[10px] lg:text-[11px] xl:text-[12px] 2xl:gap-2 2xl:text-[13px] cursor-pointer transition-all duration-150 hover:scale-105';

  const hidePaths = [
    '/login',
    '/register',
    '/admin-login',
    '/change-password',
  ];

  if (hidePaths.includes(location.pathname)) {
    return null;
  }

  return (
    <>
      <header
        className={`fixed left-0 top-0 z-50 w-full bg-cignalRed text-white shadow-md transition-all duration-500 ease-in-out ${
          hidden
            ? '-translate-y-24 opacity-0'
            : 'translate-y-0 opacity-100'
        }`}
      >
        <div
          className="
            mx-auto
            flex
            h-20
            w-full
            max-w-[1750px]
            items-center
            gap-3
            px-3
            sm:px-4
            md:px-3
            lg:px-4
            xl:px-4
            2xl:px-8
          "
        >
          {/* Logo */}
          <button
            onClick={() => navigate('/user-dashboard')}
            className="flex shrink-0 items-center justify-center"
            aria-label="Go to user dashboard"
          >
            <img
              src={LOGO_SRC}
              alt="CignalCare+ Logo"
              className="
                h-20
                w-auto
                object-contain
                sm:h-20
                md:h-20
                md:max-w-[125px]
                lg:h-[88px]
                lg:max-w-[145px]
                xl:h-24
                xl:max-w-[175px]
                2xl:h-28
                2xl:max-w-[220px]
              "
            />
          </button>

          {/* Laptop / Desktop Navigation */}
          <div
            className="
              hidden
              min-w-0
              flex-1
              items-center
              justify-between
              md:ml-3
              md:flex
              lg:ml-5
              xl:ml-6
              2xl:ml-8
            "
          >
            {/* Welcome User */}
            <div
              className="
                hidden
                min-w-0
                max-w-[120px]
                items-center
                gap-1.5
                whitespace-nowrap
                border-r-2
                border-white/50
                pr-2
                text-[11px]
                font-semibold
                xl:flex
                2xl:max-w-[230px]
                2xl:gap-2
                2xl:pr-5
                2xl:text-[15px]
              "
            >
              <span>Welcome,</span>

              <span
                className="min-w-0 truncate font-bold capitalize"
                title={username}
              >
                {username}
              </span>
            </div>

            {/* Navigation Links */}
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;

              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={navBtn}
                  title={link.label}
                >
                  <Icon
                    className="shrink-0"
                    size={14}
                  />

                  <span className="xl:hidden">
                    {link.compactLabel}
                  </span>

                  <span className="hidden xl:inline">
                    {link.label}
                  </span>

                  {isActive(link.path) && (
                    <div className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-white" />
                  )}
                </button>
              );
            })}

            {/* Logout */}
            <button
              onClick={logout}
              className={navBtn}
              title="Logout"
            >
              <LogOut
                className="shrink-0"
                size={14}
              />

              <span>Logout</span>
            </button>
          </div>

          {/* Hamburger — small screens only */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="
              ml-auto
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              text-white
              transition
              hover:bg-white/10
              md:hidden
            "
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <X size={28} />
            ) : (
              <Menu size={28} />
            )}
          </button>
        </div>

        {/* Small-screen menu */}
        {menuOpen && (
          <div
            className="
              max-h-[calc(100dvh-5rem)]
              space-y-1
              overflow-y-auto
              border-t
              border-white/20
              bg-cignalRed
              px-4
              py-4
              shadow-md
              sm:px-6
              md:hidden
            "
          >
            <p
              className="truncate text-sm font-semibold"
              title={username}
            >
              Welcome, {username}
            </p>

            {NAV_LINKS.map((link) => {
              const Icon = link.icon;

              return (
                <button
                  key={link.path}
                  onClick={() => {
                    navigate(link.path);
                    setMenuOpen(false);
                  }}
                  className="
                    flex
                    min-h-11
                    w-full
                    items-center
                    gap-3
                    rounded-xl
                    px-3
                    py-2
                    text-left
                    text-sm
                    font-semibold
                    text-white
                    transition
                    hover:bg-white/10
                  "
                >
                  <Icon
                    className="shrink-0"
                    size={14}
                  />

                  {link.label}
                </button>
              );
            })}

            {/* Mobile Logout */}
            <button
              onClick={logout}
              className="
                flex
                min-h-11
                w-full
                items-center
                gap-3
                rounded-xl
                px-3
                py-2
                text-sm
                font-semibold
                text-white
                transition
                hover:bg-white/10
              "
            >
              <LogOut
                className="shrink-0"
                size={14}
              />

              Logout
            </button>
          </div>
        )}
      </header>

      {/* Navbar spacer */}
      <div className="h-20" />
    </>
  );
}