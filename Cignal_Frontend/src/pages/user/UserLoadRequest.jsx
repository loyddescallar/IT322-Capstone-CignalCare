import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  History,
  ImagePlus,
  Loader2,
  MapPin,
  ReceiptText,
  ShieldCheck,
  TicketPlus,
  Wrench,
  Signal,
  Tv,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';
import { createLoadRequest, createPayMongoCheckout } from '../../api/loadRequestApi';
import axiosClient from '../../api/axiosClient';
import { fallbackPlanList, normalizePlan } from '../../utils/planHelpers';
import UserPageShell from '../../components/UserPageShell';
import RequestTimeline from '../../components/RequestTimeline';

const FALLBACK_PLANS = fallbackPlanList();

const SCREEN_OPTIONS = [
  {
    id: 'no_signal',
    label: 'No Signal',
    desc: 'Black screen, no signal, or dish/cable issue',
    icon: '📡',
    allowsLoad: false,
    action: 'troubleshoot',
  },
  {
    id: 'weak_signal',
    label: 'Weak Signal / Pixelated',
    desc: 'Picture freezes, breaks, or disappears',
    icon: '📶',
    allowsLoad: false,
    action: 'troubleshoot',
  },
  {
    id: 'smartcard',
    label: 'Smartcard Error',
    desc: 'E4, E5, card error, or not detected',
    icon: '💳',
    allowsLoad: false,
    action: 'troubleshoot',
  },
  {
    id: 'subscribe',
    label: 'Please Subscribe',
    desc: 'Subscription expired or channel is locked',
    icon: '📺',
    allowsLoad: true,
    action: 'load',
  },
  {
    id: 'black_screen',
    label: 'Black Screen',
    desc: 'TV is on but no visible Cignal message',
    icon: '⬛',
    allowsLoad: false,
    action: 'troubleshoot',
  },
  {
    id: 'unknown',
    label: 'Something Else',
    desc: 'I am not sure what the issue is',
    icon: '❓',
    allowsLoad: false,
    action: 'technician',
  },
];

const CHANNEL_CATEGORIES = ['All', 'Entertainment', 'Movies', 'News', 'Sports', 'Kids', 'Educational', 'Religious', 'Shopping', 'Radio', 'Others'];
const MANUAL_ACCOUNT = { name: 'Descallar Satellite Services', number: '09755718056' };
const MAX_IMAGE_MB = 5;

const ISSUE_RECOMMENDATIONS = {
  no_signal: {
    title: 'Signal or dish issue detected',
    body: 'Reloading will not fix a No Signal screen. Check cables first, then request a technician if the issue continues.',
    serviceType: 'Signal / Dish Repair',
    troubleshootTarget: '/troubleshoot',
  },
  weak_signal: {
    title: 'Possible dish alignment or cable problem',
    body: 'Pixelation and weak signal are usually caused by dish alignment, obstruction, LNB, or cable issues.',
    serviceType: 'Dish Realignment',
    troubleshootTarget: '/troubleshoot',
  },
  smartcard: {
    title: 'Smartcard or box pairing issue',
    body: 'Smartcard errors should be checked before loading. The card may need reseating, pairing, or replacement.',
    serviceType: 'Box Replacement',
    troubleshootTarget: '/troubleshoot',
  },
  black_screen: {
    title: 'Box or TV input issue detected',
    body: 'A black screen may be caused by power, HDMI/AV input, box boot failure, or hardware issues.',
    serviceType: 'Signal / Dish Repair',
    troubleshootTarget: '/troubleshoot',
  },
  unknown: {
    title: 'Technician review recommended',
    body: 'Since the issue is unclear, it is safer to let support or a technician review the situation before loading.',
    serviceType: 'Other',
    troubleshootTarget: '/troubleshoot',
  },
};

async function fileToBase64(file) {
  if (!file) return null;

  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    throw new Error(`Image must be ${MAX_IMAGE_MB}MB or smaller.`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.readAsDataURL(file);
  });
}

function formatPeso(amount) {
  return `₱${Number(amount || 0).toLocaleString('en-PH')}`;
}

function readPendingPlan() {
  try {
    return JSON.parse(sessionStorage.getItem('cignal_pending_load_plan') || 'null');
  } catch {
    return null;
  }
}

export default function UserLoadRequest() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [plans, setPlans] = useState(FALLBACK_PLANS);
  const [step, setStep] = useState(1);
  const [channelOneWorking, setChannelOneWorking] = useState(null);
  const [screenFile, setScreenFile] = useState(null);
  const [selectedScreen, setSelectedScreen] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(readPendingPlan);
  const [channelModal, setChannelModal] = useState(null);
  const [channelCat, setChannelCat] = useState('All');
  const [manualMethod, setManualMethod] = useState('GCash');
  const [receiptFile, setReceiptFile] = useState(null);
  const [referenceNo, setReferenceNo] = useState('');
  const [copied, setCopied] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const payment = searchParams.get('payment');
    const requestId = searchParams.get('requestId');

    if (payment === 'success') {
      sessionStorage.removeItem('cignal_pending_load_plan');
      setStep(5);
      setMessage({
        type: 'success',
        title: 'Payment submitted',
        body: `PayMongo redirected you back successfully${requestId ? ` for request #${requestId}` : ''}. The system will mark it paid once the webhook confirms the payment.`,
      });
    }

    if (payment === 'cancelled') {
      setStep(3);
      setMessage({
        type: 'warning',
        title: 'Payment cancelled',
        body: 'You cancelled PayMongo checkout. You can try again or use manual receipt upload.',
      });
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    axiosClient
      .get('/load/plans')
      .then((response) => {
        if (!active) return;
        const loadedPlans = (response.data?.plans || []).map(normalizePlan).filter((plan) => plan.status === 'active');
        setPlans(loadedPlans);
      })
      .catch(() => {
        if (active) setPlans(FALLBACK_PLANS);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (selectedPlan) {
      sessionStorage.setItem('cignal_pending_load_plan', JSON.stringify(selectedPlan));
    } else {
      sessionStorage.removeItem('cignal_pending_load_plan');
    }
  }, [selectedPlan]);

  const selectedOption = useMemo(
    () => SCREEN_OPTIONS.find((item) => item.id === selectedScreen) || null,
    [selectedScreen]
  );

  const filteredChannels = channelModal
    ? channelCat === 'All'
      ? channelModal.channelData
      : channelModal.channelData.filter((channel) => channel.category === channelCat)
    : [];

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 1800);
    });
  };

  const resetMessage = () => setMessage(null);

  const buildIssuePrefill = () => {
    const option = selectedOption;
    const recommendation = ISSUE_RECOMMENDATIONS[option?.id] || ISSUE_RECOMMENDATIONS.unknown;
    const hasPhoto = Boolean(screenFile);

    return {
      source: 'load_request_signal_check',
      prefillServiceType: recommendation.serviceType,
      prefillCategory: option?.id === 'smartcard' ? 'Technical Problem' : 'Connection Issue',
      prefillSubject: `Load Request Signal Check — ${option?.label || 'TV screen issue'}`,
      prefillIssueDescription: [
        'Auto-filled from Load Request Signal Check.',
        `Channel 1 picture: No picture / error shown.`,
        `Selected TV issue: ${option?.label || 'Not specified'}.`,
        `Description: ${option?.desc || 'No description provided'}.`,
        hasPhoto ? `TV screen photo: uploaded by customer and attached for review.` : `TV screen photo: not uploaded.`,
        `System recommendation: ${recommendation.title}.`,
        `Recommended action: ${recommendation.body}`,
        '',
        'Customer note: Customer attempted to request prepaid loading, but the system blocked payment because this issue may not be solved by loading.',
      ].join('\n'),
      prefillScreenIssue: option?.label || '',
      prefillScreenPhotoFile: screenFile || null,
      prefillScreenPhotoName: screenFile?.name || '',
    };
  };

  const goToTechnicianRequest = () => {
    navigate('/user/technician-request', { state: buildIssuePrefill() });
  };

  const goToSupportTicket = () => {
    navigate('/user/report-problem', { state: buildIssuePrefill() });
  };

  const goToPlanSelection = () => {
    resetMessage();
    setStep(2);
  };

  const handleScreenUpload = (file) => {
    if (!file) return;

    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setMessage({ type: 'error', title: 'Photo too large', body: `Please upload an image ${MAX_IMAGE_MB}MB or smaller.` });
      return;
    }

    setScreenFile(file);
    setMessage({
      type: 'success',
      title: 'Photo uploaded',
      body: 'Photo uploaded successfully. Now select what appears on your TV screen below.',
    });
  };

  const handlePayMongo = async () => {
    if (!selectedPlan) {
      setMessage({ type: 'error', title: 'Select a plan', body: 'Please choose a Cignal prepaid plan first.' });
      return;
    }

    setSubmitting(true);
    resetMessage();

    try {
      const screenBase64 = screenFile ? await fileToBase64(screenFile) : null;

      const response = await createPayMongoCheckout({
        account_number: user.accountNumber || '',
        account_name: user.accountName || '',
        plan_id: selectedPlan.id || null,
        plan_name: selectedPlan.name,
        amount: selectedPlan.amount,
        screen_photo: screenBase64,
        diagnostic_result: channelOneWorking === false ? selectedScreen : 'channel_1_ok',
        location: user.location || 'Balayan',
      });

      const checkoutUrl = response.data?.checkout_url;

      if (!checkoutUrl) {
        throw new Error('PayMongo did not return a checkout URL.');
      }

      window.location.href = checkoutUrl;
    } catch (err) {
      setMessage({
        type: 'error',
        title: 'PayMongo checkout failed',
        body: err.response?.data?.error || err.message || 'Please try again or use manual payment fallback.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!selectedPlan || !manualMethod || !referenceNo.trim() || !receiptFile) {
      setMessage({ type: 'error', title: 'Missing proof', body: 'Please upload the receipt and enter the reference number.' });
      return;
    }

    setSubmitting(true);
    resetMessage();

    try {
      const [receiptBase64, screenBase64] = await Promise.all([
        fileToBase64(receiptFile),
        screenFile ? fileToBase64(screenFile) : Promise.resolve(null),
      ]);

      await createLoadRequest({
        account_number: user.accountNumber || '',
        account_name: user.accountName || '',
        plan_id: selectedPlan.id || null,
        plan_name: selectedPlan.name,
        amount: selectedPlan.amount,
        payment_method: manualMethod,
        reference_no: referenceNo.trim(),
        receipt_photo: receiptBase64,
        screen_photo: screenBase64,
        diagnostic_result: channelOneWorking === false ? selectedScreen : 'channel_1_ok',
        location: user.location || 'Balayan',
      });

      sessionStorage.removeItem('cignal_pending_load_plan');
      setStep(5);
      setMessage({
        type: 'success',
        title: 'Request submitted',
        body: 'Your manual payment proof was submitted. Admin will review and process your load request.',
      });
    } catch (err) {
      setMessage({
        type: 'error',
        title: 'Submission failed',
        body: err.response?.data?.error || err.message || 'Please check your connection and try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const workflowSteps = ['Signal Check', 'Choose Plan', 'Payment', 'Submit Proof'];
  const timelineStep = step >= 5 ? 'Submit Proof' : workflowSteps[Math.max(0, Math.min(step - 1, workflowSteps.length - 1))];

  return (
    <UserPageShell
      title="Request Cignal Load"
      description="Verify your TV status, select an active prepaid plan, and complete payment securely."
      icon={Signal}
      actions={(
        <button type="button" onClick={() => navigate('/user/load-history')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
          <History size={15} /> Load History
        </button>
      )}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          {step !== 5 && (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <RequestTimeline steps={workflowSteps} current={timelineStep} />
            </div>
          )}

          {message && (
            <div className={`rounded-2xl border px-5 py-4 text-sm ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : message.type === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
              <p className="font-bold">{message.title}</p>
              <p className="mt-1 text-xs leading-5">{message.body}</p>
            </div>
          )}

          {step === 1 && (
            <section className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#cc0000] ring-1 ring-red-100"><Tv size={24} /></div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Does Channel 1 have a picture right now?</h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Prepaid loading helps an expired subscription. No Signal, smartcard errors, and black screens should be checked before payment.</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <button type="button" onClick={() => { setChannelOneWorking(true); setSelectedScreen(null); }} className={`rounded-2xl border p-5 text-left transition ${channelOneWorking === true ? 'border-green-300 bg-green-50 ring-2 ring-green-100' : 'border-slate-200 hover:border-green-200 hover:bg-green-50'}`}>
                    <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-700"><CheckCircle2 size={19} /></span><div><p className="font-bold text-slate-900">Yes, Channel 1 works</p><p className="mt-0.5 text-xs text-slate-500">Continue to active prepaid plans.</p></div></div>
                  </button>

                  <button type="button" onClick={() => { setChannelOneWorking(false); setSelectedScreen(null); }} className={`rounded-2xl border p-5 text-left transition ${channelOneWorking === false ? 'border-red-300 bg-red-50 ring-2 ring-red-100' : 'border-slate-200 hover:border-red-200 hover:bg-red-50'}`}>
                    <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-700"><AlertTriangle size={19} /></span><div><p className="font-bold text-slate-900">No picture or error shown</p><p className="mt-0.5 text-xs text-slate-500">Identify the screen issue before loading.</p></div></div>
                  </button>
                </div>
              </div>

              {channelOneWorking === true && (
                <div className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-3"><AlertTriangle className="mt-0.5 flex-shrink-0 text-amber-600" size={20} /><div><h3 className="font-bold text-amber-800">Confirm the account and plan before payment</h3><p className="mt-1 text-sm leading-6 text-amber-700">Processed prepaid loads are non-refundable, so verify the selected account and amount carefully.</p></div></div>
                  <button type="button" onClick={goToPlanSelection} className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-[#cc0000] px-5 py-3 text-sm font-bold text-white hover:bg-red-700">Choose a Plan <ArrowRight size={15} /></button>
                </div>
              )}

              {channelOneWorking === false && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                  <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
                    <div>
                      <h3 className="font-bold text-slate-900">Optional TV screen photo</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">A clear photo helps support understand the issue. Maximum file size is {MAX_IMAGE_MB}MB.</p>
                      <div className="mt-4">
                        {screenFile ? (
                          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <img src={URL.createObjectURL(screenFile)} alt="TV screen" className="mx-auto h-48 w-full rounded-xl object-contain" />
                            <button type="button" onClick={() => setScreenFile(null)} className="absolute right-3 top-3 rounded-full bg-red-600 p-1.5 text-white" aria-label="Remove TV screen photo"><X size={14} /></button>
                          </div>
                        ) : (
                          <label className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center transition hover:border-[#cc0000] hover:bg-red-50">
                            <ImagePlus size={26} className="mb-2 text-slate-400" />
                            <p className="text-xs font-semibold text-slate-600">Upload TV screen photo</p>
                            <p className="mt-1 text-[10px] text-slate-400">JPG, PNG, WEBP • Max {MAX_IMAGE_MB}MB</p>
                            <input type="file" accept="image/*" className="hidden" onChange={(event) => handleScreenUpload(event.target.files?.[0])} />
                          </label>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900">What appears on the screen?</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Select the closest match. The system will only allow loading when the issue is likely an expired subscription.</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {SCREEN_OPTIONS.map((option) => (
                          <button key={option.id} type="button" onClick={() => setSelectedScreen(option.id)} className={`rounded-xl border p-4 text-left transition ${selectedScreen === option.id ? 'border-[#cc0000] bg-red-50 ring-2 ring-red-100' : 'border-slate-200 hover:border-red-200 hover:bg-red-50'}`}>
                            <p className="font-bold text-slate-900"><span className="mr-1.5">{option.icon}</span>{option.label}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">{option.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {selectedOption && !selectedOption.allowsLoad && (
                    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5">
                      <div className="flex gap-3"><AlertTriangle size={20} className="mt-0.5 flex-shrink-0 text-red-600" /><div><p className="text-sm font-bold text-red-800">Loading is not recommended for this issue</p><p className="mt-1 text-xs leading-5 text-red-700">{(ISSUE_RECOMMENDATIONS[selectedOption.id] || ISSUE_RECOMMENDATIONS.unknown).body}</p>{screenFile && <p className="mt-2 text-xs font-semibold text-green-700">✓ Your TV photo will be carried into the support or technician request.</p>}</div></div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <button type="button" onClick={() => navigate((ISSUE_RECOMMENDATIONS[selectedOption.id] || ISSUE_RECOMMENDATIONS.unknown).troubleshootTarget)} className="rounded-xl bg-[#cc0000] px-4 py-2.5 text-xs font-bold text-white hover:bg-red-700">Troubleshoot First</button>
                        <button type="button" onClick={goToSupportTicket} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-bold text-[#cc0000] hover:bg-red-50"><TicketPlus size={14} /> Create Ticket</button>
                        <button type="button" onClick={goToTechnicianRequest} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-900"><Wrench size={14} /> Technician</button>
                      </div>
                    </div>
                  )}

                  {selectedOption?.allowsLoad && (
                    <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-green-200 bg-green-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div><p className="text-sm font-bold text-green-800">The screen indicates an expired subscription</p><p className="mt-1 text-xs leading-5 text-green-700">You may continue to the active prepaid plans.</p></div>
                      <button type="button" onClick={goToPlanSelection} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#cc0000] px-5 py-3 text-sm font-bold text-white hover:bg-red-700">Choose a Plan <ArrowRight size={15} /></button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {step === 2 && (
            <section className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><h2 className="text-xl font-bold text-slate-900">Choose an active prepaid plan</h2><p className="mt-1 text-sm text-slate-500">Plans are managed by the administrator and update automatically on this page.</p></div>
                <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-[#cc0000]"><ArrowLeft size={15} /> Back</button>
              </div>

              {plans.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><Tv size={28} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No active prepaid plans are available.</p><p className="mt-1 text-xs text-slate-500">Please contact Descallar Satellite Services or check again later.</p></div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {plans.map((plan, index) => {
                    const active = String(selectedPlan?.id) === String(plan.id);
                    return (
                      <div key={plan.id || plan.plan_code || `${plan.amount}-${index}`} className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${active ? 'border-[#cc0000] ring-2 ring-red-100' : 'border-slate-200'}`}>
                        <button type="button" onClick={() => setSelectedPlan(plan)} className="w-full text-left">
                          <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#cc0000]">{plan.plan_code || 'Prepaid Plan'}</p><h3 className="mt-1 text-lg font-bold text-slate-900">{plan.name}</h3></div><p className="text-2xl font-black text-[#cc0000]">{formatPeso(plan.amount)}</p></div>
                          <p className="mt-3 min-h-[40px] text-sm leading-5 text-slate-500">{plan.description}</p>
                          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs"><div><p className="text-slate-400">Validity</p><p className="mt-0.5 font-semibold text-slate-700">{plan.duration}</p></div><div><p className="text-slate-400">Channels</p><p className="mt-0.5 font-semibold text-slate-700">{plan.channels || 0}</p></div></div>
                        </button>
                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                          <button type="button" onClick={() => { setChannelCat('All'); setChannelModal(plan); }} className="text-xs font-bold text-[#cc0000] hover:underline">View Channel Lineup</button>
                          {active && <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600"><CheckCircle2 size={14} /> Selected</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedPlan && (
                <div className="flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-xs font-bold uppercase tracking-wide text-red-500">Selected plan</p><p className="mt-1 font-bold text-slate-900">{selectedPlan.name} — {formatPeso(selectedPlan.amount)}</p></div>
                  <button type="button" onClick={() => { resetMessage(); setStep(3); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#cc0000] px-5 py-3 text-sm font-bold text-white hover:bg-red-700">Continue to Payment <ArrowRight size={15} /></button>
                </div>
              )}
            </section>
          )}

          {step === 3 && selectedPlan && (
            <section className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-bold text-slate-900">Review and choose payment</h2><p className="mt-1 text-sm text-slate-500">PayMongo is recommended because confirmed payments update automatically.</p></div><button type="button" onClick={() => setStep(2)} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-[#cc0000]"><ArrowLeft size={15} /> Back</button></div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
                  <div className="flex items-start gap-3"><div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700"><ShieldCheck size={21} /></div><div><h3 className="font-bold text-green-900">Secure PayMongo Checkout</h3><p className="mt-1 text-sm leading-6 text-green-700">Continue to PayMongo and use any payment channel enabled for your merchant account.</p></div></div>
                  <button type="button" onClick={handlePayMongo} disabled={submitting} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#cc0000] py-3.5 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-60">{submitting ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={17} />}{submitting ? 'Creating Secure Checkout...' : `Pay ${formatPeso(selectedPlan.amount)} with PayMongo`}</button>
                  <p className="mt-3 text-center text-[11px] leading-5 text-green-700">Payment status is confirmed by the secure PayMongo webhook.</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start gap-3"><div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><ReceiptText size={21} /></div><div><h3 className="font-bold text-slate-900">Manual Receipt Verification</h3><p className="mt-1 text-sm leading-6 text-slate-500">Use only when PayMongo is unavailable. Admin must review your receipt before processing.</p></div></div>
                  <button type="button" onClick={() => { resetMessage(); setStep(4); }} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><WalletCards size={17} /> Upload Manual Payment Proof</button>
                </div>
              </div>
            </section>
          )}

          {step === 4 && selectedPlan && (
            <section className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-bold text-slate-900">Submit manual payment proof</h2><p className="mt-1 text-sm text-slate-500">Enter the exact reference number and upload a readable receipt.</p></div><button type="button" onClick={() => setStep(3)} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-[#cc0000]"><ArrowLeft size={15} /> Back</button></div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-5">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Payment Method</label>
                      <div className="grid grid-cols-2 gap-3">
                        {['GCash', 'Maya'].map((method) => <button key={method} type="button" onClick={() => setManualMethod(method)} className={`rounded-xl border p-4 text-left transition ${manualMethod === method ? 'border-[#cc0000] bg-red-50 ring-2 ring-red-100' : 'border-slate-200 hover:border-red-200 hover:bg-red-50'}`}><p className="font-bold text-slate-900">{method}</p><p className="mt-1 text-xs text-slate-500">Manual verification</p></button>)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Send payment to</p><p className="mt-1 font-bold text-slate-900">{MANUAL_ACCOUNT.name}</p>
                      <div className="mt-4 flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{manualMethod} Number</p><p className="mt-1 font-mono text-lg font-bold text-slate-900">{MANUAL_ACCOUNT.number}</p></div><button type="button" onClick={() => copyText(MANUAL_ACCOUNT.number, 'number')} className="inline-flex items-center gap-1 rounded-lg bg-[#cc0000] px-3 py-2 text-xs font-bold text-white">{copied === 'number' ? <Check size={12} /> : <Copy size={12} />}{copied === 'number' ? 'Copied' : 'Copy'}</button></div>
                      <div className="mt-4 border-t border-slate-200 pt-4"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Exact amount</p><p className="mt-1 text-3xl font-black text-[#cc0000]">{formatPeso(selectedPlan.amount)}</p></div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Receipt Photo *</label>
                      {receiptFile ? (
                        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3"><img src={URL.createObjectURL(receiptFile)} alt="Payment receipt" className="mx-auto h-52 w-full rounded-xl object-contain" /><button type="button" onClick={() => setReceiptFile(null)} className="absolute right-3 top-3 rounded-full bg-red-600 p-1.5 text-white" aria-label="Remove receipt"><X size={14} /></button></div>
                      ) : (
                        <label className="flex h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center transition hover:border-[#cc0000] hover:bg-red-50"><ReceiptText size={28} className="mb-2 text-slate-400" /><p className="text-xs font-semibold text-slate-600">Upload a readable receipt</p><p className="mt-1 text-[10px] text-slate-400">Max {MAX_IMAGE_MB}MB</p><input type="file" accept="image/*" className="hidden" onChange={(event) => setReceiptFile(event.target.files?.[0] || null)} /></label>
                      )}
                    </div>
                    <div><label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Reference Number *</label><input value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} placeholder="Enter GCash or Maya reference number" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#cc0000] focus:ring-4 focus:ring-red-100" /></div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end border-t border-slate-100 pt-6"><button type="button" onClick={handleManualSubmit} disabled={submitting || !receiptFile || !referenceNo.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#cc0000] px-6 py-3.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">{submitting && <Loader2 size={16} className="animate-spin" />}{submitting ? 'Submitting...' : 'Submit Manual Load Request'}</button></div>
              </div>
            </section>
          )}

          {step === 5 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600"><CheckCircle2 size={42} /></div>
              <h2 className="mt-5 text-2xl font-bold text-slate-900">Load request recorded</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">Monitor payment confirmation and processing progress in Load History. Paid or verified requests can then be completed by the administrator.</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center"><button type="button" onClick={() => navigate('/user/load-history')} className="rounded-xl bg-[#cc0000] px-6 py-3 text-sm font-bold text-white hover:bg-red-700">View Load History</button><button type="button" onClick={() => navigate('/user-dashboard')} className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Back to Dashboard</button></div>
            </section>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Request summary</h2>
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3"><div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><UserRound size={16} /></div><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Subscriber</p><p className="truncate text-sm font-semibold text-slate-800">{user.accountName || 'Subscriber'}</p><p className="text-xs text-slate-500">{user.accountNumber || 'No account number'}</p></div></div>
              <div className="flex items-start gap-3"><div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><MapPin size={16} /></div><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Location</p><p className="truncate text-sm font-semibold text-slate-800">{user.location || 'Balayan'}</p></div></div>
              <div className="border-t border-slate-100 pt-4"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Selected plan</p>{selectedPlan ? <><p className="mt-1 text-sm font-bold text-slate-900">{selectedPlan.name}</p><div className="mt-2 flex items-end justify-between"><p className="text-xs text-slate-500">{selectedPlan.duration} • {selectedPlan.channels || 0} channels</p><p className="text-xl font-black text-[#cc0000]">{formatPeso(selectedPlan.amount)}</p></div></> : <p className="mt-1 text-sm text-slate-400">No plan selected yet</p>}</div>
              <div className="border-t border-slate-100 pt-4"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Signal check</p><p className="mt-1 text-sm font-semibold text-slate-800">{channelOneWorking === true ? 'Channel 1 has a picture' : channelOneWorking === false ? selectedOption?.label || 'Issue not selected' : 'Not completed'}</p></div>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5"><div className="flex gap-3"><ShieldCheck size={19} className="mt-0.5 flex-shrink-0 text-blue-600" /><div><p className="text-sm font-bold text-blue-800">Secure processing</p><p className="mt-1 text-xs leading-5 text-blue-700">PayMongo confirmations come from the verified webhook. Manual proofs remain pending until an administrator reviews them.</p></div></div></div>
        </aside>
      </div>

      {channelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={() => setChannelModal(null)}>
          <div className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between bg-gradient-to-r from-[#8f0000] to-[#cc0000] px-5 py-4 text-white"><div><h2 className="text-lg font-bold">{channelModal.name} Channel Lineup</h2><p className="text-xs text-white/80">{channelModal.channels || 0} channels • {formatPeso(channelModal.amount)}</p></div><button type="button" onClick={() => setChannelModal(null)} className="rounded-xl p-2 hover:bg-white/15" aria-label="Close channel lineup"><X size={18} /></button></div>
            <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">{CHANNEL_CATEGORIES.map((category) => <button key={category} type="button" onClick={() => setChannelCat(category)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${channelCat === category ? 'bg-[#cc0000] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{category}</button>)}</div>
            <div className="overflow-y-auto p-5">{filteredChannels.length === 0 ? <div className="py-10 text-center"><Tv size={26} className="mx-auto text-slate-300" /><p className="mt-2 text-sm text-slate-400">No channels in this category.</p></div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filteredChannels.map((channel, index) => <div key={`${channel.name}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"><p className="text-sm font-bold text-slate-800">{channel.name}</p><p className="mt-0.5 text-xs text-slate-500">{channel.category}</p></div>)}</div>}</div>
            <div className="border-t border-slate-100 p-4"><button type="button" onClick={() => { setSelectedPlan(channelModal); setChannelModal(null); }} className="w-full rounded-xl bg-[#cc0000] py-3 text-sm font-bold text-white hover:bg-red-700">Select {channelModal.name} — {formatPeso(channelModal.amount)}</button></div>
          </div>
        </div>
      )}
    </UserPageShell>
  );

}
