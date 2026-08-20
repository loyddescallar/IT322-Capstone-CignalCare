import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import authApi from '../../api/authApi';

export default function ChangePassword() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('passwordChangeToken');
  const pendingUser = (() => {
    try { return JSON.parse(sessionStorage.getItem('pendingPasswordUser') || 'null'); }
    catch { return null; }
  })();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) return <Navigate to="/login" replace />;

  const submit = async (event) => {
    event.preventDefault();
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      setError('Use at least 8 characters with uppercase, lowercase, and a number.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await authApi.changePassword(password, token);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      sessionStorage.removeItem('passwordChangeToken');
      sessionStorage.removeItem('pendingPasswordUser');
      navigate('/user-dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to change password. Please log in again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md rounded-[28px] bg-white p-7 shadow-2xl sm:p-8">
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-xl bg-red-50 p-3 text-[#cc0000]"><ShieldCheck size={23} /></div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Secure Your Account</h1>
            <p className="mt-1 text-sm leading-5 text-gray-500">
              {pendingUser?.accountName ? `${pendingUser.accountName}, ` : ''}replace your temporary password before continuing.
            </p>
          </div>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">New Password</label>
            <div className="relative">
              <LockKeyhole size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-[#cc0000]" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#cc0000]" />
          </div>
          <p className="text-xs leading-5 text-gray-500">Minimum 8 characters with uppercase, lowercase, and a number.</p>
          <button disabled={loading} className="w-full rounded-xl bg-[#cc0000] py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">
            {loading ? 'Saving...' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
