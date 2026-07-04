import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  CreditCard,
  Film,
  Languages,
  ReceiptText,
  RefreshCw,
  Satellite,
  Shield,
  Smartphone,
  Star,
  Tv,
  Upload,
  Wifi,
  WifiOff,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { prepaidPlans } from "../data/prepaidPlans";
import { createLoadRequest } from "../api/loadRequestApi";

const PAYMENT = {
  name: "Manuel D. Descallar",
  number: "09175119647",
};

const LOAD_PLANS = [
  { id: "200", name: "Load 200", amount: 200, icon: CreditCard, desc: "78 channels · 30 days" },
  { id: "300", name: "Load 300", amount: 300, icon: Star, desc: "90 channels · 30 days" },
  { id: "450", name: "Load 450", amount: 450, icon: Star, desc: "108 channels · 30 days" },
  { id: "500", name: "Load 500", amount: 500, icon: Tv, desc: "122 channels · 30 days" },
  { id: "600", name: "Load 600", amount: 600, icon: Film, desc: "137 channels · 30 days" },
  { id: "800", name: "Load 800", amount: 800, icon: CreditCard, desc: "152 channels · 30 days" },
  { id: "1000", name: "Load 1000", amount: 1000, icon: Wifi, desc: "169 channels · 30 days" },
];

const CHANNEL_CATS = [
  "All",
  "Entertainment",
  "Movies",
  "News",
  "Sports",
  "Kids",
  "Educational",
  "Religious",
  "Shopping",
  "Radio",
  "Others",
];

const ERROR_CARDS = [
  {
    id: "No Signal",
    icon: WifiOff,
    label_en: "No Signal",
    label_tl: "Walang Signal",
    desc_en: "Black or blue screen — no image",
    desc_tl: "Itim o asul na screen — walang larawan",
    color: "border-red-300 bg-red-50",
    fixable: true,
  },
  {
    id: "Weak Signal",
    icon: Wifi,
    label_en: "Weak Signal",
    label_tl: "Mahinang Signal",
    desc_en: "Pixelated or frozen image",
    desc_tl: "Pixelated o naka-freeze na larawan",
    color: "border-orange-300 bg-orange-50",
    fixable: true,
  },
  {
    id: "Smartcard Error",
    icon: CreditCard,
    label_en: "Smartcard Error",
    label_tl: "Error sa Smartcard",
    desc_en: '"Check Smartcard" message on screen',
    desc_tl: 'Mensahe na "Check Smartcard" sa screen',
    color: "border-amber-300 bg-amber-50",
    fixable: true,
  },
  {
    id: "Please Subscribe",
    icon: Star,
    label_en: "Please Subscribe",
    label_tl: "Mag-subscribe",
    desc_en: "Subscription expired — need to reload",
    desc_tl: "Naubos ang subscription — kailangan ng reload",
    color: "border-green-300 bg-green-50",
    fixable: false,
  },
  {
    id: "Unknown",
    icon: Smartphone,
    label_en: "Something Else",
    label_tl: "Iba Pa",
    desc_en: "Other message or unrecognized screen",
    desc_tl: "Ibang mensahe o di-kilalang screen",
    color: "border-gray-300 bg-gray-50",
    fixable: true,
  },
];

const T = {
  en: {
    title: "Remote Prepaid Loading",
    subtitle: "Reload your Cignal account from home",
    lang: "Filipino",
    step1label: "Signal Check",
    step2label: "Pick a Plan",
    step3label: "Payment",
    step4label: "Submit Proof",
    ch1q: "Does Channel 1 on your TV have a picture right now?",
    ch1sub: "Turn on your TV and navigate to Channel 1 first before answering.",
    yes: "Yes, Channel 1 has a picture",
    no: "No, Channel 1 has no picture",
    warnTitle: "Please Be Sure Before Proceeding",
    warnMsg:
      "If your Cignal is experiencing another issue we have not detected, we cannot refund your payment once sent via GCash or Maya. Only proceed if you are completely sure your signal is working and you simply need to reload.",
    warnProceed: "I'm Sure — Proceed to Reload",
    warnBack: "Go Back",
    diagTitle: "What do you see on your screen?",
    diagSub:
      "Upload or take a photo of your TV screen so we can check it, or select what you see below.",
    uploadBtn: "Upload Photo",
    cameraBtn: "Take Photo",
    analyzing: "Analyzing your TV screen...",
    analyzeNote: "Please wait — we're reading the screen",
    pickerTitle: "Or select what you see on your TV:",
    proceedBtn: "Proceed to Plan Selection →",
    blockBtn: "Take Me to the Fix",
    planSub: "Select the plan you want to reload. Tap a card to view included channels.",
    selectPlan: "Select This Plan →",
    viewCh: "View channels →",
    paySub: "Select GCash or Maya to see payment details.",
    payNote: "Use the payment details below, then upload your receipt on the next step.",
    paidBtn: "I've Paid — Continue →",
    receiptSub:
      "Upload your GCash or Maya receipt. You may type or correct the reference number manually.",
    receiptNote: "Make sure the reference number is visible.",
    readingReceipt: "Reading your receipt...",
    refLabel: "Reference Number",
    refPlaceholder: "e.g. GCX20260322001234 or MYA20260322001234",
    submitBtn: "Submit Load Request",
    successTitle: "Request Submitted!",
    successMsg:
      "Your load request has been received. We will verify your payment and update your account shortly.",
    dashBtn: "Back to Dashboard",
  },
  tl: {
    title: "Remote Prepaid Loading",
    subtitle: "I-reload ang iyong Cignal account mula sa bahay",
    lang: "English",
    step1label: "Tsek ng Signal",
    step2label: "Pumili ng Plan",
    step3label: "Bayad",
    step4label: "I-submit ang Patunay",
    ch1q: "Mayroon bang larawan ang Channel 1 sa inyong TV ngayon?",
    ch1sub: "I-on ang inyong TV at pumunta sa Channel 1 bago sumagot.",
    yes: "Oo, mayroon pang larawan ang Channel 1",
    no: "Hindi, walang larawan ang Channel 1",
    warnTitle: "Tiyakin Muna Bago Magpatuloy",
    warnMsg:
      "Kung ang inyong Cignal ay may ibang problema na hindi pa namin natukoy, hindi namin maaaring ibalik ang inyong bayad na naipadala na sa GCash o Maya. Magpatuloy lamang kung talagang sigurado kayong gumagana ang signal at kailangan lang ng reload.",
    warnProceed: "Sigurado Ako — Magpatuloy sa Reload",
    warnBack: "Bumalik",
    diagTitle: "Ano ang nakikita ninyo sa screen?",
    diagSub:
      "Mag-upload o kumuha ng larawan ng inyong TV screen para masuri namin, o piliin ang nakikita ninyo sa ibaba.",
    uploadBtn: "Mag-upload ng Larawan",
    cameraBtn: "Kumuha ng Larawan",
    analyzing: "Sinusuri ang inyong TV screen...",
    analyzeNote: "Sandali lamang — binabasa namin ang screen",
    pickerTitle: "O piliin ang nakikita ninyo sa TV:",
    proceedBtn: "Magpatuloy sa Pagpili ng Plan →",
    blockBtn: "Dalhin Ako sa Solusyon",
    planSub:
      "Piliin ang plan na gusto ninyong i-reload. I-tap ang card para makita ang mga kasama na channels.",
    selectPlan: "Piliin ang Plan na Ito →",
    viewCh: "Tingnan ang mga channel →",
    paySub: "Pumili ng GCash o Maya para makita ang detalye ng bayad.",
    payNote: "Gamitin ang detalye ng bayad sa ibaba, pagkatapos ay i-upload ang resibo.",
    paidBtn: "Nabayaran Ko Na — Magpatuloy →",
    receiptSub:
      "I-upload ang inyong GCash o Maya resibo. Maaari ring i-type o itama ang reference number.",
    receiptNote: "Tiyaking nakikita ang reference number.",
    readingReceipt: "Binabasa ang inyong resibo...",
    refLabel: "Reference Number",
    refPlaceholder: "hal. GCX20260322001234 o MYA20260322001234",
    submitBtn: "I-submit ang Load Request",
    successTitle: "Natanggap ang Request!",
    successMsg:
      "Natanggap na ang inyong load request. Ibe-verify namin ang inyong bayad at ia-update ang inyong account.",
    dashBtn: "Bumalik sa Dashboard",
  },
};

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function getLocationFromUser(user) {
  const text = `${user?.address || ""}`.toLowerCase();
  const locations = ["Balayan", "Calaca", "Lian", "Calatagan", "Nasugbu", "Lemery"];
  return locations.find((loc) => text.includes(loc.toLowerCase())) || "Balayan";
}

function PseudoQr({ value }) {
  const bits = useMemo(() => {
    const seed = Array.from(value || "cignal").reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return Array.from({ length: 81 }, (_, index) => ((seed + index * 7 + Math.floor(index / 3)) % 5) < 2);
  }, [value]);

  return (
    <div className="grid grid-cols-9 gap-[3px] rounded-2xl bg-white p-4 shadow-inner border-4 border-gray-100" aria-label="Payment QR placeholder">
      {bits.map((on, index) => (
        <span key={index} className={`h-3 w-3 rounded-[2px] ${on ? "bg-slate-900" : "bg-slate-100"}`} />
      ))}
    </div>
  );
}

export default function UserLoadRequest() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const [lang, setLang] = useState("en");
  const [step, setStep] = useState("channel-check");
  const [showWarn, setShowWarn] = useState(false);
  const [screenPhoto, setScreenPhoto] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedError, setSelectedError] = useState(null);
  const [showBlock, setShowBlock] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planData, setPlanData] = useState(null);
  const [channelCat, setChannelCat] = useState("All");
  const [showChModal, setShowChModal] = useState(false);
  const [payMethod, setPayMethod] = useState(null);
  const [copied, setCopied] = useState(false);
  const [receiptPhoto, setReceiptPhoto] = useState(null);
  const [readingReceipt, setReadingReceipt] = useState(false);
  const [refNo, setRefNo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [createdRequest, setCreatedRequest] = useState(null);
  const [accountDetails, setAccountDetails] = useState({
    account_number: user?.accountNumber || "",
    account_name: user?.accountName || localStorage.getItem("username") || "",
    location: getLocationFromUser(user),
  });

  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const receiptRef = useRef(null);
  const t = T[lang];

  const stepIndex = () => {
    if (step === "channel-check" || step === "screen-diagnosis") return 0;
    if (step === "plan-select") return 1;
    if (step === "payment") return 2;
    if (step === "submit-receipt") return 3;
    return 4;
  };

  const stepDone = (n) => stepIndex() > n;
  const stepActive = (n) => stepIndex() === n;

const handleScreenPhoto = async (file) => {
  const formData = new FormData();
  formData.append("receipt", file);

  try {
    const res = await fetch("http://localhost:4000/api/upload/receipt", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    setScreenPhoto(data.url); // NOW IT'S A URL
  } catch (err) {
    console.error(err);
  }
};

 const handleReceiptPhoto = async (file) => {
  const formData = new FormData();
  formData.append("receipt", file);

  try {
    const res = await fetch("http://localhost:4000/api/upload/receipt", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    console.log("UPLOAD RESULT:", data);
    setReceiptPhoto(data.url);

  } catch (err) {
    console.error("Upload failed", err);
  }
};
  const handleErrorSelect = (err) => {
    setSelectedError(err);
    const card = ERROR_CARDS.find((item) => item.id === err);
    if (card?.fixable) {
      setShowBlock(true);
    } else {
      setShowBlock(false);
    }
  };

  const handleGoToFix = () => {
    if (["No Signal", "Weak Signal", "Smartcard Error"].includes(selectedError)) {
      navigate("/troubleshoot");
    } else {
      navigate("/user/technician-request");
    }
  };

  const handleSubmit = async () => {
    setSubmitError("");

    if (!selectedPlan || !payMethod || !refNo.trim()) {
      setSubmitError("Please complete the selected plan, payment method, and reference number.");
      return;
    }

    if (!accountDetails.account_number.trim() || !accountDetails.account_name.trim()) {
      setSubmitError("Please complete the account name and account number before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        user_id: user?.id || null,
        account_number: accountDetails.account_number.trim(),
        account_name: accountDetails.account_name.trim(),
        plan_name: selectedPlan.name,
        amount: selectedPlan.amount,
        payment_method: payMethod,
        reference_no: refNo.trim(),
        reference_number: refNo.trim(),
        receipt_photo: receiptPhoto,
        receipt_image: receiptPhoto,
        screen_photo: screenPhoto,
        diagnostic_result: selectedError || "Channel 1 OK",
        status: "Received",
        location: accountDetails.location || "Balayan",
      };

      const { data } = await createLoadRequest(payload);
      setCreatedRequest(data?.request || data?.data || payload);
      setStep("success");
    } catch (err) {
      console.error("LOAD REQUEST SUBMIT ERROR", err);
      setSubmitError(err?.response?.data?.error || "Failed to submit load request. Please check the backend connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyNumber = () => {
    navigator.clipboard?.writeText(PAYMENT.number).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const filteredChannels = planData
    ? channelCat === "All"
      ? planData.channels
      : planData.channels.filter((channel) => channel.category === channelCat)
    : [];

  const blockCard = ERROR_CARDS.find((item) => item.id === selectedError);
  const qrValue = `${payMethod || "GCash"}|${PAYMENT.number}|${selectedPlan?.amount || 0}|${selectedPlan?.name || "Cignal"}`;

  return (
    <div className="min-h-screen bg-white pb-20 text-slate-900">
      <Navbar />

      <div className="bg-gradient-to-br from-[#cc0000] to-[#880000] px-4 pt-8 pb-16">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => navigate("/user-dashboard")} className="flex items-center gap-2 text-sm text-red-200 transition hover:text-white">
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
            <button
              onClick={() => setLang((value) => (value === "en" ? "tl" : "en"))}
              className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/30"
            >
              <Languages size={13} /> {t.lang}
            </button>
          </div>

          <div className="flex items-center gap-3 animate-load-slide-up">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <Satellite size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">{t.title}</h1>
              <p className="text-sm text-red-200">{t.subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-10 max-w-2xl px-4">
        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-xl animate-load-slide-up">
          <div className="flex items-center gap-2">
            {[t.step1label, t.step2label, t.step3label, t.step4label].map((label, index) => (
              <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    stepDone(index)
                      ? "bg-green-500 text-white shadow-sm"
                      : stepActive(index)
                      ? "bg-[#cc0000] text-white shadow-md shadow-red-200"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {stepDone(index) ? <Check size={13} /> : index + 1}
                </div>
                <span className={`hidden truncate text-xs font-semibold sm:block ${stepActive(index) ? "text-[#cc0000]" : stepDone(index) ? "text-green-600" : "text-gray-400"}`}>
                  {label}
                </span>
                {index < 3 && <div className={`h-[2px] flex-1 rounded-full ${stepDone(index) ? "bg-green-400" : "bg-gray-100"}`} />}
              </div>
            ))}
          </div>
        </div>

        <div key={step} className="animate-load-step">
          {step === "channel-check" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                    <Tv size={20} className="text-[#cc0000]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#cc0000]">{t.step1label}</p>
                    <p className="text-xs text-slate-500">{t.ch1sub}</p>
                  </div>
                </div>

                <p className="mb-6 font-bold leading-snug text-gray-800">{t.ch1q}</p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button onClick={() => setShowWarn(true)} className="group rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 p-[1.5px] shadow transition hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]">
                    <div className="flex h-full flex-col items-center gap-2 rounded-[1rem] bg-white px-4 py-5 transition group-hover:bg-green-50">
                      <CheckCircle2 size={32} className="text-green-500" />
                      <span className="text-center text-sm font-bold text-gray-800">{t.yes}</span>
                    </div>
                  </button>

                  <button onClick={() => setStep("screen-diagnosis")} className="group rounded-2xl bg-gradient-to-br from-orange-500 via-rose-400 to-pink-500 p-[1.5px] shadow transition hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]">
                    <div className="flex h-full flex-col items-center gap-2 rounded-[1rem] bg-white px-4 py-5 transition group-hover:bg-red-50">
                      <WifiOff size={32} className="text-red-400" />
                      <span className="text-center text-sm font-bold text-gray-800">{t.no}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === "screen-diagnosis" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                    <Smartphone size={20} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">Screen Diagnosis</p>
                    <p className="text-xs text-slate-500">{t.diagSub}</p>
                  </div>
                </div>

                <p className="mb-4 font-bold text-gray-800">{t.diagTitle}</p>

                {!screenPhoto && !analyzing && (
                  <div className="animate-load-fade">
                    <button
                      className="flex w-full cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 transition hover:border-[#cc0000] hover:bg-red-50"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload size={36} className="text-gray-300" />
                      <p className="text-sm font-medium text-gray-500">Tap to upload a photo of your TV screen</p>
                      <p className="text-xs text-gray-400">JPG, PNG, HEIC accepted</p>
                    </button>
                    <div className="mt-3 flex gap-3">
                      <button onClick={() => fileRef.current?.click()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#cc0000] py-2.5 text-sm font-semibold text-white transition hover:bg-red-700">
                        <Upload size={15} /> {t.uploadBtn}
                      </button>
                      <button onClick={() => cameraRef.current?.click()} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#cc0000] hover:text-[#cc0000]">
                        <Camera size={15} /> {t.cameraBtn}
                      </button>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files?.[0] && handleScreenPhoto(event.target.files[0])} />
                    <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => event.target.files?.[0] && handleScreenPhoto(event.target.files[0])} />
                  </div>
                )}

                {analyzing && (
                  <div className="flex flex-col items-center gap-4 py-8 animate-load-fade">
                    <div className="h-14 w-14 animate-spin rounded-full border-4 border-gray-100 border-t-[#cc0000]" />
                    <div className="text-center">
                      <p className="font-semibold text-gray-800">{t.analyzing}</p>
                      <p className="mt-1 text-xs text-slate-400">{t.analyzeNote}</p>
                    </div>
                    {screenPhoto && <img src={screenPhoto} alt="TV screen" className="h-28 w-40 rounded-xl border border-gray-200 object-cover opacity-60" />}
                  </div>
                )}

                {pickerVisible && !showBlock && screenPhoto && (
                  <div className="animate-load-slide-up">
                    <div className="mb-4 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <img src={screenPhoto} alt="Uploaded" className="h-14 w-20 rounded-lg border border-gray-200 object-cover" />
                      <div>
                        <p className="text-xs font-semibold text-green-600">Photo received</p>
                        <p className="mt-0.5 text-xs text-gray-500">Please select what appears on screen:</p>
                      </div>
                      <button onClick={() => { setScreenPhoto(null); setPickerVisible(false); }} className="ml-auto text-gray-400 hover:text-gray-600">
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {!analyzing && !showBlock && (
                  <div className="mt-4 border-t border-gray-100 pt-4 animate-load-fade">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">{t.pickerTitle}</p>
                    <div className="grid grid-cols-1 gap-2">
                      {ERROR_CARDS.map((card) => {
                        const Icon = card.icon;
                        const isSelected = selectedError === card.id;
                        return (
                          <button
                            key={card.id}
                            onClick={() => handleErrorSelect(card.id)}
                            className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition hover:scale-[1.01] hover:border-[#cc0000] active:scale-[0.99] ${isSelected ? "border-[#cc0000] bg-red-50" : card.color}`}
                          >
                            <Icon size={22} className={isSelected ? "text-[#cc0000]" : "text-gray-500"} />
                            <div className="flex-1">
                              <p className="text-sm font-bold text-gray-800">{lang === "en" ? card.label_en : card.label_tl}</p>
                              <p className="text-xs text-gray-500">{lang === "en" ? card.desc_en : card.desc_tl}</p>
                            </div>
                            {isSelected && <Check size={16} className="shrink-0 text-[#cc0000]" />}
                          </button>
                        );
                      })}
                    </div>
                    {selectedError && !showBlock && (
                      <button onClick={() => setStep("plan-select")} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#cc0000] py-3 text-sm font-semibold text-white transition hover:bg-red-700 animate-load-slide-up">
                        {t.proceedBtn} <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {showBlock && blockCard?.fixable && (
                <div className="overflow-hidden rounded-2xl border-2 border-red-500 bg-white shadow-lg animate-load-shake">
                  <div className="flex items-center gap-3 bg-[#cc0000] px-5 py-4">
                    <Ban size={22} className="shrink-0 text-white" />
                    <p className="font-bold text-white">Stop — Your Payment Will Be Wasted</p>
                  </div>
                  <div className="space-y-4 p-5">
                    <p className="text-sm leading-relaxed text-gray-800">
                      We detected <span className="font-bold text-[#cc0000]">{lang === "en" ? blockCard.label_en : blockCard.label_tl}</span>. Reloading will <span className="font-bold underline">not</span> restore your channels if the issue is signal, dish, or smartcard related.
                    </p>
                    <p className="text-sm leading-relaxed text-gray-700">
                      Please go to the correct troubleshooting flow first before sending payment.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={handleGoToFix} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#cc0000] py-3 text-sm font-semibold text-white transition hover:bg-red-700">
                        {selectedError === "Unknown" ? <Wrench size={15} /> : <Shield size={15} />} {t.blockBtn}
                      </button>
                      <button onClick={() => { setShowBlock(false); setSelectedError(null); }} className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-500 transition hover:text-gray-700">
                        <ArrowLeft size={13} /> Back
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <button onClick={() => setStep("channel-check")} className="flex items-center gap-1.5 text-sm text-gray-400 transition hover:text-gray-600">
                <ArrowLeft size={14} /> Back to Channel 1 Check
              </button>
            </div>
          )}

          {step === "plan-select" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                    <Tv size={20} className="text-[#cc0000]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#cc0000]">{t.step2label}</p>
                    <p className="text-xs text-slate-500">{t.planSub}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {LOAD_PLANS.map((plan, index) => {
                  const Icon = plan.icon;
                  const isSelected = selectedPlan?.id === plan.id;
                  return (
                    <button
                      key={plan.id}
                      style={{ animationDelay: `${index * 45}ms` }}
                      className="text-left animate-load-slide-up"
                      onClick={() => {
                        const pd = prepaidPlans[plan.id];
                        setSelectedPlan(plan);
                        if (pd?.channels?.length) {
                          setPlanData(pd);
                          setShowChModal(true);
                          setChannelCat("All");
                        }
                      }}
                    >
                      <div className={`rounded-2xl p-[1.5px] shadow transition hover:-translate-y-1 hover:shadow-lg ${isSelected ? "bg-gradient-to-br from-[#cc0000] to-rose-500" : "bg-gradient-to-br from-orange-500 via-rose-400 to-pink-500"}`}>
                        <div className={`relative flex h-full flex-col justify-between rounded-[1rem] px-4 py-4 ${isSelected ? "bg-red-50" : "bg-white"}`}>
                          <Icon className="absolute right-3 top-3 h-5 w-5 text-[#cc0000]" />
                          {isSelected && <Check size={13} className="absolute left-3 top-3 text-[#cc0000]" />}
                          <div className="mt-1">
                            <p className="text-[10px] font-semibold uppercase text-[#cc0000]">{plan.name}</p>
                            <p className="text-2xl font-bold text-gray-900">₱{plan.amount}</p>
                          </div>
                          <p className="mt-2 text-[11px] text-slate-500">{plan.desc}</p>
                          <p className="mt-1 text-[11px] font-semibold text-[#cc0000]">{t.viewCh}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedPlan && (
                <button onClick={() => setStep("payment")} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#cc0000] py-3.5 text-sm font-semibold text-white shadow-md shadow-red-100 transition hover:scale-[1.01] hover:bg-red-700 active:scale-[0.99] animate-load-slide-up">
                  {t.selectPlan} <ChevronRight size={16} />
                </button>
              )}
            </div>
          )}

          {step === "payment" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                    <CreditCard size={20} className="text-[#cc0000]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#cc0000]">{t.step3label}</p>
                    <p className="text-xs text-slate-500">{t.paySub}</p>
                  </div>
                </div>

                <div className="mb-5 flex items-center justify-between rounded-xl bg-gradient-to-r from-[#cc0000] to-rose-500 p-4 text-white">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Selected Plan</p>
                    <p className="text-xl font-extrabold">{selectedPlan?.name}</p>
                  </div>
                  <p className="text-3xl font-extrabold">₱{selectedPlan?.amount?.toLocaleString()}</p>
                </div>

                {!payMethod && (
                  <div className="grid grid-cols-2 gap-3">
                    {["GCash", "Maya"].map((method) => (
                      <button key={method} onClick={() => setPayMethod(method)} className={`rounded-2xl p-[1.5px] shadow transition hover:scale-[1.03] active:scale-[0.97] ${method === "GCash" ? "bg-gradient-to-br from-blue-400 to-blue-600" : "bg-gradient-to-br from-emerald-400 to-emerald-600"}`}>
                        <div className="flex flex-col items-center gap-2 rounded-[1rem] bg-white py-5">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-white ${method === "GCash" ? "bg-blue-600" : "bg-emerald-600"}`}>{method === "GCash" ? "G" : "M"}</div>
                          <span className={`font-bold ${method === "GCash" ? "text-blue-600" : "text-emerald-600"}`}>{method}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {payMethod && selectedPlan && (
                  <div className="space-y-4 animate-load-slide-up">
                    <div className={`flex items-center justify-between rounded-xl p-4 ${payMethod === "GCash" ? "bg-blue-600" : "bg-emerald-600"}`}>
                      <div>
                        <p className="text-xs font-medium text-white/70">Paying via</p>
                        <p className="text-lg font-bold text-white">{payMethod}</p>
                      </div>
                      <button onClick={() => setPayMethod(null)} className="text-white/70 hover:text-white"><X size={18} /></button>
                    </div>

                    <div className={`rounded-xl border p-4 text-center ${payMethod === "GCash" ? "border-blue-200 bg-blue-50" : "border-emerald-200 bg-emerald-50"}`}>
                      <p className={`mb-1 text-xs font-medium ${payMethod === "GCash" ? "text-blue-600" : "text-emerald-600"}`}>Amount to Pay</p>
                      <p className={`text-4xl font-bold ${payMethod === "GCash" ? "text-blue-700" : "text-emerald-700"}`}>₱{selectedPlan.amount.toLocaleString()}</p>
                      <p className={`mt-1 text-xs ${payMethod === "GCash" ? "text-blue-500" : "text-emerald-500"}`}>Cignal TV Prepaid — {selectedPlan.name}</p>
                    </div>

                    <div className="flex flex-col items-center">
                      <PseudoQr value={qrValue} />
                      <p className="mt-2 text-xs text-gray-400">Scan reference box or send directly to the number below</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Account Details</p>
                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <p className="text-xs text-gray-400">Account Name</p>
                        <p className="text-sm font-bold text-gray-800">{PAYMENT.name}</p>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <div>
                          <p className="text-xs text-gray-400">{payMethod} Number</p>
                          <p className="text-sm font-bold tracking-widest text-gray-800">{PAYMENT.number}</p>
                        </div>
                        <button onClick={copyNumber} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-[#cc0000]">
                          {copied ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>

                    <p className="text-center text-xs text-slate-500">{t.payNote}</p>

                    <button onClick={() => setStep("submit-receipt")} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#cc0000] py-3.5 text-sm font-semibold text-white shadow-md shadow-red-100 transition hover:scale-[1.01] hover:bg-red-700 active:scale-[0.99]">
                      <Zap size={15} /> {t.paidBtn}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === "submit-receipt" && (
            <div className="space-y-4">
              <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                    <ReceiptText size={20} className="text-[#cc0000]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#cc0000]">{t.step4label}</p>
                    <p className="text-xs text-slate-500">{t.receiptSub}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-700">Subscriber Name</span>
                    <input value={accountDetails.account_name} onChange={(event) => setAccountDetails((prev) => ({ ...prev, account_name: event.target.value }))} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#cc0000] focus:ring-1 focus:ring-red-100" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-700">Account Number</span>
                    <input value={accountDetails.account_number} onChange={(event) => setAccountDetails((prev) => ({ ...prev, account_number: event.target.value }))} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#cc0000] focus:ring-1 focus:ring-red-100" />
                  </label>
                </div>

                {!receiptPhoto ? (
                  <button className={`flex w-full cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8 transition ${readingReceipt ? "animate-pulse border-[#cc0000] bg-red-50" : "border-gray-200 bg-gray-50 hover:border-[#cc0000] hover:bg-red-50"}`} onClick={() => receiptRef.current?.click()}>
                    <ReceiptText size={36} className="text-gray-300" />
                    <p className="text-sm font-medium text-gray-500">Upload your {payMethod} receipt screenshot</p>
                    <p className="text-xs text-gray-400">{t.receiptNote}</p>
                    <span className="rounded-xl bg-[#cc0000] px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700">{t.uploadBtn}</span>
                  </button>
                ) : (
                  <div className="space-y-3 animate-load-fade">
                    <div className="relative">
                      <img src={receiptPhoto} alt="Receipt" className="max-h-52 w-full rounded-xl border border-gray-200 object-cover" />
                      <button onClick={() => { setReceiptPhoto(null); setRefNo(""); }} className="absolute right-2 top-2 rounded-full bg-white p-1 text-gray-500 shadow hover:text-red-600"><X size={14} /></button>
                    </div>
                    {readingReceipt && (
                      <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-[#cc0000]" />
                        <p className="text-xs font-medium text-[#cc0000]">{t.readingReceipt}</p>
                      </div>
                    )}
                  </div>
                )}

                <input ref={receiptRef} type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files?.[0] && handleReceiptPhoto(event.target.files[0])} />

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-700">{t.refLabel}</label>
                  <div className="relative">
                    <input type="text" value={refNo} onChange={(event) => setRefNo(event.target.value)} placeholder={t.refPlaceholder} className="w-full rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm outline-none focus:border-[#cc0000] focus:ring-1 focus:ring-red-100" />
                    {refNo && <CheckCircle2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">You can type or correct this number manually.</p>
                </div>

                {submitError && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>}

                <button disabled={!refNo.trim() || submitting} onClick={handleSubmit} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#cc0000] py-3.5 text-sm font-semibold text-white shadow-md shadow-red-100 transition hover:scale-[1.01] hover:bg-red-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-300">
                  {submitting ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Submitting...</> : <>{t.submitBtn} <ChevronRight size={16} /></>}
                </button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm animate-load-pop">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 animate-load-pop">
                <CheckCircle2 size={44} className="text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{t.successTitle}</h2>
                <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">{t.successMsg}</p>
              </div>
              <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-4 text-left">
                {[
                  ["Plan", selectedPlan?.name || "—"],
                  ["Amount", `₱${selectedPlan?.amount?.toLocaleString() || "—"}`],
                  ["Payment Method", payMethod || "—"],
                  ["Reference No.", refNo],
                  ["Status", createdRequest?.status || "Received"],
                ].map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-gray-500">{key}</span>
                    <span className="font-semibold text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate("/user-dashboard")} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#cc0000] py-3.5 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-red-700 active:scale-[0.98]">
                {t.dashBtn} <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {showWarn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-load-fade">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-load-pop">
            <div className="flex items-center gap-3 bg-amber-500 px-6 py-5">
              <AlertTriangle size={24} className="text-white" />
              <p className="font-bold text-white">{t.warnTitle}</p>
            </div>
            <div className="space-y-4 p-6">
              <p className="text-sm leading-relaxed text-gray-700">{t.warnMsg}</p>
              <button onClick={() => { setShowWarn(false); setStep("plan-select"); }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#cc0000] py-3 text-sm font-semibold text-white transition hover:bg-red-700"><CheckCircle2 size={16} /> {t.warnProceed}</button>
              <button onClick={() => setShowWarn(false)} className="w-full rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 transition hover:text-gray-800">{t.warnBack}</button>
            </div>
          </div>
        </div>
      )}

      {showChModal && planData && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-load-fade">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-load-pop">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-[#cc0000]">{planData.name} — Included Channels</h2>
                <p className="text-xs text-slate-500">{planData.channels.length} channels total</p>
              </div>
              <button onClick={() => setShowChModal(false)} className="p-1 text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="p-5">
              <div className="mb-4 flex flex-wrap gap-2">
                {CHANNEL_CATS.map((cat) => (
                  <button key={cat} onClick={() => setChannelCat(cat)} className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${channelCat === cat ? "border-[#cc0000] bg-[#cc0000] text-white" : "border-[#cc0000]/40 bg-white text-[#cc0000] hover:bg-[#cc0000]/10"}`}>{cat}</button>
                ))}
              </div>
              <div className="grid max-h-72 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
                {filteredChannels.map((channel, index) => (
                  <div key={`${channel.name}-${index}`} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md">
                    <p className="text-sm font-bold">{channel.name}</p>
                    <p className="text-[11px] text-gray-500">{channel.category}</p>
                  </div>
                ))}
                {filteredChannels.length === 0 && <p className="col-span-full py-6 text-center text-sm text-gray-400">No channels found.</p>}
              </div>
              <button onClick={() => setShowChModal(false)} className="mt-4 w-full rounded-xl bg-[#cc0000] py-3 text-sm font-semibold text-white transition hover:bg-red-700">
                Select {planData.name} — ₱{selectedPlan?.amount} →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
