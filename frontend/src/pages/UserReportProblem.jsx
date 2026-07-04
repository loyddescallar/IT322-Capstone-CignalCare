// src/pages/UserReportProblem.jsx
import { useState } from "react";
import Navbar from "../components/Navbar";
import ticketApi from "../api/ticketApi";
import { useNavigate } from "react-router-dom";

export default function UserReportProblem() {
  const navigate = useNavigate();

  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const user = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");

    if (!user || !token) {
      setError("You must be logged in.");
      return;
    }

    if (!category || !subject) {
      setError("Please fill out all required fields.");
      return;
    }

    try {
      const res = await ticketApi.createTicket(
        {
          user_id: user.id,
          category,
          subject,
        },
        token
      );

      if (res.data.error) {
        setError(res.data.error);
        return;
      }

      navigate("/user/tickets");
    } catch (err) {
      console.error(err);
      setError("Failed to submit ticket.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-10">
      <Navbar />

      <main className="max-w-xl mx-auto bg-white text-black p-6 rounded-lg shadow mt-6">
        <h2 className="text-2xl font-bold mb-4">Report a Problem</h2>

        {error && <p className="text-red-600 mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* CATEGORY */}
          <div>
            <label className="font-semibold">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 border rounded-lg"
            >
              <option value="">Select Category</option>
              <option>Connection Issue</option>
              <option>Billing Concern</option>
              <option>Technical Problem</option>
            </select>
          </div>

          {/* SUBJECT */}
          <div>
            <label className="font-semibold">Subject / Description *</label>
            <textarea
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-3 border rounded-lg min-h-[120px]"
              placeholder="Describe the issue..."
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full bg-cignalRed text-white py-3 rounded-lg font-semibold"
          >
            Submit Ticket
          </button>
        </form>
      </main>
    </div>
  );
}
