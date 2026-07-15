import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ArrowLeftRight,
  Ticket,
  Wrench,
  Bell,
  ChevronDown,
  AlignJustify,
  X,
  Satellite,
  LogOut,
  ShieldCheck,
  Clock,
  AlertTriangle,
  AlertCircle,
  Info,
  Tv,
  BarChart2,
  Smartphone,
} from 'lucide-react';
import { getAllLoadRequests } from '../../api/loadRequestApi';
import notificationApi from '../../api/notificationApi';

import AdminDashboard from './AdminDashboard';
import AdminCustomers from './AdminCustomers';
import AdminCustomerProfile from './AdminCustomerProfile';
import AdminTickets from './AdminTickets';
import AdminTechnicianRequests from './AdminTechnicianRequests';
import AdminPOS from './AdminPOS';
import AdminPlans from './AdminPlans';
import AdminTransactions from './AdminTransactions';
import AdminLoadRequests from './AdminLoadRequests';
import AdminAnalytics from './AdminAnalytics';

const navGroups = [
  {
    group: 'Overview',
    items: [
      {
        icon: LayoutDashboard,
        label: 'Dashboard',
        path: '/admin-dashboard',
        key: 'dashboard',
      },
    ],
  },
  {
    group: 'Subscriber Management',
    items: [
      {
        icon: Users,
        label: 'Customers',
        path: '/admin/customers',
        key: 'customers',
      },
      {
        icon: Ticket,
        label: 'Tickets',
        path: '/admin/tickets',
        key: 'tickets',
      },
      {
        icon: Wrench,
        label: 'Technician Requests',
        path: '/admin/technicians',
        key: 'technicians',
      },
    ],
  },
  {
    group: 'Prepaid & Billing',
    items: [
      {
        icon: Tv,
        label: 'Plans',
        path: '/admin/plans',
        key: 'plans',
      },
      {
        icon: CreditCard,
        label: 'POS / Prepaid',
        path: '/admin/pos',
        key: 'pos',
      },
      {
        icon: ArrowLeftRight,
        label: 'Transactions',
        path: '/admin/transactions',
        key: 'transactions',
      },
      {
        icon: Smartphone,
        label: 'Load Requests',
        path: '/admin/load-requests',
        key: 'load-requests',
      },
    ],
  },
  {
    group: 'Analytics',
    items: [
      {
        icon: BarChart2,
        label: 'Analytics',
        path: '/admin/analytics',
        key: 'analytics',
      },
    ],
  },
];

function getSectionFromPath(pathname) {
  if (/^\/admin\/customers\/\d+$/.test(pathname)) {
    return 'customer-profile';
  }

  for (const group of navGroups) {
    const found = group.items.find((item) => item.path === pathname);
    if (found) return found.key;
  }

  return 'dashboard';
}

function useLiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return now;
}

function useOutsideClick(ref, callback) {
  useEffect(() => {
    function handleClick(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [ref, callback]);
}

const notifIcon = {
  critical: {
    icon: AlertTriangle,
    color: 'text-red-500 bg-red-50',
  },
  warning: {
    icon: AlertCircle,
    color: 'text-orange-500 bg-orange-50',
  },
  info: {
    icon: Info,
    color: 'text-blue-500 bg-blue-50',
  },
  admin_ticket: {
    icon: Ticket,
    color: 'text-red-500 bg-red-50',
  },
  admin_technician: {
    icon: Wrench,
    color: 'text-orange-500 bg-orange-50',
  },
  admin_load_request: {
    icon: Smartphone,
    color: 'text-blue-500 bg-blue-50',
  },
  admin_payment: {
    icon: CreditCard,
    color: 'text-green-500 bg-green-50',
  },
  admin_customer: {
    icon: Users,
    color: 'text-purple-500 bg-purple-50',
  },
  admin_message: {
    icon: Info,
    color: 'text-blue-500 bg-blue-50',
  },
};

function notificationTitle(type = '') {
  const titles = {
    admin_ticket: 'New Support Ticket',
    admin_technician: 'Technician Request',
    admin_load_request: 'Load Request',
    admin_payment: 'Payment Update',
    admin_customer: 'Customer Update',
    admin_message: 'Ticket Reply',
    load_request: 'Load Request',
    payment: 'Payment Update',
    ticket: 'Ticket Update',
    technician: 'Technician Update',
    welcome: 'Welcome',
  };

  return titles[type] || 'Notification';
}

function timeAgo(dateValue) {
  if (!dateValue) return 'Just now';

  const diff = Date.now() - new Date(dateValue).getTime();
  const seconds = Math.max(1, Math.floor(diff / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

  return new Date(dateValue).toLocaleDateString('en-PH');
}

function normalizeNotification(row) {
  return {
    id: row.id,
    type: row.type || 'info',
    title: notificationTitle(row.type),
    desc: row.message || 'New notification',
    time: timeAgo(row.created_at),
    read: Boolean(row.is_read),
  };
}

export default function AdminWorkspace() {
  const location = useLocation();
  const navigate = useNavigate();
  const now = useLiveClock();

  const activeSection = useMemo(
    () => getSectionFromPath(location.pathname),
    [location.pathname]
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [newLoadCount, setNewLoadCount] = useState(0);
  const [notifList, setNotifList] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useOutsideClick(notifRef, () => setNotifOpen(false));
  useOutsideClick(profileRef, () => setProfileOpen(false));

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('adminUser') || '{}');

    if (!token || user.role !== 'admin') {
      navigate('/admin-login', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    getAllLoadRequests()
      .then((response) => {
        const requests = response.data?.requests || response.data || [];
        setNewLoadCount(
          requests.filter((request) => request.status === 'Received').length
        );
      })
      .catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      setNotifLoading(true);
      try {
        const response = await notificationApi.getMine();
        if (!active) return;

        const notifications = response.data?.notifications || [];
        setNotifList(notifications.map(normalizeNotification));
      } catch (error) {
        console.error('LOAD ADMIN NOTIFICATIONS ERROR:', error);
      } finally {
        if (active) setNotifLoading(false);
      }
    }

    loadNotifications();
    const timer = setInterval(loadNotifications, 30000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [location.pathname]);

  const handleMarkAllRead = async () => {
    setNotifList((prev) =>
      prev.map((notification) => ({
        ...notification,
        read: true,
      }))
    );

    try {
      await notificationApi.markAllRead();
    } catch (error) {
      console.error('MARK NOTIFICATIONS READ ERROR:', error);
    }
  };

  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
  const adminName = adminUser.accountName || 'Admin';

  const adminInitials = adminName
    .split(' ')
    .map((name) => name[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const unread = notifList.filter((notification) => !notification.read).length;

  const dateStr = now.toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const timeStr = now.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const logout = () => {
    localStorage.clear();
    navigate('/admin-login');
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'customers':
        return <AdminCustomers />;
      case 'customer-profile':
        return <AdminCustomerProfile />;
      case 'tickets':
        return <AdminTickets />;
      case 'technicians':
        return <AdminTechnicianRequests />;
      case 'plans':
        return <AdminPlans />;
      case 'pos':
        return <AdminPOS />;
      case 'transactions':
        return <AdminTransactions />;
      case 'load-requests':
        return <AdminLoadRequests />;
      case 'analytics':
        return <AdminAnalytics />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100">
      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-[#0d1117] transition-transform duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 bg-[#cc0000] px-4 py-4">
          <Satellite className="text-white" size={22} />

          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-wide text-white">
              CignalCare+
            </span>
            <span className="text-xs leading-tight text-red-200">
              Descallar Satellite Services
            </span>
          </div>

          <button
            className="ml-auto text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#cc0000] text-sm font-semibold text-white">
            {adminInitials}
          </div>

          <div>
            <p className="text-sm font-semibold text-white">{adminName}</p>
            <div className="mt-0.5 flex items-center gap-1">
              <ShieldCheck size={10} className="text-[#cc0000]" />
              <p className="text-xs text-gray-400">Super Administrator</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
          {navGroups.map((group) => (
            <div key={group.group}>
              <p
                className="mb-1.5 px-3 uppercase text-gray-500"
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                }}
              >
                {group.group}
              </p>

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const badge =
                    item.key === 'load-requests' && newLoadCount > 0
                      ? newLoadCount
                      : 0;

                  const isActive =
                    activeSection === item.key ||
                    (item.key === 'customers' &&
                      activeSection === 'customer-profile');

                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        navigate(item.path);
                        setSidebarOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                        isActive
                          ? 'bg-[#cc0000] text-white'
                          : 'text-gray-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <item.icon size={17} />

                        {badge > 0 && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 animate-pulse items-center justify-center rounded-full bg-yellow-400 text-[8px] font-black text-gray-900">
                            {badge}
                          </span>
                        )}
                      </div>

                      <span className="flex-1 text-left">{item.label}</span>

                      {badge > 0 && (
                        <span className="rounded-full bg-yellow-400 px-1.5 py-0.5 text-[9px] font-black text-gray-900">
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-2 border-t border-white/10 px-4 py-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg bg-red-900/30 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-900/50 hover:text-red-300"
          >
            <LogOut size={13} />
            Logout
          </button>

          <p className="text-xs text-gray-600">© 2026 · Balayan, Batangas</p>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* MAIN */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-2.5">
          <button
            className="p-1 text-gray-500 hover:text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <AlignJustify size={20} />
          </button>

          <div className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600">
            <Clock size={12} className="text-gray-400" />
            <span className="font-medium tabular-nums">{timeStr}</span>
            <span className="ml-1.5 text-gray-400">{dateStr}</span>
          </div>

          <div className="flex-1" />

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative rounded-lg p-2 transition-colors hover:bg-gray-100"
            >
              <Bell size={18} className="text-gray-600" />

              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#cc0000] text-[9px] font-black text-white">
                  {unread}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <p className="text-sm font-semibold text-gray-800">
                    Notifications
                  </p>

                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-[#cc0000] hover:underline"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="max-h-72 divide-y divide-gray-50 overflow-y-auto">
                  {notifLoading && notifList.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-gray-400">
                      Loading notifications...
                    </div>
                  ) : notifList.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-gray-400">
                      No notifications yet.
                    </div>
                  ) : (
                    notifList.map((notification) => {
                      const config = notifIcon[notification.type] || notifIcon.info;
                      const Icon = config.icon;

                      return (
                        <div
                          key={notification.id}
                          onClick={() =>
                            setNotifList((prev) =>
                              prev.map((item) =>
                                item.id === notification.id
                                  ? { ...item, read: true }
                                  : item
                              )
                            )
                          }
                          className={`flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-gray-50 ${
                            !notification.read ? 'bg-blue-50/30' : ''
                          }`}
                        >
                          <div
                            className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${config.color}`}
                          >
                            <Icon size={13} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-800">
                              {notification.title}
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                              {notification.desc}
                            </p>
                            <p
                              className="mt-1 text-gray-400"
                              style={{ fontSize: '10px' }}
                            >
                              {notification.time}
                            </p>
                          </div>

                          {!notification.read && (
                            <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#cc0000]" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-gray-100"
            >
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#cc0000] text-xs font-bold text-white">
                {adminInitials}
              </div>
              <ChevronDown size={13} className="text-gray-400" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl">
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-semibold text-gray-800">
                    {adminName}
                  </p>

                  <div className="mt-0.5 flex items-center gap-1">
                    <ShieldCheck size={10} className="text-[#cc0000]" />
                    <span className="text-xs font-medium text-[#cc0000]">
                      Super Administrator
                    </span>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-red-50"
                >
                  <LogOut size={14} className="text-red-500" />
                  <span className="text-xs font-medium text-red-500">
                    Logout
                  </span>
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 lg:p-4">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}