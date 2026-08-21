import { useEffect, useState } from 'react';
import { CheckCircle2, Mail, ShieldCheck } from 'lucide-react';
import UserLayout from '../../components/UserLayout';
import authApi from '../../api/authApi';

export default function AccountSecurity() {
  const [security, setSecurity] = useState(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadSecurity = async () => {
    try {
      const response = await authApi.customerSecurityInfo();
      setSecurity(response.data);
      setEmail(response.data.email || '');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load account security.');
    }
  };

  useEffect(() => {
    loadSecurity();
  }, []);

  const sendCode = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const response = await authApi.requestEmailVerification({ email });
      setCodeSent(true);
      setMessage(response.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const response = await authApi.confirmEmailVerification({ code });
      const current = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...current, ...response.data.user }));
      setCode('');
      setCodeSent(false);
      setMessage(response.data.message);
      await loadSecurity();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to verify email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserLayout>
      <main className="mx-auto min-h-[calc(100vh-5rem)] w-full max-w-3xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-lg sm:p-8">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-red-50 p-3 text-[#cc0000]"><ShieldCheck size={24} /></div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Account Security</h1>
              <p className="mt-1 text-sm text-gray-500">Verify an optional recovery email so you can reset your password without waiting for Admin assistance.</p>
            </div>
          </div>

          {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {message && <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}

          <section className="mt-7 rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Recovery Email</p>
                <p className="mt-1 text-sm text-gray-700">Account Number: {security?.accountNumber || '—'}</p>
              </div>
              {security?.emailVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                  <CheckCircle2 size={14} /> Verified
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Unverified</span>
              )}
            </div>

            <label className="mt-5 block text-xs font-bold uppercase tracking-wide text-gray-600">Email Address</label>
            <div className="relative mt-2">
              <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (security?.email && e.target.value !== security.email) setCodeSent(false);
                }}
                className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-[#cc0000]"
                placeholder="name@example.com"
              />
            </div>

            <button
              type="button"
              onClick={sendCode}
              disabled={loading || !email.trim() || (security?.emailVerified && email === security.email)}
              className="mt-3 rounded-xl bg-[#cc0000] px-5 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Please wait...' : security?.emailVerified && email === security.email ? 'Email Verified' : 'Send Verification Code'}
            </button>

            {codeSent && (
              <div className="mt-5 rounded-2xl bg-gray-50 p-4">
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-600">6-digit Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-center font-mono text-xl font-black tracking-[0.35em] outline-none focus:border-[#cc0000]"
                  placeholder="000000"
                />
                <button
                  type="button"
                  onClick={verifyCode}
                  disabled={loading || code.length !== 6}
                  className="mt-3 w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  Verify Email
                </button>
              </div>
            )}

            <p className="mt-4 text-xs leading-5 text-gray-500">
              Verification codes expire after 10 minutes. Changing your email removes its verified status and requires a new verification code.
            </p>
          </section>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-800">
            Email verification is only for account security and recovery. It does not automatically enroll you in promotional messages.
          </div>
        </div>
      </main>
    </UserLayout>
  );
}
