import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  KeyRound,
  LockKeyhole,
  Mail,
  RefreshCw,
  Satellite,
  ShieldCheck,
  Smartphone,
  User,
} from 'lucide-react';
import authApi from '../../api/authApi';

function saveAdminSession(data) {
  localStorage.setItem('token', data.token);
  localStorage.setItem('adminUser', JSON.stringify(data.user));
  localStorage.setItem('user', JSON.stringify(data.user));
}

function Field({ label, icon: Icon, ...props }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-white/55">{label}</label>
      <div className="relative">
        {Icon && <Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />}
        <input
          {...props}
          className={`w-full rounded-xl border border-white/10 bg-black/30 py-3.5 ${Icon ? 'pl-11' : 'pl-4'} pr-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-red-500 focus:ring-4 focus:ring-red-500/10`}
        />
      </div>
    </div>
  );
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('loading');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const [legacyUsername, setLegacyUsername] = useState('admin');
  const [legacyAdminId, setLegacyAdminId] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [setupSecret, setSetupSecret] = useState('');

  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);

  useEffect(() => {
    authApi.adminSecurityStatus()
      .then((response) => setMode(response.data?.configured ? 'login' : 'setupLegacy'))
      .catch(() => {
        setError('Unable to check admin security status. Confirm the backend is running.');
        setMode('login');
      });
  }, []);

  const run = async (callback) => {
    setLoading(true);
    setError('');
    setNotice('');
    try { await callback(); } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || 'Request failed.');
    } finally { setLoading(false); }
  };

  const handleLogin = (event) => {
    event.preventDefault();
    run(async () => {
      const response = await authApi.adminLogin({ username: username.trim(), password });
      if (!response.data?.requiresTwoFactor) throw new Error('Two-factor verification was not started.');
      setChallengeToken(response.data.challengeToken);
      setTotpCode('');
      setMode('twoFactor');
    });
  };

  const handleTwoFactor = (event) => {
    event.preventDefault();
    run(async () => {
      const response = await authApi.adminVerifyTwoFactor({ challengeToken, code: totpCode });
      saveAdminSession(response.data);
      navigate('/admin-dashboard');
    });
  };

  const handleSetupStart = (event) => {
    event.preventDefault();
    run(async () => {
      const response = await authApi.adminBootstrapStart({
        legacyUsername: legacyUsername.trim(),
        legacyAdminId: legacyAdminId.trim(),
        username: newUsername.trim(),
      });
      setSetupToken(response.data.setupToken);
      setSetupSecret(response.data.secret);
      setTotpCode('');
      setMode('setupTotp');
    });
  };

  const handleSetupComplete = (event) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');
    run(async () => {
      const response = await authApi.adminBootstrapComplete({
        setupToken,
        email: recoveryEmail.trim(),
        password: newPassword,
        totpCode,
      });
      saveAdminSession(response.data);
      setRecoveryCodes(response.data.recoveryCodes || []);
      setMode('codes');
    });
  };

  const handleRecoveryStart = (event) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');
    run(async () => {
      const response = await authApi.adminRecoveryStart({
        username: username.trim(),
        recoveryCode: recoveryCode.trim(),
        newPassword,
      });
      setRecoveryToken(response.data.recoveryToken);
      setSetupSecret(response.data.secret);
      setTotpCode('');
      setMode('recoveryTotp');
    });
  };

  const handleRecoveryComplete = (event) => {
    event.preventDefault();
    run(async () => {
      const response = await authApi.adminRecoveryComplete({ recoveryToken, totpCode });
      saveAdminSession(response.data);
      setRecoveryCodes(response.data.recoveryCodes || []);
      setMode('codes');
    });
  };

  const copyText = async (value) => {
    await navigator.clipboard.writeText(value);
    setNotice('Copied to clipboard.');
  };

  const title = mode === 'setupLegacy' || mode === 'setupTotp'
    ? 'Secure Admin Setup'
    : mode === 'recover' || mode === 'recoveryTotp'
      ? 'Recover Admin Access'
      : mode === 'codes'
        ? 'Save Recovery Codes'
        : mode === 'twoFactor'
          ? 'Two-Step Verification'
          : 'Admin Login';

  return (
    <div className="fixed inset-0 min-h-[100dvh] overflow-y-auto bg-black">
      <video autoPlay muted loop playsInline preload="auto" className="fixed left-1/2 top-1/2 z-0 h-[100dvh] w-[100dvw] -translate-x-1/2 -translate-y-1/2 scale-110 object-cover">
        <source src="/video/admin_background.mp4?v=3" type="video/mp4" />
      </video>
      <div className="fixed inset-0 z-10 bg-black/35" />

      <main className="relative z-20 flex min-h-[100dvh] items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-[28px] border border-white/20 bg-[#10151f]/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mb-7 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-600/15 text-red-400">
              <ShieldCheck size={23} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">CignalCare+ Security</p>
              <h1 className="mt-1 text-2xl font-black text-white">{title}</h1>
              <p className="mt-1 text-xs leading-5 text-white/50">Descallar Satellite Services · Authorized personnel only</p>
            </div>
          </div>

          {error && <div className="mb-5 rounded-xl border border-red-500/30 bg-red-950/45 px-4 py-3 text-sm text-red-200">{error}</div>}
          {notice && <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-950/35 px-4 py-3 text-sm text-emerald-200">{notice}</div>}

          {mode === 'loading' && <div className="py-10 text-center text-sm text-white/60">Checking admin security…</div>}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <Field label="Admin Username" icon={User} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="Enter admin username" required />
              <Field label="Password" icon={LockKeyhole} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter admin password" required />
              <button disabled={loading} className="w-full rounded-xl bg-[#cc0000] py-3.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60">{loading ? 'Checking…' : 'Continue Secure Login'}</button>
              <button type="button" onClick={() => { setError(''); setNewPassword(''); setConfirmPassword(''); setRecoveryCode(''); setMode('recover'); }} className="w-full text-xs font-semibold text-red-300 hover:text-red-200">Lost access? Use a recovery code</button>
            </form>
          )}

          {mode === 'twoFactor' && (
            <form onSubmit={handleTwoFactor} className="space-y-5">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/65">Open your authenticator app and enter the current 6-digit CignalCare+ code.</div>
              <Field label="Authenticator Code" icon={Smartphone} inputMode="numeric" maxLength={6} value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" required />
              <button disabled={loading} className="w-full rounded-xl bg-[#cc0000] py-3.5 text-sm font-bold text-white disabled:opacity-60">{loading ? 'Verifying…' : 'Verify & Open Dashboard'}</button>
              <button type="button" onClick={() => setMode('login')} className="w-full text-xs font-semibold text-white/55">Back to password login</button>
            </form>
          )}

          {mode === 'setupLegacy' && (
            <form onSubmit={handleSetupStart} className="space-y-5">
              <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-xs leading-5 text-amber-100">One-time migration only. Confirm the existing admin identity, then replace it with password + Authenticator security.</div>
              <Field label="Existing Admin Username" icon={User} value={legacyUsername} onChange={(e) => setLegacyUsername(e.target.value)} required />
              <Field label="Existing Admin ID / Account Number" icon={KeyRound} value={legacyAdminId} onChange={(e) => setLegacyAdminId(e.target.value)} placeholder="Existing admin ID" required />
              <Field label="New Secure Admin Username" icon={ShieldCheck} value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Example: cignal.admin" required />
              <button disabled={loading} className="w-full rounded-xl bg-[#cc0000] py-3.5 text-sm font-bold text-white disabled:opacity-60">{loading ? 'Checking…' : 'Start Security Setup'}</button>
            </form>
          )}

          {mode === 'setupTotp' && (
            <form onSubmit={handleSetupComplete} className="space-y-5">
              <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-4 text-xs leading-5 text-blue-100">
                In Google Authenticator or Microsoft Authenticator, choose <b>Enter a setup key</b> and use this secret:
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2 font-mono text-sm tracking-wider text-white">
                  <span className="min-w-0 flex-1 break-all">{setupSecret}</span>
                  <button type="button" onClick={() => copyText(setupSecret)} className="shrink-0 text-white/60 hover:text-white"><Copy size={16} /></button>
                </div>
              </div>
              <Field label="Recovery Contact Email (Optional)" icon={Mail} type="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="admin@example.com" />
              <Field label="New Admin Password" icon={LockKeyhole} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="12+ chars, upper/lower/number/symbol" required />
              <Field label="Confirm Password" icon={LockKeyhole} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              <Field label="Authenticator Code" icon={Smartphone} inputMode="numeric" maxLength={6} value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" required />
              <button disabled={loading} className="w-full rounded-xl bg-[#cc0000] py-3.5 text-sm font-bold text-white disabled:opacity-60">{loading ? 'Securing account…' : 'Complete Secure Setup'}</button>
            </form>
          )}

          {mode === 'recover' && (
            <form onSubmit={handleRecoveryStart} className="space-y-5">
              <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-xs leading-5 text-amber-100">A saved recovery code can recover a compromised/lost admin account. The used code, old 2FA secret, old password, and all existing sessions will be replaced.</div>
              <Field label="Admin Username" icon={User} value={username} onChange={(e) => setUsername(e.target.value)} required />
              <Field label="Recovery Code" icon={KeyRound} value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX" required />
              <Field label="New Admin Password" icon={LockKeyhole} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              <Field label="Confirm New Password" icon={LockKeyhole} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              <button disabled={loading} className="w-full rounded-xl bg-[#cc0000] py-3.5 text-sm font-bold text-white disabled:opacity-60">{loading ? 'Checking recovery code…' : 'Continue Recovery'}</button>
              <button type="button" onClick={() => setMode('login')} className="w-full text-xs font-semibold text-white/55">Back to login</button>
            </form>
          )}

          {mode === 'recoveryTotp' && (
            <form onSubmit={handleRecoveryComplete} className="space-y-5">
              <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-4 text-xs leading-5 text-blue-100">
                Remove/ignore the old CignalCare+ authenticator entry and create a new one using this setup key:
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2 font-mono text-sm tracking-wider text-white">
                  <span className="min-w-0 flex-1 break-all">{setupSecret}</span>
                  <button type="button" onClick={() => copyText(setupSecret)} className="shrink-0 text-white/60 hover:text-white"><Copy size={16} /></button>
                </div>
              </div>
              <Field label="New Authenticator Code" icon={Smartphone} inputMode="numeric" maxLength={6} value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" required />
              <button disabled={loading} className="w-full rounded-xl bg-[#cc0000] py-3.5 text-sm font-bold text-white disabled:opacity-60">{loading ? 'Recovering…' : 'Finish Recovery'}</button>
            </form>
          )}

          {mode === 'codes' && (
            <div className="space-y-5">
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-xs leading-5 text-emerald-100"><CheckCircle2 size={18} className="mb-2" />Security setup completed. These recovery codes are shown only now. Store them offline, not in GitHub or the browser.</div>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/25 p-4 font-mono text-sm text-white">
                {recoveryCodes.map((code) => <div key={code}>{code}</div>)}
              </div>
              <button type="button" onClick={() => copyText(recoveryCodes.join('\n'))} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white"><Copy size={16} />Copy Recovery Codes</button>
              <button type="button" onClick={() => navigate('/admin-dashboard')} className="w-full rounded-xl bg-[#cc0000] py-3.5 text-sm font-bold text-white">I Saved Them — Open Dashboard</button>
            </div>
          )}

          {mode !== 'codes' && (
            <button type="button" onClick={() => navigate('/login')} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold text-white/55 transition hover:bg-white/10 hover:text-white">
              <ArrowLeft size={15} /> Back to Customer Login
            </button>
          )}

          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-white/35"><Satellite size={13} /> CignalCare+ Admin Security</div>
        </div>
      </main>
    </div>
  );
}
