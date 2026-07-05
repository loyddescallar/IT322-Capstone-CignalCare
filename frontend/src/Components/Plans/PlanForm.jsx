import { useState } from "react";

export default function PlanForm({ initial, onSubmit }) {
  const [form, setForm] = useState(
    initial || { name: "", amount: "", description: "" }
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-gray-600">Plan Name</label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded-lg"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-600">Amount</label>
        <input
          name="amount"
          type="number"
          value={form.amount}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded-lg"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-600">Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded-lg"
        />
      </div>

      <button
        onClick={() => onSubmit(form)}
        className="w-full bg-cignalRed text-white py-2 rounded-lg font-semibold hover:bg-red-600 transition"
      >
        Save
      </button>
    </div>
  );
}
