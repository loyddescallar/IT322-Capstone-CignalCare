// src/pages/Login.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { User, Hash, Search, X, BadgeHelp } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import SuccessModal from "../components/SuccessModal";
import authApi from "../api/authApi";
import prepaidApi from "../api/prepaidApi";
import { detectFakeName, detectSuspiciousAccount } from "../utils/aiValidator";
import { logValidation } from "../utils/logValidation";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ accountName: "", accountId: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [errorShake, setErrorShake] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Prepaid inquiry modal state
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryAccountNumber, setInquiryAccountNumber] = useState("");
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [inquiryError, setInquiryError] = useState("");
  const [inquiryResult, setInquiryResult] = useState(null);

  // CCA inquiry modal state
  const [showCcaModal, setShowCcaModal] = useState(false);
  const [ccaLookup, setCcaLookup] = useState("");
  const [ccaLoading, setCcaLoading] = useState(false);
  const [ccaError, setCcaError] = useState("");
  const [ccaResult, setCcaResult] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  const validate = () => {
    const newErrors = {};

    const aiName = detectFakeName(form.accountName);

    if (aiName) {
      newErrors.accountName = aiName;
      logValidation("accountName", form.accountName, aiName);
    }

    const aiAccount = detectSuspiciousAccount(form.accountId);

    if (aiAccount) {
      newErrors.accountId = aiAccount;
      logValidation("accountNumber", form.accountId, aiAccount);
    }

    if (!form.accountName.trim()) {
      newErrors.accountName = "Account name is required.";
    } else {
      const aiName2 = detectFakeName(form.accountName);
      if (aiName2) newErrors.accountName = aiName2;
    }

    if (!form.accountId.trim()) {
      newErrors.accountId = "Account number / CCA number is required.";
    } else {
      const aiAccount2 = detectSuspiciousAccount(form.accountId);
      if (aiAccount2) newErrors.accountId = aiAccount2;
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const v = validate();
    setErrors(v);

    if (Object.keys(v).length !== 0) {
      setErrorShake(true);
      setTimeout(() => setErrorShake(false), 400);
      return;
    }

    try {
      setLoading(true);

      const { data } = await authApi.login({
        accountName: form.accountName.trim(),
        accountId: form.accountId.trim(),
      });

      if (data.error) {
        setServerError(data.error);
        setErrorShake(true);
        setTimeout(() => setErrorShake(false), 400);
        setLoading(false);
        return;
      }

      if (data.token) localStorage.setItem("token", data.token);

      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("username", data.user.accountName || "");
        localStorage.setItem("userRole", data.user.role || "user");
      }

      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        navigate("/user-dashboard");
      }, 800);
    } catch (err) {
      console.error(err);
      setServerError("Login failed. Please try again.");
      setErrorShake(true);
      setTimeout(() => setErrorShake(false), 400);
    } finally {
      setLoading(false);
    }
  };

  const openInquiryModal = () => {
    setShowInquiryModal(true);
    setInquiryAccountNumber("");
    setInquiryError("");
    setInquiryResult(null);
  };

  const closeInquiryModal = () => {
    setShowInquiryModal(false);
    setInquiryAccountNumber("");
    setInquiryError("");
    setInquiryResult(null);
  };

  const openCcaModal = () => {
    setShowCcaModal(true);
    setCcaLookup("");
    setCcaError("");
    setCcaResult(null);
  };

  const closeCcaModal = () => {
    setShowCcaModal(false);
    setCcaLookup("");
    setCcaError("");
    setCcaResult(null);
  };

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    setInquiryError("");
    setInquiryResult(null);

    if (!inquiryAccountNumber.trim()) {
      setInquiryError("Account number is required.");
      return;
    }

    try {
      setInquiryLoading(true);

      const { data } = await prepaidApi.getInquiry(
        inquiryAccountNumber.trim()
      );

      setInquiryResult(data.inquiry || null);
    } catch (err) {
      console.error(err);
      setInquiryError(
        err?.response?.data?.error || "Failed to fetch prepaid inquiry."
      );
    } finally {
      setInquiryLoading(false);
    }
  };

  const handleCcaSubmit = async (e) => {
    e.preventDefault();
    setCcaError("");
    setCcaResult(null);

    if (!ccaLookup.trim()) {
      setCcaError("Account number or CCA number is required.");
      return;
    }

    try {
      setCcaLoading(true);
      const { data } = await authApi.lookupAccount(ccaLookup.trim());
      setCcaResult(data.user || null);
    } catch (err) {
      console.error(err);
      setCcaError(err?.response?.data?.error || "Failed to fetch CCA inquiry.");
    } finally {
      setCcaLoading(false);
    }
  };

  return (
<<<<<<< Updated upstream
    <div>
      <h1>Login Page</h1>
=======
    <AuthLayout showNavbar={false}>
      <SuccessModal
        isOpen={showSuccess}
        title="Login Successful!"
        message="Redirecting to your dashboard..."
      />

      {showCcaModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-slate-900 text-white">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">
                  CCA Inquiry
                </h2>
                <p className="text-sm text-slate-200 mt-1">
                  Enter your CCA number or account number to retrieve your registered account details.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCcaModal}
                className="rounded-full bg-white/15 p-2 hover:bg-white/25 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 md:p-7 space-y-6">
              <form onSubmit={handleCcaSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">
                    Account Number / CCA Number
                  </label>

                  <div className="relative mt-1">
                    <Hash className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                    <input
                      value={ccaLookup}
                      onChange={(e) => setCcaLookup(e.target.value)}
                      placeholder="Enter your account number or CCA number"
                      className="
                        w-full border border-gray-300 bg-white
                        rounded-xl pl-10 pr-3 py-3 text-sm outline-none
                        focus:ring-2 focus:ring-red-500 focus:border-red-500
                      "
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={ccaLoading}
                  className="
                    w-full md:w-auto inline-flex items-center justify-center gap-2
                    bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold shadow-md
                    hover:scale-[1.01] hover:shadow-lg transition-all disabled:opacity-60
                  "
                >
                  <BadgeHelp className="w-4 h-4" />
                  {ccaLoading ? "Checking..." : "Check CCA"}
                </button>
              </form>

              {ccaError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {ccaError}
                </div>
              )}

              {ccaResult && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoCard label="Account Name" value={ccaResult.accountName} />
                    <InfoCard label="Account Number" value={ccaResult.accountNumber} />
                    <InfoCard label="CCA Number" value={ccaResult.ccaNumber} />
                    <InfoCard label="Phone" value={ccaResult.phone} />
                    <InfoCard label="Address" value={ccaResult.address} />
                    <InfoCard label="Role" value={ccaResult.role} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showInquiryModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-red-500 to-red-600 text-white">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">
                  Prepaid Account Inquiry
                </h2>
                <p className="text-sm text-red-100 mt-1">
                  Enter your account number to check your current load, validity,
                  benefits, and package explanation.
                </p>
              </div>

              <button
                type="button"
                onClick={closeInquiryModal}
                className="rounded-full bg-white/15 p-2 hover:bg-white/25 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 md:p-7 space-y-6">
              <form onSubmit={handleInquirySubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">
                    Account Number
                  </label>

                  <div className="relative mt-1">
                    <Hash className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                    <input
                      value={inquiryAccountNumber}
                      onChange={(e) => setInquiryAccountNumber(e.target.value)}
                      placeholder="Enter your account number"
                      className="
                        w-full border border-gray-300 bg-white
                        rounded-xl pl-10 pr-3 py-3 text-sm outline-none
                        focus:ring-2 focus:ring-red-500 focus:border-red-500
                      "
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={inquiryLoading}
                  className="
                    w-full md:w-auto inline-flex items-center justify-center gap-2
                    bg-gradient-to-r from-red-500 to-red-600
                    text-white px-6 py-3 rounded-xl font-semibold shadow-md
                    hover:scale-[1.01] hover:shadow-lg hover:shadow-red-500/30
                    transition-all disabled:opacity-60
                  "
                >
                  <Search className="w-4 h-4" />
                  {inquiryLoading ? "Checking..." : "Inquire Now"}
                </button>
              </form>

              {inquiryError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {inquiryError}
                </div>
              )}

              {inquiryResult && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoCard
                      label="Account Number"
                      value={inquiryResult.accountNumber}
                    />
                    <InfoCard
                      label="Account Name"
                      value={inquiryResult.accountName}
                    />
                    <InfoCard
                      label="Current Load"
                      value={inquiryResult.currentLoad || "N/A"}
                    />
                    <InfoCard
                      label="Load Amount"
                      value={
                        inquiryResult.loadAmount != null
                          ? `₱${inquiryResult.loadAmount}`
                          : "N/A"
                      }
                    />
                    <InfoCard
                      label="Status"
                      value={inquiryResult.status || "N/A"}
                    />
                    <InfoCard
                      label="Days Remaining"
                      value={`${inquiryResult.daysRemaining ?? 0} day(s)`}
                    />
                    <InfoCard
                      label="Last Load Date"
                      value={formatDateTime(inquiryResult.lastLoadDate)}
                    />
                    <InfoCard
                      label="Expiry Date"
                      value={formatDateTime(inquiryResult.expiryDate)}
                    />
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                    <h3 className="text-lg font-bold text-slate-900">
                      Load Benefits
                    </h3>
                    <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                      {inquiryResult.benefits || "No benefits information available."}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          HD Channels
                        </p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">
                          {inquiryResult.hdChannels ?? 0}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          SD Channels
                        </p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">
                          {inquiryResult.sdChannels ?? 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                    <h3 className="text-lg font-bold text-red-700">
                      Smart Package Note
                    </h3>
                    <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                      {inquiryResult.aiNote ||
                        "No package explanation available for this load."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row items-center lg:items-stretch gap-10 lg:gap-16">
        {/* LEFT PANEL */}
        <div
          className="
          w-full lg:w-1/2
          text-white
          drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]
          px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24
          flex flex-col justify-center
        "
        >
          <p className="text-sm sm:text-base uppercase tracking-[0.22em] text-red-200 font-semibold mb-3">
            Welcome to
          </p>

          <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold leading-tight">
            Descallar
          </h1>

          <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold leading-tight text-red-400">
            Satellite Services
          </h1>

          <p className="mt-6 max-w-xl text-base sm:text-lg text-slate-100/95 leading-relaxed tracking-wide">
            Your trusted partner for Cignal TV and satellite solutions in Balayan
            and nearby areas. We provide reliable installations, excellent customer
            service, and fast technical assistance for all your Cignal needs.
          </p>

          <div className="mt-8 space-y-3 text-base sm:text-lg font-medium">
            <div className="flex items-start gap-2">
              <span className="text-red-300 text-xl">📍</span>
              <span>Langgangan, Balayan, Batangas</span>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-red-300 text-xl">📞</span>
              <span>0975-571-8056 / 0917-511-9647</span>
            </div>
          </div>

          <div className="mt-8 grid w-full max-w-md gap-4">
            <button
              type="button"
              onClick={openInquiryModal}
              className="
                w-full
                bg-gradient-to-r from-red-500 to-red-600
                text-white px-6 py-4 rounded-2xl
                font-bold text-lg sm:text-xl
                shadow-[0_14px_35px_rgba(239,68,68,0.35)]
                hover:scale-[1.01] hover:shadow-[0_18px_45px_rgba(239,68,68,0.45)]
                transition-all
              "
            >
              Prepaid Account Inquiry
            </button>

            <button
              type="button"
              onClick={openCcaModal}
              className="
                w-full border border-white/30 bg-slate-900/70
                text-white px-6 py-4 rounded-2xl
                font-bold text-lg sm:text-xl
                shadow-[0_12px_30px_rgba(15,23,42,0.35)]
                hover:scale-[1.01] hover:bg-slate-900
                transition-all
              "
            >
              CCA Inquiry
            </button>
          </div>
        </div>

        {/* LOGIN CARD */}
        <div
          className={`
            w-full max-w-md lg:w-[380px]
            bg-white/90 backdrop-blur-xl
            border border-red-200/40
            shadow-[0_16px_40px_rgba(15,23,42,0.45)]
            rounded-3xl px-8 py-10
            lg:ml-auto lg:mr-4 xl:mr-10 2xl:mr-16
            animate-fade-in
            ${errorShake ? "shake" : ""}
          `}
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-7 text-center text-slate-900">
            <span className="text-red-600">User</span> Login
          </h2>

          {serverError && (
            <p className="text-red-600 text-sm mb-4 text-center font-medium">
              {serverError}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ACCOUNT NAME */}
            <div>
              <label className="text-xs font-semibold text-gray-600">
                ACCOUNT NAME
              </label>

              <div className="relative">
                <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />

                <input
                  name="accountName"
                  value={form.accountName}
                  onChange={handleChange}
                  onKeyDown={handleKeyPress}
                  autoFocus
                  className="
                    w-full border border-gray-300 bg-white
                    rounded-xl pl-10 pr-3 py-3 text-sm outline-none
                    focus:ring-2 focus:ring-red-500 focus:border-red-500
                  "
                />
              </div>

              {errors.accountName && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.accountName}
                </p>
              )}
            </div>

            {/* ACCOUNT NUMBER */}
            <div>
              <label className="text-xs font-semibold text-gray-600">
                ACCOUNT NUMBER / CCA NUMBER
              </label>

              <div className="relative">
                <Hash className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />

                <input
                  name="accountId"
                  value={form.accountId}
                  onChange={handleChange}
                  onKeyDown={handleKeyPress}
                  className="
                    w-full border border-gray-300 bg-white
                    rounded-xl pl-10 pr-3 py-3 text-sm outline-none
                    focus:ring-2 focus:ring-red-500 focus:border-red-500
                  "
                />
              </div>

              {errors.accountId && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.accountId}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="
                w-full bg-gradient-to-r from-red-500 to-red-600
                text-white py-3 rounded-xl font-semibold shadow-md
                hover:scale-[1.01] hover:shadow-lg hover:shadow-red-500/30
                transition-all disabled:opacity-60
              "
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            <p className="text-center text-sm text-gray-700">
              Don’t have an account?{" "}
              <Link to="/register" className="text-red-600 font-semibold">
                Register
              </Link>
            </p>

            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => navigate("/admin-login")}
                className="text-blue-700 font-medium underline hover:text-blue-900"
              >
                Admin Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-900 mt-1 break-words">
        {value || "N/A"}
      </p>
>>>>>>> Stashed changes
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}