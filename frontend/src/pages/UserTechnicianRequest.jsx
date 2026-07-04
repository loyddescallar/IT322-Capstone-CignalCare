// src/pages/UserTechnicianRequest.jsx
import { useState } from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import ticketApi from "../api/ticketApi";
import axiosClient from "../api/axiosClient";

export default function UserTechnicianRequest() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    preferredDate: "",
    preferredTime: "",
    reason: "",
    file: null,
  });

  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Handle all text inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field on change
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // Handle file selection
  const handleFile = (e) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, file }));

    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  };

  // Validate required fields
  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Full name is required.";
    if (!form.address.trim()) newErrors.address = "Address is required.";
    if (!form.phone.trim()) newErrors.phone = "Phone number is required.";
    if (!form.reason.trim()) newErrors.reason = "Reason is required.";
    return newErrors;
  };

  // Submit technician request
  const handleSubmit = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);

    try {
      // 1️⃣ Create the ticket
      const res = await ticketApi.createTicket({
        subject: form.reason,
        category: "Technician Request",
      });

      const ticketId = res.data.id; // backend returns { id }

      // 2️⃣ Build formatted message
      const messageText =
        `Technician Request Details:\n\n` +
        `Name: ${form.name}\n` +
        `Address: ${form.address}\n` +
        `Phone: ${form.phone}\n` +
        `Preferred Date: ${form.preferredDate || "N/A"}\n` +
        `Preferred Time: ${form.preferredTime || "N/A"}\n` +
        `Reason: ${form.reason}\n`;

      // 3️⃣ Send first message (with optional file) via Node backend
      if (form.file) {
        const fd = new FormData();
        fd.append("message", messageText);
        fd.append("attachment", form.file);

        await axiosClient.post(`/tickets/${ticketId}/messages`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await axiosClient.post(`/tickets/${ticketId}/messages`, {
          message: messageText,
        });
      }

      // Show success modal instead of alert
      setShowSuccess(true);
    } catch (err) {
      console.error("Technician Request Error:", err);
      alert("Failed to submit technician request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const goToTickets = () => {
    setShowSuccess(false);
    navigate("/user/tickets");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <main className="main-shell animate-slide-left max-w-3xl mx-auto pb-16">
        <h1 className="text-3xl font-semibold mb-3">Request a Technician</h1>
        <p className="text-slate-300 mb-8">
          Fill out this form to request an onsite technician visit. A support ticket
          will be created so you can chat with our team about this request.
        </p>

        <div className="relative bg-white text-black p-6 rounded-xl shadow-2xl space-y-6 overflow-hidden">

          {/* Loading shimmer overlay */}
          {submitting && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="w-full max-w-sm space-y-3 animate-pulse">
                <div className="h-4 bg-slate-300 rounded"></div>
                <div className="h-4 bg-slate-300 rounded w-5/6"></div>
                <div className="h-4 bg-slate-300 rounded w-4/6"></div>
                <div className="h-10 bg-slate-300 rounded mt-2"></div>
              </div>
            </div>
          )}

          {/* NAME */}
          <div>
            <label className="font-semibold text-sm">Full Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className={`w-full border px-3 py-2 rounded-lg bg-slate-100 ${
                errors.name ? "border-red-500" : "border-slate-300"
              }`}
              placeholder="Juan Dela Cruz"
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* ADDRESS */}
          <div>
            <label className="font-semibold text-sm">Address *</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              className={`w-full border px-3 py-2 rounded-lg bg-slate-100 ${
                errors.address ? "border-red-500" : "border-slate-300"
              }`}
              placeholder="Complete service address"
            />
            {errors.address && (
              <p className="text-xs text-red-500 mt-1">{errors.address}</p>
            )}
          </div>

          {/* PHONE */}
          <div>
            <label className="font-semibold text-sm">Phone Number *</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className={`w-full border px-3 py-2 rounded-lg bg-slate-100 ${
                errors.phone ? "border-red-500" : "border-slate-300"
              }`}
              placeholder="09XXXXXXXXX"
            />
            {errors.phone && (
              <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
            )}
          </div>

          {/* DATE & TIME */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-sm">Preferred Date</label>
              <input
                type="date"
                name="preferredDate"
                value={form.preferredDate}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded-lg bg-slate-100 border-slate-300"
              />
            </div>

            <div>
              <label className="font-semibold text-sm">Preferred Time</label>
              <input
                type="time"
                name="preferredTime"
                value={form.preferredTime}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded-lg bg-slate-100 border-slate-300"
              />
            </div>
          </div>

          {/* REASON */}
          <div>
            <label className="font-semibold text-sm">Reason / Issue Description *</label>
            <textarea
              name="reason"
              value={form.reason}
              onChange={handleChange}
              className={`w-full border px-3 py-2 rounded-lg bg-slate-100 h-28 resize-none ${
                errors.reason ? "border-red-500" : "border-slate-300"
              }`}
              placeholder="Describe the issue you are experiencing..."
            />
            {errors.reason && (
              <p className="text-xs text-red-500 mt-1">{errors.reason}</p>
            )}
          </div>

          {/* ATTACHMENT */}
          <div>
            <label className="font-semibold text-sm">
              Attach Image / Video (optional)
            </label>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFile}
              className="mt-1 text-sm"
            />

            {preview && (
              <div className="mt-3">
                <p className="text-xs text-slate-500 mb-1">Preview:</p>
                <video
                  src={preview}
                  controls
                  className="w-40 h-40 rounded-lg border bg-black"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`w-full py-3 bg-cignalRed text-white rounded-lg font-semibold text-lg transition ${
              submitting ? "opacity-60 cursor-not-allowed" : "hover:bg-red-700"
            }`}
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </main>

      {/* SUCCESS MODAL */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999]">
          <div className="bg-white text-slate-900 rounded-2xl p-8 max-w-sm w-[90%] shadow-2xl animate-fadeIn">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-14 w-14 rounded-full bg-green-500 flex items-center justify-center text-white text-3xl animate-bounce">
                ✓
              </div>
              <h2 className="text-xl font-bold text-cignalRed">
                Request Submitted
              </h2>
              <p className="text-sm text-slate-600">
                Your technician request has been submitted. A support ticket was created
                so you can track the status and chat with our team.
              </p>
              <button
                onClick={goToTickets}
                className="mt-4 w-full bg-cignalRed text-white py-2.5 rounded-xl font-semibold hover:bg-red-700 transition"
              >
                View My Tickets
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
