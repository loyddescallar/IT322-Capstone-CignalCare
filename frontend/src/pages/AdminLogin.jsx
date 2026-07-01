// src/pages/AdminLogin.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import SuccessModal from "../components/SuccessModal";
import authApi from "../api/authApi";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    accountName: "",
    accountId: "",
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [errorShake, setErrorShake] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.accountName.trim())
      newErrors.accountName = "Admin username is required.";
    if (!form.accountId.trim())
      newErrors.accountId = "Admin ID is required.";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const v = validate();
    setErrors(v);

    if (Object.keys(v).length > 0) {
      setErrorShake(true);
      setTimeout(() => setErrorShake(false), 400);
      return;
    }

    try {
      const { data } = await authApi.login({
        accountName: form.accountName,
        accountId: form.accountId,
      });

      if (data.error) {
        setServerError(data.error);
        setErrorShake(true);
        setTimeout(() => setErrorShake(false), 400);
        return;
      }

      if (data.user.role !== "admin") {
        setServerError("This account is not an admin.");
        setErrorShake(true);
        setTimeout(() => setErrorShake(false), 400);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("userRole", "admin");
      localStorage.setItem("username", data.user.accountName);

      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        navigate("/admin-dashboard");
      }, 1000);
    } catch (err) {
      console.error(err);
      setServerError("Login failed. Try again.");
      setErrorShake(true);
      setTimeout(() => setErrorShake(false), 400);
    }
  };

  return (
    <AuthLayout>
      <SuccessModal
        isOpen={showSuccess}
        title="Admin Login Successful!"
        message="Redirecting to dashboard..."
      />

      <div className="flex justify-center lg:justify-end">
        <div
          className={`
            w-full max-w-md lg:w-[380px]
            bg-white/90 backdrop-blur-xl 
            border border-red-200/40 
            shadow-[0_16px_40px_rgba(15,23,42,0.45)]
            rounded-3xl px-8 py-10 
            lg:mr-4 xl:mr-10 2xl:mr-16
            animate-fade-in
            ${errorShake ? "shake" : ""}
          `}
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-7 text-center text-slate-900">
            Admin Login
          </h2>

          {serverError && (
            <p className="text-red-600 text-center mb-3 text-sm">
              {serverError}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ADMIN USERNAME */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">
                ADMIN USERNAME
              </label>
              <input
                name="accountName"
                value={form.accountName}
                onChange={handleChange}
                className="
                  w-full border border-gray-300 bg-white 
                  rounded-xl px-3 py-3 text-sm outline-none
                  focus:ring-2 focus:ring-red-500 focus:border-red-500
                "
              />
              {errors.accountName && (
                <p className="text-red-600 text-xs mt-1">
                  {errors.accountName}
                </p>
              )}
            </div>

            {/* ADMIN ID */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">
                ADMIN ID / ACCOUNT NUMBER
              </label>
              <input
                name="accountId"
                value={form.accountId}
                onChange={handleChange}
                className="
                  w-full border border-gray-300 bg-white 
                  rounded-xl px-3 py-3 text-sm outline-none
                  focus:ring-2 focus:ring-red-500 focus:border-red-500
                "
              />
              {errors.accountId && (
                <p className="text-red-600 text-xs mt-1">
                  {errors.accountId}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="
                w-full py-3 rounded-xl 
                bg-gradient-to-r from-red-500 to-red-600 
                text-white font-semibold
                shadow-md hover:shadow-lg hover:shadow-red-500/30 
                hover:scale-[1.01]
                active:scale-[0.98]
                transition-all
              "
            >
              Login as Admin
            </button>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
}
