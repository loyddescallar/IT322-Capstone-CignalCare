import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, FileText, LockKeyhole, MapPin, ShieldCheck } from 'lucide-react';
import authApi from '../../api/authApi';

export default function TermsAcceptance() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState('');

  useEffect(() => {
    let active = true;
    authApi.customerTerms()
      .then((response) => {
        if (!active) return;
        const data = response.data || {};
        setVersion(data.currentVersion || 'current');
        if (!data.required) {
          const stored = JSON.parse(localStorage.getItem('user') || 'null');
          if (stored) {
            localStorage.setItem('user', JSON.stringify({ ...stored, termsAccepted: true, termsVersion: data.currentVersion || stored.termsVersion }));
          }
          navigate('/user-dashboard', { replace: true });
        }
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.error || 'Unable to load the Terms and Privacy Notice.');
      })
      .finally(() => {
        if (active) setStatusLoading(false);
      });
    return () => { active = false; };
  }, [navigate]);

  const accept = async () => {
    if (!checked || loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await authApi.acceptCustomerTerms();
      const user = response.data?.user;
      if (user) localStorage.setItem('user', JSON.stringify(user));
      navigate('/user-dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to save your acceptance right now.');
    } finally {
      setLoading(false);
    }
  };

  if (statusLoading) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-sm font-semibold text-white">Loading account terms...</div>;
  }

  return (
    <div className="min-h-[100dvh] bg-slate-950 px-3 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-[26px] bg-white shadow-2xl">
        <div className="bg-[#cc0000] px-5 py-6 text-white sm:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/15 p-3"><FileText size={24} /></div>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">Terms of Use & Privacy Notice</h1>
              <p className="mt-1 text-xs text-white/80">CignalCare+ · Descallar Satellite Services {version ? `· Version ${version}` : ''}</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-8">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <p className="formal-long-text text-sm leading-7 text-slate-600">
            CignalCare+ is intended for verified Descallar Satellite Services subscribers to access account support, prepaid loading services, troubleshooting, service requests, and related customer assistance. By continuing, you agree to use the system only for your own subscriber account and to provide accurate information when requesting support or service.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 font-bold text-slate-800"><ShieldCheck size={18} className="text-[#cc0000]" /> Account & Security</div>
              <p className="formal-long-text mt-2 text-xs leading-6 text-slate-600">Keep your password, recovery codes, OTPs, and account identifiers private. CignalCare+ will not ask you to share an OTP with another person.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 font-bold text-slate-800"><LockKeyhole size={18} className="text-[#cc0000]" /> Personal Information</div>
              <p className="formal-long-text mt-2 text-xs leading-6 text-slate-600">Subscriber information is used to operate account support, service transactions, recovery, notifications, and authorized administrative functions within CignalCare+.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 sm:col-span-2">
              <div className="flex items-center gap-2 font-bold text-slate-800"><MapPin size={18} className="text-[#cc0000]" /> Optional Exact Service Location</div>
              <p className="formal-long-text mt-2 text-xs leading-6 text-slate-600">If you choose to share an exact map pin for a technician request, the coordinates are used only for authorized service handling. The map pin is optional, and the written service address remains available when device location access is unavailable or denied.</p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-600">
            Prepaid payments are recognized only after valid backend payment confirmation. Troubleshooting guidance and incident notices support customer service but do not replace official Cignal or authorized technician assessment when an issue requires escalation.
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 hover:border-red-200">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#cc0000]"
            />
            <span className="text-sm leading-6 text-slate-700">I have read and agree to the current CignalCare+ Terms of Use and Privacy Notice.</span>
          </label>

          <button
            type="button"
            onClick={accept}
            disabled={!checked || loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#cc0000] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#a90000] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 size={18} /> {loading ? 'Saving...' : 'Agree and Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
