import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Hash,
  LockKeyhole,
  Satellite,
  ShieldCheck,
  User,
} from 'lucide-react';
import authApi from '../../api/authApi';

export default function AdminLogin() {
  const navigate = useNavigate();

  const [accountName, setAccountName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!accountName.trim() || !accountId.trim()) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authApi.login({
        accountName: accountName.trim(),
        accountId: accountId.trim(),
      });

      const { token, user } = response.data;

      if (user.role !== 'admin') {
        setError('Access denied. Admin credentials required.');
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('adminUser', JSON.stringify(user));
      localStorage.setItem('user', JSON.stringify(user));

      navigate('/admin-dashboard');
    } catch (loginError) {
      setError(loginError.response?.data?.error || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="fixed inset-0 h-[100dvh] w-[100dvw] overflow-hidden bg-black">
  {/* Fullscreen background video */}
  <video
    key="admin-login-bg"
    autoPlay
    muted
    loop
    playsInline
    preload="auto"
    className="fixed left-1/2 top-1/2 z-0 h-[100dvh] w-[100dvw] -translate-x-1/2 -translate-y-1/2 scale-110 object-cover"
  >
    <source src="/video/admin_background.mp4?v=3" type="video/mp4" />
  </video>

  {/* Very light overlays */}
  <div className="fixed inset-0 z-10 bg-black/5" />
  <div className="fixed inset-0 z-10 bg-gradient-to-r from-black/20 via-transparent to-black/10" />

      {/* Content */}
      <main className="relative z-20 flex min-h-screen w-screen items-center justify-center overflow-y-auto px-4 py-8 sm:px-8 lg:px-12 xl:px-20">
        <div className="grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] xl:gap-20">
          {/* Left information panel */}
          <section className="hidden text-white lg:block">
            <div className="mb-12 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/25 bg-white/10 shadow-lg backdrop-blur-md">
                <Satellite size={31} />
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-tight">
                  CignalCare+
                </h1>
                <p className="text-sm text-white/70">
                  Descallar Satellite Services
                </p>
              </div>
            </div>

            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-red-300/30 bg-red-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-red-100 backdrop-blur-md">
                <ShieldCheck size={15} />
                Admin Control Center
              </span>

              <h2 className="mt-6 text-5xl font-black leading-[1.08] tracking-tight xl:text-6xl">
                Manage service
                <span className="block text-red-400">
                  requests securely.
                </span>
              </h2>

              <p className="mt-6 max-w-lg text-base leading-7 text-white/75">
                Access customer records, load requests, tickets, technician
                schedules, plans, POS transactions, and analytics from one
                protected admin workspace.
              </p>

              <div className="mt-8 grid max-w-lg gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                  <p className="text-2xl font-black text-red-300">24/7</p>
                  <p className="mt-1 text-xs font-medium text-white/65">
                    Support monitoring
                  </p>
                </div>

                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                  <p className="text-2xl font-black text-red-300">Secure</p>
                  <p className="mt-1 text-xs font-medium text-white/65">
                    Admin-only access
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-12 text-xs text-white/45">
              © 2026 Descallar Satellite Services. All rights reserved.
            </p>
          </section>

          {/* Login card */}
          <section className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md">
              <div className="mb-5 flex items-center justify-center gap-3 text-white lg:hidden">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-white/10 backdrop-blur-md">
                  <Satellite size={25} />
                </div>

                <div>
                  <p className="text-xl font-black">CignalCare+</p>
                  <p className="text-xs text-white/65">Admin Portal</p>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/20 bg-[#10151f]/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
                <div className="mb-7">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/15 text-red-400">
                      <LockKeyhole size={21} />
                    </div>

                    <div>
                      <h2 className="text-2xl font-black text-white">
                        Admin Login
                      </h2>
                      <p className="mt-0.5 text-xs text-white/45">
                        Authorized personnel only
                      </p>
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-white/55">
                    Sign in using your administrator credentials to continue to
                    the admin dashboard.
                  </p>
                </div>

                {error && (
                  <div className="mb-5 rounded-xl border border-red-500/30 bg-red-950/45 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label
                      htmlFor="adminAccountName"
                      className="mb-2 block text-xs font-bold uppercase tracking-wide text-white/55"
                    >
                      Admin Username
                    </label>

                    <div className="relative">
                      <User
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
                      />

                      <input
                        id="adminAccountName"
                        type="text"
                        value={accountName}
                        onChange={(event) => {
                          setAccountName(event.target.value);
                          if (error) setError('');
                        }}
                        placeholder="Enter admin username"
                        autoComplete="username"
                        className="w-full rounded-xl border border-white/10 bg-black/30 py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="adminAccountId"
                      className="mb-2 block text-xs font-bold uppercase tracking-wide text-white/55"
                    >
                      Admin ID / Account Number
                    </label>

                    <div className="relative">
                      <Hash
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
                      />

                      <input
                        id="adminAccountId"
                        type="text"
                        value={accountId}
                        onChange={(event) => {
                          setAccountId(event.target.value);
                          if (error) setError('');
                        }}
                        placeholder="Enter admin ID"
                        autoComplete="current-password"
                        className="w-full rounded-xl border border-white/10 bg-black/30 py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center rounded-xl bg-[#cc0000] py-3.5 text-sm font-bold text-white shadow-lg shadow-red-950/40 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Logging in...' : 'Login as Admin'}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold text-white/55 transition hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft size={15} />
                  Back to User Login
                </button>
              </div>

              <p className="mt-5 text-center text-xs text-white/50 lg:hidden">
                © 2026 Descallar Satellite Services
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}