import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Search,
  User,
  Hash,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MapPin,
  Phone,
  ExternalLink,
} from 'lucide-react';
import authApi from '../../api/authApi';

const LOGO_SRC = '/images/CignalLogo4.png';

const STORE_NAME = 'Descallar Cignal Tv Partner Store';

const STORE_ADDRESS =
  'WQW4+77X, Palico - Balayan - Batangas Rd, Balayan, Batangas';

const STORE_MAP_URL = 'https://maps.app.goo.gl/YHL3P8gkgahP5MXLA';

const FACEBOOK_PAGE_URL = 'https://www.facebook.com/CignalTVBalayan';

function GoogleMapsLogo({ className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="#1a73e8"
        d="M24 4C15.7 4 9 10.7 9 19c0 10.8 15 25 15 25s15-14.2 15-25C39 10.7 32.3 4 24 4z"
      />
      <path
        fill="#34a853"
        d="M24 4C15.7 4 9 10.7 9 19c0 5.6 4 12.4 8.1 17.6L24 24V4z"
      />
      <path
        fill="#fbbc04"
        d="M24 24l6.9 12.6C35 31.4 39 24.6 39 19c0-4.2-1.7-8-4.4-10.7L24 24z"
      />
      <path
        fill="#ea4335"
        d="M24 4v20L13.4 8.3C16.1 5.7 19.8 4 24 4z"
      />
      <circle cx="24" cy="19" r="5.5" fill="#ffffff" />
    </svg>
  );
}

function FacebookLogo({ className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="22" fill="#1877F2" />
      <path
        fill="#ffffff"
        d="M29.8 25.4l.8-5.2h-5v-3.4c0-1.4.7-2.8 2.9-2.8h2.3V9.6S28.7 9 26.7 9c-4.2 0-7 2.6-7 7.2v4h-4.7v5.2h4.7V38h5.9V25.4h4.2z"
      />
    </svg>
  );
}

function getActivityStatus(lastLoadDate) {
  if (!lastLoadDate) return 'Inactive';

  const days =
    (Date.now() - new Date(lastLoadDate).getTime()) / 86400000;

  if (days <= 30) return 'Active';
  if (days <= 60) return 'At Risk';
  return 'Inactive';
}

const STATUS_COLORS = {
  Active: 'bg-green-100 text-green-700 border-green-200',
  'At Risk': 'bg-amber-100 text-amber-700 border-amber-200',
  Inactive: 'bg-red-100 text-red-700 border-red-200',
};

export default function Login() {
  const navigate = useNavigate();

  const [accountName, setAccountName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [prepaidModal, setPrepaidModal] = useState(false);
  const [ccaModal, setCcaModal] = useState(false);
  const [inquiryInput, setInquiryInput] = useState('');
  const [inquiryResult, setInquiryResult] = useState(null);
  const [inquiryLoading, setInquiryLoading] = useState(false);

  const openPrepaidModal = () => {
    setPrepaidModal(true);
    setCcaModal(false);
    setInquiryInput('');
    setInquiryResult(null);
  };

  const openCcaModal = () => {
    setCcaModal(true);
    setPrepaidModal(false);
    setInquiryInput('');
    setInquiryResult(null);
  };

  const closeModal = () => {
    setPrepaidModal(false);
    setCcaModal(false);
    setInquiryInput('');
    setInquiryResult(null);
  };

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

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      if (user.role === 'admin') {
        localStorage.setItem('adminUser', JSON.stringify(user));
        navigate('/admin-dashboard');
      } else {
        navigate('/user-dashboard');
      }
    } catch (loginError) {
      setError(
        loginError.response?.data?.error ||
          'Invalid credentials. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInquiry = async (event) => {
    event.preventDefault();

    if (!inquiryInput.trim()) return;

    setInquiryLoading(true);
    setInquiryResult(null);

    try {
      const response = await authApi.lookup(inquiryInput.trim());
      const customer = response.data?.user || response.data;

      let prepaidInfo = null;

      if (customer?.lastLoadDate) {
        const expiryDate = new Date(customer.lastLoadDate);
        expiryDate.setDate(expiryDate.getDate() + 30);

        const daysLeft = Math.ceil(
          (expiryDate.getTime() - Date.now()) / 86400000
        );

        prepaidInfo = {
          daysLeft,
          expiry: expiryDate.toLocaleDateString('en-PH'),
          status:
            daysLeft > 7
              ? 'Active'
              : daysLeft > 0
                ? 'Expiring'
                : 'Expired',
        };
      }

      setInquiryResult({
        found: true,
        data: customer,
        prepaid: prepaidInfo,
      });
    } catch {
      setInquiryResult({ found: false });
    } finally {
      setInquiryLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/video/background.mp4" type="video/mp4" />
      </video>

      {/* Video overlays */}
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/10 to-black/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

      {/* Page content */}
      <main className="relative z-10 flex min-h-screen items-center px-5 py-8 sm:px-8 lg:px-12 xl:px-20">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] xl:gap-20">
          {/* Desktop branding and inquiry actions */}
          <section className="hidden text-white lg:block">
            <div className="max-w-xl">
              <h2 className="mt-6 text-5xl font-black leading-[1.08] tracking-tight xl:text-6xl">
                CignalCare+
                <span className="block text-red-400">
                  Descallar Satellite Services
                </span>
              </h2>

              <p className="mt-6 max-w-lg text-base leading-7 text-white/75">
                Your trusted partner for Cignal TV and satellite solutions in
                Balayan and nearby areas. We provide reliable installations,
                customer service, and technical assistance for all your satellite
                needs. Whether youre a new subscriber or an existing one,
                our dedicated team is here to ensure you have the best
                experience with your Cignal TV service.
              </p>

              <div className="mt-7 space-y-3 text-sm text-white/80">
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-red-400" />
                  <span>{STORE_ADDRESS}</span>
                </div>

                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-red-400" />
                  <span>0975-571-8056 / 0917-511-9647</span>
                </div>
              </div>
              </div>

              {/* Store and Facebook links */}
             {/* Store and social links */}
<div className="mt-6 grid max-w-lg grid-cols-2 gap-4">
  <a
    href={STORE_MAP_URL}
    target="_blank"
    rel="noopener noreferrer"
    className="flex min-h-[58px] items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-gray-900 shadow-xl transition hover:-translate-y-0.5 hover:bg-red-50"
  >
    <GoogleMapsLogo className="h-5 w-5 flex-shrink-0" />
    <span>Store Location</span>
    <ExternalLink size={13} className="flex-shrink-0 text-gray-500" />
  </a>

  <a
    href={FACEBOOK_PAGE_URL}
    target="_blank"
    rel="noopener noreferrer"
    className="flex min-h-[58px] items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/10 px-5 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/20"
  >
    <FacebookLogo className="h-5 w-5 flex-shrink-0" />
    <span>Facebook Page</span>
    <ExternalLink size={13} className="flex-shrink-0 text-white/70" />
  </a>
</div>

{/* Inquiry links */}
<div className="mt-4 grid max-w-lg grid-cols-2 gap-4">
  <button
    type="button"
    onClick={openPrepaidModal}
    className="flex min-h-[58px] items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-[#cc0000] shadow-xl transition hover:-translate-y-0.5 hover:bg-red-50"
  >
    <Search size={17} className="flex-shrink-0" />
    <span>Prepaid Inquiry</span>
  </button>

  <button
    type="button"
    onClick={openCcaModal}
    className="flex min-h-[58px] items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/10 px-5 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/20"
  >
    <Search size={17} className="flex-shrink-0" />
    <span>CCA Inquiry</span>
  </button>
</div>

            <p className="mt-12 text-xs text-white/45">
              © 2026 Descallar Satellite Services. All rights reserved.
            </p>
          </section>

          {/* Login panel */}
          <section className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md">
              {/* Mobile logo only */}
              <div className="mb-5 flex justify-center lg:hidden">
                <img
                  src={LOGO_SRC}
                  alt="Descallar Satellite Services Logo"
                  className="h-32 w-auto max-w-[500px] object-contain drop-shadow-xl sm:h-40"
                />
              </div>

              <div className="rounded-[28px] border border-white/25 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
                <div className="mb-7">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="h-7 w-1.5 rounded-full bg-[#cc0000]" />

                    <h2 className="text-2xl font-black text-gray-900">
                      User Login
                    </h2>
                  </div>

                  <p className="text-sm leading-6 text-gray-500">
                    Enter your registered account name and account or CCA
                    number.
                  </p>
                </div>

                {error && (
                  <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label
                      htmlFor="accountName"
                      className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600"
                    >
                      Account Name
                    </label>

                    <div className="relative">
                      <User
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        id="accountName"
                        type="text"
                        value={accountName}
                        onChange={(event) => {
                          setAccountName(event.target.value);
                          if (error) setError('');
                        }}
                        autoComplete="username"
                        placeholder="Enter your account name"
                        className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-11 pr-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#cc0000] focus:ring-4 focus:ring-red-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="accountId"
                      className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600"
                    >
                      Account Number / CCA Number
                    </label>

                    <div className="relative">
                      <Hash
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        id="accountId"
                        type="text"
                        value={accountId}
                        onChange={(event) => {
                          setAccountId(event.target.value);
                          if (error) setError('');
                        }}
                        autoComplete="current-password"
                        placeholder="Enter account or CCA number"
                        className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-11 pr-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#cc0000] focus:ring-4 focus:ring-red-100"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center rounded-xl bg-[#cc0000] py-3.5 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-[#a90000] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </button>
                </form>

                <div className="mt-5 flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="text-xs text-gray-500 transition hover:text-[#cc0000]"
                  >
                    Don&apos;t have an account?{' '}
                    <span className="font-bold">Register</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/admin-login')}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Admin Login
                  </button>
                </div>

                {/* Mobile inquiry buttons */}
                <div className="mt-6 grid gap-3 border-t border-gray-100 pt-5 lg:hidden">
                  <button
                    type="button"
                    onClick={openPrepaidModal}
                    className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-[#cc0000] transition hover:bg-red-100"
                  >
                    <Search size={15} />
                    Prepaid Account Inquiry
                  </button>

                  <button
                    type="button"
                    onClick={openCcaModal}
                    className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-xs font-bold text-gray-700 transition hover:bg-gray-100"
                  >
                    <Search size={15} />
                    CCA Inquiry
                  </button>
                </div>

                {/* Mobile store and social links */}
                <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 lg:hidden">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-50">
                      <GoogleMapsLogo className="h-6 w-6" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-black text-gray-900">
                        Visit Our Store
                      </p>

                      <p className="mt-1 text-xs font-semibold text-gray-700">
                        {STORE_NAME}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        {STORE_ADDRESS}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <a
                      href={STORE_MAP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-xs font-bold text-[#cc0000] transition hover:bg-red-100"
                    >
                      <GoogleMapsLogo className="h-5 w-5" />
                      Google Maps
                    </a>

                    <a
                      href={FACEBOOK_PAGE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                    >
                      <FacebookLogo className="h-5 w-5" />
                      Facebook Page
                    </a>
                  </div>
                </div>

              </div>

              <p className="mt-5 text-center text-xs text-white/55 lg:hidden">
                © 2026 Descallar Satellite Services
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Inquiry modal */}
      {(prepaidModal || ccaModal) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={
            prepaidModal ? 'Prepaid Account Inquiry' : 'CCA Inquiry'
          }
        >
          <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div
              className={`flex flex-shrink-0 items-center justify-between px-5 py-4 text-white ${
                prepaidModal
                  ? 'bg-gradient-to-r from-[#cc0000] to-[#880000]'
                  : 'bg-gradient-to-r from-gray-950 to-gray-800'
              }`}
            >
              <div>
                <p className="text-sm font-black">
                  {prepaidModal
                    ? 'Prepaid Account Inquiry'
                    : 'CCA Inquiry'}
                </p>

                <p className="mt-0.5 text-xs text-white/70">
                  Descallar Satellite Services
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl p-2 transition hover:bg-white/20"
                aria-label="Close inquiry"
              >
                <X size={17} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <p className="mb-4 text-xs leading-5 text-gray-500">
                {prepaidModal
                  ? 'Check your prepaid account and subscription status.'
                  : 'Enter an account number or CCA number to view subscriber information.'}
              </p>

              <form onSubmit={handleInquiry} className="mb-4 flex gap-2">
                <input
                  type="text"
                  value={inquiryInput}
                  onChange={(event) => setInquiryInput(event.target.value)}
                  placeholder={
                    prepaidModal
                      ? 'Enter Account Number'
                      : 'Enter Account No. or CCA No.'
                  }
                  autoFocus
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3.5 py-3 text-xs outline-none transition focus:border-[#cc0000] focus:ring-4 focus:ring-red-100"
                />

                <button
                  type="submit"
                  disabled={inquiryLoading || !inquiryInput.trim()}
                  className="rounded-xl bg-[#cc0000] px-5 py-3 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {inquiryLoading ? 'Searching...' : 'Search'}
                </button>
              </form>

              {inquiryResult && !inquiryResult.found && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">
                  ❌ No record found for &quot;{inquiryInput}&quot;
                </div>
              )}

              {inquiryResult?.found && inquiryResult.data && (
                <div className="space-y-3">
                  {/* Activity status */}
                  {(() => {
                    const status = getActivityStatus(
                      inquiryResult.data.lastLoadDate
                    );

                    return (
                      <div
                        className={`flex items-center gap-3 rounded-xl border p-3 ${STATUS_COLORS[status]}`}
                      >
                        {status === 'Active' ? (
                          <CheckCircle2 size={18} />
                        ) : status === 'At Risk' ? (
                          <AlertTriangle size={18} />
                        ) : (
                          <XCircle size={18} />
                        )}

                        <div>
                          <p className="text-xs font-black">
                            {status} Account
                          </p>

                          <p className="text-xs opacity-80">
                            Last load:{' '}
                            {inquiryResult.data.lastLoadDate
                              ? new Date(
                                  inquiryResult.data.lastLoadDate
                                ).toLocaleDateString('en-PH')
                              : 'No record'}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Account details */}
                  <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-4">
                    <p className="mb-3 text-xs font-bold text-green-700">
                      ✅ Record Found
                    </p>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {[
                        {
                          label: 'Account Name',
                          value: inquiryResult.data.accountName,
                        },
                        {
                          label: 'Account No.',
                          value: inquiryResult.data.accountNumber,
                        },
                        {
                          label: 'CCA No.',
                          value: inquiryResult.data.ccaNumber,
                        },
                        {
                          label: 'Phone',
                          value: inquiryResult.data.phone,
                        },
                        {
                          label: 'Location',
                          value: inquiryResult.data.location || '—',
                        },
                        {
                          label: 'Status',
                          value: inquiryResult.data.status || 'active',
                        },
                      ].map((field) => (
                        <div key={field.label} className="min-w-0">
                          <p className="text-[9px] uppercase tracking-wide text-gray-400">
                            {field.label}
                          </p>

                          <p className="mt-0.5 break-words text-xs font-bold text-gray-800">
                            {field.value || '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Subscription details */}
                  {prepaidModal && inquiryResult.prepaid && (
                    <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-4">
                      <p className="mb-2 text-xs font-bold text-blue-700">
                        📺 Subscription Details
                      </p>

                      {[
                        {
                          label: 'Status',
                          value: inquiryResult.prepaid.status,
                        },
                        {
                          label: 'Days Remaining',
                          value:
                            inquiryResult.prepaid.daysLeft > 0
                              ? `${inquiryResult.prepaid.daysLeft} days`
                              : 'Expired',
                        },
                        {
                          label: 'Expiry Date',
                          value: inquiryResult.prepaid.expiry,
                        },
                      ].map((field) => (
                        <div
                          key={field.label}
                          className="flex justify-between gap-4 text-xs"
                        >
                          <span className="text-gray-500">
                            {field.label}
                          </span>

                          <span className="text-right font-bold text-gray-800">
                            {field.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {prepaidModal && !inquiryResult.prepaid && (
                    <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                      <p className="text-xs font-bold text-amber-700">
                        ⚠️ No Active Subscription
                      </p>

                      <p className="mt-1 text-xs leading-5 text-amber-600">
                        This account has no recorded load transactions. Please
                        contact Descallar Satellite Services.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}