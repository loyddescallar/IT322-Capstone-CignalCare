import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import authApi from '../../api/authApi';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [accountNumber, setAccountNumber] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newRecoveryCode, setNewRecoveryCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!/^\d{1,9}$/.test(accountNumber.trim())) {
      setError('Enter your Account Number using up to 9 digits.');
      return;
    }
    if (!recoveryCode.trim()) {
      setError('Recovery code is required.');
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      setError('Use at least 8 characters with uppercase, lowercase, and a number.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.recoverPassword({
        accountNumber: accountNumber.trim(),
        recoveryCode: recoveryCode.trim(),
        password,
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setNewRecoveryCode(response.data.recoveryCode || '');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to recover your account.');
    } finally {
      setLoading(false);
    }
  };

  if (newRecoveryCode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
        <div className="w-full max-w-md rounded-[28px] bg-white p-7 shadow-2xl sm:p-8">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-xl bg-green-50 p-3 text-green-700"><ShieldCheck size={23} /></div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Account Recovered</h1>
              <p className="mt-1 text-sm leading-5 text-gray-500">Your password was changed and older sessions were revoked.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-800">New Recovery Code</p>
            <p className="mt-2 break-all font-mono text-lg font-black text-gray-900">{newRecoveryCode}</p>
            <p className="mt-2 text-xs leading-5 text-amber-800">Save this code somewhere private. Your previous recovery code can no longer be used.</p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/user-dashboard', { replace: true })}
            className="mt-5 w-full rounded-xl bg-[#cc0000] py-3 text-sm font-bold text-white hover:bg-red-700"
          >
            I Saved It — Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md rounded-[28px] bg-white p-7 shadow-2xl sm:p-8">
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-xl bg-red-50 p-3 text-[#cc0000]"><KeyRound size={23} /></div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Recover Customer Account</h1>
            <p className="mt-1 text-sm leading-5 text-gray-500">Use the recovery code issued with your subscriber credentials.</p>
          </div>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Account Number</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={9}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
              autoComplete="username"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#cc0000]"
              placeholder="Your Account Number"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Recovery Code</label>
            <input
              type="text"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
              autoComplete="off"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm uppercase outline-none focus:border-[#cc0000]"
              placeholder="XXXX-XXXX-XXXX-XXXX"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">New Password</label>
            <div className="relative">
              <LockKeyhole size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-[#cc0000]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#cc0000]"
            />
          </div>

          <p className="text-xs leading-5 text-gray-500">Minimum 8 characters with uppercase, lowercase, and a number.</p>

          <button
            disabled={loading}
            className="w-full rounded-xl bg-[#cc0000] py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? 'Recovering...' : 'Reset Password'}
          </button>
        </form>

        <div className="mt-5 border-t border-gray-100 pt-4 text-center">
          <button type="button" onClick={() => navigate('/login')} className="text-xs font-bold text-blue-600 hover:underline">
            Back to Customer Login
          </button>
          <p className="mt-2 text-xs leading-5 text-gray-500">Lost your recovery code too? Contact Descallar Satellite Services for identity verification and new temporary credentials.</p>
        </div>
      </div>
    </div>
  );
}
