// src/pages/Register.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import AuthLayout from "../components/AuthLayout";
import authApi from "../api/authApi";
import {detectFakeName,detectSuspiciousAccount,detectFakePhone,detectWeakAddress} from "../utils/aiValidator";
import { logValidation } from "../utils/logValidation";
export default function Register() {

  const navigate = useNavigate();

  const [form, setForm] = useState({
    accountName: "",
    accountNumber: "",
    ccaNumber: "",
    address: "",
    phone: "",
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [errorShake, setErrorShake] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {

    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: ""
    }));

  };

  const handleKeyPress = (e) => {

    if (e.key === "Enter") {
      handleSubmit(e);
    }

  };

  const validate = () => {

  const newErrors = {};

const aiPhone = detectFakePhone(form.phone);

if (aiPhone) {
  newErrors.phone = aiPhone;
  logValidation("phone", form.phone, aiPhone);
}


  if (!form.accountName.trim()) {
    newErrors.accountName = "Account name is required.";
  } else {
    const aiName = detectFakeName(form.accountName);
    if (aiName) newErrors.accountName = aiName;
  }

  if (!form.accountNumber.trim()) {
    newErrors.accountNumber = "Account number is required.";
  } else {
    const aiAccount = detectSuspiciousAccount(form.accountNumber);
    if (aiAccount) newErrors.accountNumber = aiAccount;
  }

  if (!form.ccaNumber.trim()) {
    newErrors.ccaNumber = "CCA number is required.";
  }

  if (!form.address.trim()) {
    newErrors.address = "Address is required.";
  } else {
    const aiAddress = detectWeakAddress(form.address);
    if (aiAddress) newErrors.address = aiAddress;
  }

  if (!form.phone.trim()) {
    newErrors.phone = "Cellphone number is required.";
  } else {
    const aiPhone = detectFakePhone(form.phone);
    if (aiPhone) newErrors.phone = aiPhone;
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

      setTimeout(() => {
        setErrorShake(false);
      }, 400);

      return;

    }

    try {

      setLoading(true);

      const { data } = await authApi.register({
        accountName: form.accountName.trim(),
        accountNumber: form.accountNumber.trim(),
        ccaNumber: form.ccaNumber.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
      });

      if (data.error) {
        setServerError(data.error);
        setLoading(false);
        return;
      }

      navigate("/login");

    } catch (err) {

      console.error(err);
      setServerError("Failed to register. Please try again.");

    } finally {

      setLoading(false);

    }

  };

  return (

    <AuthLayout>

      <div className="flex justify-center lg:justify-end">

        <div
          className={`
            w-full max-w-md lg:w-[400px]
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
            Create Account
          </h2>

          {serverError && (
            <p className="text-sm text-red-600 mb-4 text-center">
              {serverError}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ACCOUNT NAME */}
            <div className="space-y-1">

              <label className="text-xs font-semibold text-gray-600">
                ACCOUNT NAME
              </label>

              <input
                id="accountName"
                name="accountName"
                value={form.accountName}
                onChange={handleChange}
                onKeyDown={handleKeyPress}
                autoFocus
                className={`
                  w-full bg-white rounded-xl px-3 py-3 text-sm outline-none
                  ${errors.accountName
                    ? "border-red-500 ring-2 ring-red-300"
                    : "border-gray-300"}
                  border
                  focus:ring-2 focus:ring-red-500 focus:border-red-500
                `}
              />

              {errors.accountName && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.accountName}
                </p>
              )}

            </div>


            {/* ACCOUNT NUMBER */}
            <div className="space-y-1">

              <label className="text-xs font-semibold text-gray-600">
                ACCOUNT NUMBER
              </label>

              <input
                id="accountNumber"
                name="accountNumber"
                value={form.accountNumber}
                onChange={handleChange}
                onKeyDown={handleKeyPress}
                className={`
                  w-full bg-white rounded-xl px-3 py-3 text-sm outline-none
                  ${errors.accountNumber
                    ? "border-red-500 ring-2 ring-red-300"
                    : "border-gray-300"}
                  border
                  focus:ring-2 focus:ring-red-500 focus:border-red-500
                `}
              />

              {errors.accountNumber && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.accountNumber}
                </p>
              )}

            </div>


            {/* CCA NUMBER */}
            <div className="space-y-1">

              <label className="text-xs font-semibold text-gray-600">
                CCA NUMBER
              </label>

              <input
                id="ccaNumber"
                name="ccaNumber"
                value={form.ccaNumber}
                onChange={handleChange}
                onKeyDown={handleKeyPress}
                className={`
                  w-full bg-white rounded-xl px-3 py-3 text-sm outline-none
                  ${errors.ccaNumber
                    ? "border-red-500 ring-2 ring-red-300"
                    : "border-gray-300"}
                  border
                  focus:ring-2 focus:ring-red-500 focus:border-red-500
                `}
              />

              {errors.ccaNumber && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.ccaNumber}
                </p>
              )}

            </div>


            {/* ADDRESS */}
            <div className="space-y-1">

              <label className="text-xs font-semibold text-gray-600">
                ADDRESS
              </label>

              <input
                id="address"
                name="address"
                value={form.address}
                onChange={handleChange}
                onKeyDown={handleKeyPress}
                className={`
                  w-full bg-white rounded-xl px-3 py-3 text-sm outline-none
                  ${errors.address
                    ? "border-red-500 ring-2 ring-red-300"
                    : "border-gray-300"}
                  border
                  focus:ring-2 focus:ring-red-500 focus:border-red-500
                `}
              />

              {errors.address && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.address}
                </p>
              )}

            </div>


            {/* PHONE */}
            <div className="space-y-1">

              <label className="text-xs font-semibold text-gray-600">
                CELLPHONE NUMBER
              </label>

              <input
                id="phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                onKeyDown={handleKeyPress}
                placeholder="09XXXXXXXXX"
                className={`
                  w-full bg-white rounded-xl px-3 py-3 text-sm outline-none
                  ${errors.phone
                    ? "border-red-500 ring-2 ring-red-300"
                    : "border-gray-300"}
                  border
                  focus:ring-2 focus:ring-red-500 focus:border-red-500
                `}
              />

              {errors.phone && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.phone}
                </p>
              )}

            </div>


            <button
              type="submit"
              disabled={loading}
              className="
                w-full py-3 rounded-xl 
                bg-gradient-to-r from-red-500 to-red-600 
                text-white font-semibold
                shadow-md hover:shadow-lg hover:shadow-red-500/30 
                hover:scale-[1.01]
                active:scale-[0.98]
                transition-all
                disabled:opacity-60
              "
            >
              {loading ? "Creating Account..." : "Register"}
            </button>

            <p className="text-center text-sm mt-2 text-gray-700">

              Already have an account?{" "}
              <Link to="/login" className="text-red-600 font-semibold">
                Sign In
              </Link>

            </p>

          </form>

        </div>

      </div>

    </AuthLayout>

  );

}