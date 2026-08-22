import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import authApi from '../../api/authApi';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [accountNumber, setAccountNumber] = useState('');
  const [optionsChecked, setOptionsChecked] = useState(false);
  const [options, setOptions] = useState({
    emailVerified: false,
    emailAvailable: false,
    maskedEmail: null,
    recoveryCodeAvailable: false,
    emailDeliveryConfigured: true,
  });
  const [method, setMethod] = useState('code');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newRecoveryCode, setNewRecoveryCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validAccount = /^\d{1,9}$/.test(accountNumber.trim());
  const validPassword =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password);

  const resetMessages = () => {
    setError('');
    setMessage('');
  };

  const resetRecoveryState = () => {
    setOptionsChecked(false);
    setOptions({
      emailVerified: false,
      emailAvailable: false,
      maskedEmail: null,
      recoveryCodeAvailable: false,
      emailDeliveryConfigured: true,
    });
    setMethod('code');
    setRecoveryCode('');
    setEmailCode('');
    setEmailCodeSent(false);
    setPassword('');
    setConfirmPassword('');
    resetMessages();
  };

  const validatePassword = () => {
    if (!validPassword) {
      setError('Use at least 8 characters with uppercase, lowercase, and a number.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    return true;
  };

  const checkRecoveryOptions = async () => {
    resetMessages();
    if (!validAccount) {
      setError('Enter your Account Number using up to 9 digits.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.recoveryOptions({ accountNumber: accountNumber.trim() });
      const next = response.data || {};
      setOptions({
        emailVerified: Boolean(next.emailVerified),
        emailAvailable: Boolean(next.emailAvailable),
        maskedEmail: next.maskedEmail || null,
        recoveryCodeAvailable: Boolean(next.recoveryCodeAvailable),
        emailDeliveryConfigured: next.emailDeliveryConfigured !== false,
      });
      setOptionsChecked(true);
      setEmailCodeSent(false);
      setEmailCode('');

      if (next.emailAvailable) {
        setMethod('email');
        setMessage(`Verified email recovery is available${next.maskedEmail ? ` at ${next.maskedEmail}` : ''}.`);
      } else if (next.recoveryCodeAvailable) {
        setMethod('code');
        if (next.emailVerified && next.emailDeliveryConfigured === false) {
          setMessage('Your email is verified, but email delivery is temporarily unavailable. Use your recovery code.');
        } else {
          setMessage('No verified recovery email is available for this account. Use your recovery code.');
        }
      } else {
        setMethod('code');
        setMessage('No self-service recovery method is currently available. Contact Descallar Satellite Services for identity verification and new temporary credentials.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to check recovery options.');
    } finally {
      setLoading(false);
    }
  };

  const startEmailRecovery = async () => {
    resetMessages();
    if (!options.emailAvailable) {
      setError('Verified email recovery is not available for this account.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.startEmailRecovery({ accountNumber: accountNumber.trim() });
      setEmailCodeSent(true);
      setMessage(response.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to start email recovery.');
    } finally {
      setLoading(false);
    }
  };

  const submitEmailRecovery = async (event) => {
    event.preventDefault();
    resetMessages();

    if (!options.emailAvailable) {
      setError('Verified email recovery is not available for this account.');
      return;
    }
    if (!/^\d{6}$/.test(emailCode)) {
      setError('Enter the 6-digit reset code sent to your verified email.');
      return;
    }
    if (!validatePassword()) return;

    setLoading(true);
    try {
      const response = await authApi.completeEmailRecovery({
        accountNumber: accountNumber.trim(),
        code: emailCode,
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

  const submitRecoveryCode = async (event) => {
    event.preventDefault();
    resetMessages();

    if (!options.recoveryCodeAvailable) {
      setError('A recovery code is not available for this account. Contact Descallar Satellite Services.');
      return;
    }
    if (!recoveryCode.trim()) {
      setError('Recovery code is required.');
      return;
    }
    if (!validatePassword()) return;

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
              <h1 className="text-xl font-bold text-gray-900">Account Recovered</h1>
              <p className="mt-1 text-sm leading-5 text-gray-500">Your password was changed and older sessions were revoked.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-800">New Recovery Code</p>
            <p className="mt-2 break-all font-mono text-lg font-bold text-gray-900">{newRecoveryCode}</p>
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
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-xl bg-red-50 p-3 text-[#cc0000]"><KeyRound size={23} /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Recover Customer Account</h1>
            <p className="mt-1 text-sm leading-5 text-gray-500">Enter your Account Number first so CignalCare+ can show the recovery methods available for your account.</p>
          </div>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {message && <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>}

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Account Number</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={9}
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 9));
                if (optionsChecked) resetRecoveryState();
              }}
              disabled={optionsChecked}
              autoComplete="username"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#cc0000] disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="Your Account Number"
            />
          </div>

          {!optionsChecked ? (
            <button
              type="button"
              onClick={checkRecoveryOptions}
              disabled={loading}
              className="w-full rounded-xl bg-[#cc0000] py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? 'Checking...' : 'Continue'}
            </button>
          ) : (
            <button
              type="button"
              onClick={resetRecoveryState}
              className="w-full text-xs font-bold text-blue-600 hover:underline"
            >
              Use a different Account Number
            </button>
          )}
        </div>

        {optionsChecked && (options.emailAvailable || options.recoveryCodeAvailable) && (
          <>
            <div className="my-5 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                disabled={!options.emailAvailable}
                onClick={() => { setMethod('email'); resetMessages(); }}
                className={`rounded-lg px-3 py-2 text-xs font-bold ${method === 'email' ? 'bg-white text-[#cc0000] shadow-sm' : 'text-gray-500'} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                Verified Email
              </button>
              <button
                type="button"
                disabled={!options.recoveryCodeAvailable}
                onClick={() => { setMethod('code'); resetMessages(); }}
                className={`rounded-lg px-3 py-2 text-xs font-bold ${method === 'code' ? 'bg-white text-[#cc0000] shadow-sm' : 'text-gray-500'} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                Recovery Code
              </button>
            </div>

            {method === 'email' && options.emailAvailable ? (
              <form onSubmit={submitEmailRecovery} className="space-y-4">
                {!emailCodeSent ? (
                  <button
                    type="button"
                    onClick={startEmailRecovery}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#cc0000] py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    <Mail size={16} /> {loading ? 'Sending...' : `Send Code${options.maskedEmail ? ` to ${options.maskedEmail}` : ''}`}
                  </button>
                ) : (
                  <>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">6-digit Email Code</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={emailCode}
                        onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-center font-mono text-xl font-bold tracking-[0.35em] outline-none focus:border-[#cc0000]"
                        placeholder="000000"
                      />
                    </div>
                    <PasswordFields
                      password={password}
                      setPassword={setPassword}
                      confirmPassword={confirmPassword}
                      setConfirmPassword={setConfirmPassword}
                    />
                    <button disabled={loading} className="w-full rounded-xl bg-[#cc0000] py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">
                      {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                    <button type="button" onClick={startEmailRecovery} disabled={loading} className="w-full text-xs font-bold text-blue-600 hover:underline">
                      Resend Code
                    </button>
                  </>
                )}
              </form>
            ) : options.recoveryCodeAvailable ? (
              <form onSubmit={submitRecoveryCode} className="space-y-4">
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
                <PasswordFields
                  password={password}
                  setPassword={setPassword}
                  confirmPassword={confirmPassword}
                  setConfirmPassword={setConfirmPassword}
                />
                <button disabled={loading} className="w-full rounded-xl bg-[#cc0000] py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">
                  {loading ? 'Recovering...' : 'Reset Password'}
                </button>
              </form>
            ) : null}
          </>
        )}

        <div className="mt-5 border-t border-gray-100 pt-4 text-center">
          <button type="button" onClick={() => navigate('/login')} className="text-xs font-bold text-blue-600 hover:underline">
            Back to Customer Login
          </button>
          <p className="mt-2 text-xs leading-5 text-gray-500">
            If no self-service recovery method is available, contact Descallar Satellite Services for identity verification and new temporary credentials.
          </p>
        </div>
      </div>
    </div>
  );
}

function PasswordFields({ password, setPassword, confirmPassword, setConfirmPassword }) {
  return (
    <>
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
    </>
  );
}
