import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import authApi from '../../api/authApi';

function formatDate(value) {
  if (!value) return 'Not recorded yet';
  return new Date(value).toLocaleString('en-PH');
}

function saveUpdatedSession(data) {
  if (data?.token) localStorage.setItem('token', data.token);
  if (data?.user) {
    localStorage.setItem('adminUser', JSON.stringify(data.user));
    localStorage.setItem('user', JSON.stringify(data.user));
  }
}

export default function AdminSecurity() {
  const [security, setSecurity] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [contactChannel, setContactChannel] = useState('');
  const [contactCode, setContactCode] = useState('');
  const [contactCodeSent, setContactCodeSent] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState([]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [securityResponse, logsResponse] = await Promise.all([
        authApi.adminSecurityInfo(),
        authApi.adminAuditLogs(),
      ]);
      setSecurity(securityResponse.data?.security || null);
      setEmail(securityResponse.data?.security?.recoveryEmail || '');
      setPhone(securityResponse.data?.security?.recoveryPhone || '');
      setLogs(logsResponse.data?.logs || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to load security settings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const credentials = () => ({ currentPassword, totpCode });

  const run = async (name, callback) => {
    if (!currentPassword || !/^\d{6}$/.test(totpCode)) {
      setError('Enter your current admin password and 6-digit Authenticator code first.');
      return;
    }
    setBusy(name);
    setError('');
    setMessage('');
    try {
      await callback();
      setCurrentPassword('');
      setTotpCode('');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Security action failed.');
    } finally {
      setBusy('');
    }
  };


  const startContactVerification = async (channel) => {
    if (!currentPassword || !/^\d{6}$/.test(totpCode)) {
      setError('Enter your current admin password and 6-digit Authenticator code first.');
      return;
    }
    const value = channel === 'email' ? email : phone;
    if (!String(value || '').trim()) {
      setError(channel === 'email' ? 'Enter an email address.' : 'Enter a Philippine mobile number.');
      return;
    }
    setBusy(`contact-${channel}`);
    setError('');
    setMessage('');
    try {
      const response = await authApi.adminContactVerificationStart({ ...credentials(), channel, value });
      setContactChannel(channel);
      setContactCode('');
      setContactCodeSent(true);
      setMessage(response.data?.message || 'Verification code sent.');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to send verification code.');
    } finally {
      setBusy('');
    }
  };

  const confirmContactVerification = async () => {
    if (!contactChannel || !/^\d{6}$/.test(contactCode)) {
      setError('Enter the 6-digit verification code.');
      return;
    }
    setBusy('contact-confirm');
    setError('');
    setMessage('');
    try {
      const response = await authApi.adminContactVerificationConfirm({ channel: contactChannel, code: contactCode });
      setContactCode('');
      setContactCodeSent(false);
      setCurrentPassword('');
      setTotpCode('');
      setMessage(response.data?.message || 'Security contact verified.');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to verify security contact.');
    } finally {
      setBusy('');
    }
  };

  const copyCodes = async () => {
    await navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setMessage('Recovery codes copied. Store them somewhere offline and secure.');
  };

  if (loading && !security) {
    return <div className="rounded-2xl bg-white p-8 text-sm text-gray-500 shadow-sm">Loading admin security…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-red-600"><ShieldCheck size={18} /> Admin Security Center</div>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Protect administrator access</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">Password, Email/SMS OTP, Authenticator fallback, recovery codes, session revocation, and security activity are managed here.</p>
          </div>
          <button onClick={load} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:w-auto"><RefreshCw size={16} /> Refresh</button>
        </div>

        {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {message && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 p-4"><p className="text-xs font-bold uppercase tracking-wide text-gray-400">Secure Username</p><p className="mt-2 font-bold text-gray-900">{security?.username || '—'}</p></div>
          <div className="rounded-xl border border-gray-200 p-4"><p className="text-xs font-bold uppercase tracking-wide text-gray-400">Two-Factor Authentication</p><p className="mt-2 flex items-center gap-2 font-bold text-emerald-700"><CheckCircle2 size={17} /> {security?.emailOtpAvailable || security?.smsOtpAvailable ? 'Email/SMS Ready' : security?.twoFactorEnabled ? 'Authenticator Ready' : 'Needs setup'}</p></div>
          <div className="rounded-xl border border-gray-200 p-4"><p className="text-xs font-bold uppercase tracking-wide text-gray-400">Last Secure Login</p><p className="mt-2 text-sm font-semibold text-gray-900">{formatDate(security?.lastLoginAt)}</p></div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900"><LockKeyhole size={19} className="text-red-600" /> Security Verification</h2>
            <p className="mt-1 text-xs leading-5 text-gray-500">Sensitive changes require both your current password and current Authenticator code.</p>
            <div className="mt-4 space-y-3">
              <div className="relative"><input type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current admin password" className="w-full rounded-xl border border-gray-200 py-3 pl-4 pr-12 text-sm outline-none focus:border-red-500" /><button type="button" onClick={() => setShowCurrentPassword((visible) => !visible)} aria-label={showCurrentPassword ? 'Hide current admin password' : 'Show current admin password'} aria-pressed={showCurrentPassword} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-200">{showCurrentPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
              <div className="relative"><Smartphone size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input inputMode="numeric" maxLength={6} value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))} placeholder="6-digit Authenticator code" className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-red-500" /></div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900"><Mail size={19} className="text-red-600" /> OTP Login Contacts</h2>
            <p className="mt-1 text-xs leading-5 text-gray-500">Verify an email and/or mobile number once. After verification, either can be selected instead of opening an Authenticator app during Admin login.</p>

            <div className="mt-4 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-gray-900">Email OTP</p>{security?.emailVerified ? <span className="text-xs font-bold text-emerald-700">Verified</span> : <span className="text-xs font-bold text-amber-700">Unverified</span>}</div>
              <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setContactCodeSent(false); }} placeholder="admin@example.com" className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-red-500" />
              <button disabled={busy === 'contact-email'} onClick={() => startContactVerification('email')} className="mt-3 w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white disabled:opacity-50">{security?.emailVerified && email === security?.recoveryEmail ? 'Re-verify / Change Email' : 'Send Email Verification Code'}</button>
            </div>

            <div className="mt-3 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-gray-900">SMS OTP</p>{security?.phoneVerified ? <span className="text-xs font-bold text-emerald-700">Verified</span> : <span className="text-xs font-bold text-amber-700">Unverified</span>}</div>
              <div className="relative mt-3"><Smartphone size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setContactCodeSent(false); }} placeholder="09XXXXXXXXX" className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-red-500" /></div>
              <button disabled={busy === 'contact-sms'} onClick={() => startContactVerification('sms')} className="mt-3 w-full rounded-xl bg-[#cc0000] py-3 text-sm font-bold text-white disabled:opacity-50">{security?.phoneVerified && phone === security?.recoveryPhone ? 'Re-verify / Change Mobile' : 'Send SMS Verification Code'}</button>
            </div>

            {contactCodeSent && (
              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{contactChannel === 'email' ? 'Email' : 'SMS'} verification code</p>
                <input inputMode="numeric" maxLength={6} value={contactCode} onChange={(e) => setContactCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-center font-mono text-xl font-bold tracking-[0.35em] outline-none focus:border-red-500" />
                <button disabled={busy === 'contact-confirm' || contactCode.length !== 6} onClick={confirmContactVerification} className="mt-3 w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white disabled:opacity-50">Verify Contact</button>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-gray-900">Account Protection Actions</h2>
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start gap-3"><LockKeyhole size={19} className="mt-0.5 text-red-600" /><div className="flex-1"><p className="font-bold text-gray-900">Change Admin Password</p><p className="text-xs leading-5 text-gray-500">Changing the password automatically invalidates all older admin sessions.</p></div></div>
                <div className="relative mt-3"><input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (12+ chars, upper/lower/number/symbol)" className="w-full rounded-xl border border-gray-200 py-3 pl-4 pr-12 text-sm outline-none focus:border-red-500" /><button type="button" onClick={() => setShowNewPassword((visible) => !visible)} aria-label={showNewPassword ? 'Hide new admin password' : 'Show new admin password'} aria-pressed={showNewPassword} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-200">{showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
                <button disabled={busy === 'password'} onClick={() => run('password', async () => { const response = await authApi.adminChangePassword({ ...credentials(), newPassword }); saveUpdatedSession(response.data); setNewPassword(''); setMessage(response.data?.message || 'Password changed.'); })} className="mt-3 rounded-xl bg-[#cc0000] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Change Password</button>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start gap-3"><KeyRound size={19} className="mt-0.5 text-red-600" /><div className="flex-1"><p className="font-bold text-gray-900">Replace Recovery Codes</p><p className="text-xs leading-5 text-gray-500">All previously saved recovery codes become invalid immediately.</p></div></div>
                <button disabled={busy === 'codes'} onClick={() => run('codes', async () => { const response = await authApi.adminRegenerateRecoveryCodes(credentials()); setRecoveryCodes(response.data?.recoveryCodes || []); setMessage('New recovery codes generated. Save them now.'); })} className="mt-3 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-800 disabled:opacity-50">Generate New Codes</button>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                <div className="flex items-start gap-3"><ShieldCheck size={19} className="mt-0.5 text-red-600" /><div className="flex-1"><p className="font-bold text-gray-900">Revoke Other Admin Sessions</p><p className="text-xs leading-5 text-gray-500">Invalidates every previously issued admin token while keeping this browser signed in with a new session.</p></div></div>
                <button disabled={busy === 'sessions'} onClick={() => run('sessions', async () => { const response = await authApi.adminRevokeSessions(credentials()); saveUpdatedSession(response.data); setMessage(response.data?.message || 'Older sessions revoked.'); })} className="mt-3 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Revoke Other Sessions</button>
              </div>
            </div>
          </section>

          {recoveryCodes.length > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-6">
              <h2 className="font-bold text-amber-900">Save these codes now</h2>
              <p className="mt-1 text-xs leading-5 text-amber-800">They are only displayed after generation. Do not commit them to GitHub.</p>
              <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl bg-white p-4 font-mono text-sm text-gray-900 sm:grid-cols-2">{recoveryCodes.map((code) => <span key={code}>{code}</span>)}</div>
              <button onClick={copyCodes} className="mt-3 flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-bold text-amber-900"><Copy size={16} /> Copy Codes</button>
            </section>
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-bold text-gray-900"><Clock3 size={19} className="text-red-600" /> Recent Security Activity</h2><p className="mt-1 text-xs text-gray-500">Authentication and administrator write actions are recorded for review.</p></div></div>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[720px] text-left text-sm">
            <thead><tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400"><th className="px-3 py-3">Time</th><th className="px-3 py-3">Action</th><th className="px-3 py-3">IP</th><th className="px-3 py-3">Details</th></tr></thead>
            <tbody>{logs.length ? logs.map((log) => <tr key={log.event_id} className="border-b border-gray-100"><td className="whitespace-nowrap px-3 py-3 text-gray-500">{formatDate(log.created_at)}</td><td className="px-3 py-3 font-semibold text-gray-900">{log.action}</td><td className="px-3 py-3 text-gray-500">{log.ip_address || '—'}</td><td className="max-w-lg px-3 py-3 text-gray-500">{log.details || '—'}</td></tr>) : <tr><td colSpan="4" className="px-3 py-8 text-center text-gray-400">No security activity recorded yet.</td></tr>}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
