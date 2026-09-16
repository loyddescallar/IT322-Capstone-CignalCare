import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Search,
  Hash,
  LockKeyhole,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MapPin,
  Phone,
  ExternalLink,
  Tv,
  Eye,
  EyeOff,
  Mail,
  MessageSquareText,
  KeyRound,
  ShieldCheck,
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

function formatInquiryDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPeso(value) {
  if (value === null || value === undefined) return '—';
  return `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Login() {
  const navigate = useNavigate();

  const [accountNumber, setAccountNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [prepaidModal, setPrepaidModal] = useState(false);
  const [ccaModal, setCcaModal] = useState(false);
  const [inquiryInput, setInquiryInput] = useState('');
  const [inquiryResult, setInquiryResult] = useState(null);
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [recoveryChannel, setRecoveryChannel] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [fullAccountNumber, setFullAccountNumber] = useState('');

  const resetInquiry = () => {
    setInquiryInput('');
    setInquiryResult(null);
    setRecoveryChannel('');
    setRecoveryCode('');
    setRecoveryMessage('');
    setRecoveryError('');
    setFullAccountNumber('');
  };

  const openPrepaidModal = () => {
    setPrepaidModal(true);
    setCcaModal(false);
    resetInquiry();
  };

  const openCcaModal = () => {
    setCcaModal(true);
    setPrepaidModal(false);
    resetInquiry();
  };

  const closeModal = () => {
    setPrepaidModal(false);
    setCcaModal(false);
    resetInquiry();
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!/^\d{1,9}$/.test(accountNumber.trim())) {
      setError('Enter your Account Number using up to 9 digits.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authApi.login({
        accountNumber: accountNumber.trim(),
        password,
      });

      const { token, user, mustChangePassword, passwordChangeToken } = response.data;

      if (mustChangePassword) {
        sessionStorage.setItem('passwordChangeToken', passwordChangeToken);
        sessionStorage.setItem('pendingPasswordUser', JSON.stringify(user));
        navigate('/change-password');
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/user-dashboard');
    } catch (loginError) {
      setError(loginError.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInquiry = async (event) => {
    event.preventDefault();
    const input = inquiryInput.trim();
    const valid = prepaidModal ? /^\d{1,9}$/.test(input) : /^\d{1,11}$/.test(input);
    if (!valid) {
      setInquiryResult({ found: false, error: prepaidModal ? 'Enter a valid Account Number of up to 9 digits.' : 'Enter a valid CCA Number of up to 11 digits.' });
      return;
    }

    setInquiryLoading(true);
    setInquiryResult(null);
    setRecoveryChannel('');
    setRecoveryCode('');
    setRecoveryMessage('');
    setRecoveryError('');
    setFullAccountNumber('');

    try {
      const response = prepaidModal
        ? await authApi.prepaidInquiry({ accountNumber: input })
        : await authApi.ccaInquiry({ ccaNumber: input });
      setInquiryResult({ found: true, data: response.data });
    } catch (requestError) {
      setInquiryResult({
        found: false,
        error: requestError.response?.data?.error || 'Unable to complete the inquiry right now.',
      });
    } finally {
      setInquiryLoading(false);
    }
  };

  const startCcaRecovery = async (channel) => {
    setRecoveryError('');
    setRecoveryMessage('');
    setFullAccountNumber('');
    setRecoveryCode('');
    setRecoveryChannel(channel);

    if (channel === 'recovery_code') return;

    setRecoveryLoading(true);
    try {
      const response = await authApi.startCcaRecovery({ ccaNumber: inquiryInput.trim(), channel });
      setRecoveryMessage(response.data?.message || 'Verification code sent.');
    } catch (requestError) {
      setRecoveryError(requestError.response?.data?.error || 'Unable to send the verification code.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const verifyCcaRecovery = async () => {
    setRecoveryError('');
    setRecoveryMessage('');
    if (!recoveryChannel) return;
    if (recoveryChannel !== 'recovery_code' && !/^\d{6}$/.test(recoveryCode.trim())) {
      setRecoveryError('Enter the 6-digit verification code.');
      return;
    }
    if (recoveryChannel === 'recovery_code' && !recoveryCode.trim()) {
      setRecoveryError('Enter your recovery code.');
      return;
    }

    setRecoveryLoading(true);
    try {
      const response = await authApi.verifyCcaRecovery({
        ccaNumber: inquiryInput.trim(),
        channel: recoveryChannel,
        code: recoveryCode.trim(),
      });
      setFullAccountNumber(response.data?.accountNumber || '');
      setRecoveryMessage('Identity verified. Your Account Number is shown below.');
    } catch (requestError) {
      setRecoveryError(requestError.response?.data?.error || 'Unable to verify account recovery.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-slate-950">
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
      <main className="relative z-10 flex min-h-[100dvh] items-center px-3 py-6 sm:px-8 sm:py-8 lg:px-12 xl:px-20">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] xl:gap-20">
          {/* Desktop branding and inquiry actions */}
          <section className="hidden text-white lg:block">
            <div className="max-w-xl">
              <h2 className="mt-6 text-5xl font-bold leading-[1.08] tracking-tight xl:text-6xl">
                CignalCare+
                <span className="block text-red-400">
                  Descallar Satellite Services
                </span>
              </h2>

              <p className="formal-long-text mt-6 max-w-lg text-base leading-7 text-white/75">
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

              <div className="rounded-[24px] border border-white/25 bg-white/95 p-5 shadow-2xl backdrop-blur-xl sm:rounded-[28px] sm:p-8">
                <div className="mb-7">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="h-7 w-1.5 rounded-full bg-[#cc0000]" />

                    <h2 className="text-2xl font-bold text-gray-900">
                      User Login
                    </h2>
                  </div>

                  <p className="formal-long-text text-sm leading-6 text-gray-500">
                    Existing subscribers can sign in using the Account Number and temporary or personal password issued for their CignalCare+ account.
                  </p>
                </div>

                {error && (
                  <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label htmlFor="accountNumber" className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                      Account Number
                    </label>
                    <div className="relative">
                      <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        id="accountNumber"
                        type="text"
                        inputMode="numeric"
                        maxLength={9}
                        value={accountNumber}
                        onChange={(event) => {
                          setAccountNumber(event.target.value.replace(/\D/g, '').slice(0, 9));
                          if (error) setError('');
                        }}
                        autoComplete="username"
                        placeholder="Account Number (up to 9 digits)"
                        className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-11 pr-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#cc0000] focus:ring-4 focus:ring-red-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                      Password
                    </label>
                    <div className="relative">
                      <LockKeyhole size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          if (error) setError('');
                        }}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-11 pr-12 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#cc0000] focus:ring-4 focus:ring-red-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
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

                <div className="mt-5 flex flex-col gap-2 text-center">
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-xs font-bold text-[#cc0000] hover:underline"
                  >
                    Forgot Password / Use Recovery Code
                  </button>
                  <p className="text-xs leading-5 text-gray-500">
                    Lost both your password and recovery code? Contact Descallar Satellite Services for identity verification and new temporary credentials.
                  </p>
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
                      <p className="text-xs font-bold text-gray-900">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={prepaidModal ? 'Prepaid Account Inquiry' : 'CCA Inquiry'}
        >
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl sm:max-h-[92dvh]">
            <div className={`flex flex-shrink-0 items-center justify-between px-5 py-4 text-white ${prepaidModal ? 'bg-gradient-to-r from-[#cc0000] to-[#880000]' : 'bg-gradient-to-r from-gray-950 to-gray-800'}`}>
              <div>
                <p className="text-sm font-bold">{prepaidModal ? 'Prepaid Inquiry' : 'CCA Account Number Recovery'}</p>
                <p className="mt-0.5 text-xs text-white/70">Descallar Satellite Services</p>
              </div>
              <button type="button" onClick={closeModal} className="rounded-xl p-2 transition hover:bg-white/20" aria-label="Close inquiry">
                <X size={17} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <p className="formal-long-text mb-4 text-xs leading-5 text-gray-500">
                {prepaidModal
                  ? 'Enter your Account Number to quickly check whether your current prepaid plan is active, expired, or inactive. This inquiry uses the stored prepaid account record and does not estimate validity from a generic 30-day rule.'
                  : 'Enter your CCA Number to confirm the subscriber record. For privacy, the Account Number remains masked until you verify ownership using an available recovery method.'}
              </p>

              <form onSubmit={handleInquiry} className="mb-4 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={prepaidModal ? 9 : 11}
                  value={inquiryInput}
                  onChange={(event) => {
                    setInquiryInput(event.target.value.replace(/\D/g, '').slice(0, prepaidModal ? 9 : 11));
                    setInquiryResult(null);
                    setRecoveryChannel('');
                    setRecoveryCode('');
                    setRecoveryMessage('');
                    setRecoveryError('');
                    setFullAccountNumber('');
                  }}
                  placeholder={prepaidModal ? 'Enter Account Number' : 'Enter CCA Number'}
                  autoFocus
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3.5 py-3 text-xs outline-none transition focus:border-[#cc0000] focus:ring-4 focus:ring-red-100"
                />
                <button
                  type="submit"
                  disabled={inquiryLoading || !inquiryInput.trim()}
                  className="w-full rounded-xl bg-[#cc0000] px-5 py-3 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {inquiryLoading ? 'Checking...' : 'Check'}
                </button>
              </form>

              {inquiryResult && !inquiryResult.found && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
                  {inquiryResult.error || 'No matching record was found.'}
                </div>
              )}

              {prepaidModal && inquiryResult?.found && inquiryResult.data && (
                <div className="space-y-3">
                  <div className={`rounded-2xl border p-4 ${inquiryResult.data.status === 'Active' ? 'border-green-200 bg-green-50' : inquiryResult.data.status === 'Expired' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Prepaid Status</p>
                        <p className="mt-1 text-xl font-bold text-slate-900">{inquiryResult.data.status}</p>
                      </div>
                      {inquiryResult.data.status === 'Active' ? <CheckCircle2 className="text-green-600" /> : inquiryResult.data.status === 'Expired' ? <XCircle className="text-red-600" /> : <AlertTriangle className="text-amber-600" />}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['Account', inquiryResult.data.accountNumberMasked || '—'],
                      ['Current Plan', inquiryResult.data.planName || 'No active plan'],
                      ['Days Remaining', inquiryResult.data.status === 'Active' ? `${inquiryResult.data.daysRemaining} day${inquiryResult.data.daysRemaining === 1 ? '' : 's'}` : '0 days'],
                      ['Expiry Date', formatInquiryDate(inquiryResult.data.expiryDate)],
                      ['Last Load', formatPeso(inquiryResult.data.lastLoadAmount)],
                      ['Last Load Date', formatInquiryDate(inquiryResult.data.lastLoadDate)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                        <p className="mt-1 break-words text-xs font-bold text-slate-800">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ccaModal && inquiryResult?.found && inquiryResult.data && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800"><ShieldCheck size={17} className="text-[#cc0000]" /> Subscriber record found</div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ['Subscriber', inquiryResult.data.subscriber?.name || '—'],
                        ['Account No.', inquiryResult.data.subscriber?.accountNumberMasked || '—'],
                        ['Service Location', inquiryResult.data.subscriber?.location || '—'],
                        ['Account Status', inquiryResult.data.subscriber?.status || '—'],
                      ].map(([label, value]) => (
                        <div key={label} className="min-w-0">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                          <p className="mt-1 break-words text-xs font-bold capitalize text-slate-800">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!fullAccountNumber ? (
                    <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4">
                      <p className="text-xs font-bold text-slate-800">Recover full Account Number</p>
                      <p className="formal-long-text mt-1 text-xs leading-5 text-slate-500">Choose a recovery method that you can access. The full Account Number is revealed only after successful verification.</p>

                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <button
                          type="button"
                          disabled={!inquiryResult.data.recovery?.emailAvailable || recoveryLoading}
                          onClick={() => startCcaRecovery('email')}
                          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        ><Mail size={14} /> Email OTP</button>
                        <button
                          type="button"
                          disabled={!inquiryResult.data.recovery?.smsAvailable || recoveryLoading}
                          onClick={() => startCcaRecovery('sms')}
                          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        ><MessageSquareText size={14} /> SMS OTP</button>
                        <button
                          type="button"
                          disabled={!inquiryResult.data.recovery?.recoveryCodeAvailable || recoveryLoading}
                          onClick={() => startCcaRecovery('recovery_code')}
                          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        ><KeyRound size={14} /> Recovery Code</button>
                      </div>

                      <div className="mt-2 space-y-1 text-[10px] text-slate-500">
                        {inquiryResult.data.recovery?.maskedEmail && <p>Email: {inquiryResult.data.recovery.maskedEmail}</p>}
                        {inquiryResult.data.recovery?.maskedPhone && <p>SMS: {inquiryResult.data.recovery.maskedPhone}</p>}
                      </div>

                      {recoveryMessage && <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">{recoveryMessage}</div>}
                      {recoveryError && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{recoveryError}</div>}

                      {recoveryChannel && (
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <input
                            type="text"
                            inputMode={recoveryChannel === 'recovery_code' ? 'text' : 'numeric'}
                            maxLength={recoveryChannel === 'recovery_code' ? 64 : 6}
                            value={recoveryCode}
                            onChange={(event) => setRecoveryCode(recoveryChannel === 'recovery_code' ? event.target.value : event.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder={recoveryChannel === 'recovery_code' ? 'Enter recovery code' : 'Enter 6-digit OTP'}
                            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3.5 py-3 text-xs outline-none focus:border-[#cc0000] focus:ring-4 focus:ring-red-100"
                          />
                          <button
                            type="button"
                            onClick={verifyCcaRecovery}
                            disabled={recoveryLoading || !recoveryCode.trim()}
                            className="rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white disabled:opacity-50"
                          >{recoveryLoading ? 'Verifying...' : 'Verify'}</button>
                        </div>
                      )}

                      {!inquiryResult.data.recovery?.emailAvailable && !inquiryResult.data.recovery?.smsAvailable && !inquiryResult.data.recovery?.recoveryCodeAvailable && (
                        <p className="formal-long-text mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">No self-service recovery method is available for this subscriber. Please contact Descallar Satellite Services for identity verification.</p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
                      <CheckCircle2 className="mx-auto text-green-600" size={24} />
                      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-green-700">Verified Account Number</p>
                      <p className="mt-2 font-mono text-2xl font-black tracking-wider text-slate-900">{fullAccountNumber}</p>
                      <p className="mt-2 text-xs text-green-700">Keep this number private and use it to sign in to your CignalCare+ account.</p>
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
