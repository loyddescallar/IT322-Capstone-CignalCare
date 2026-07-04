import { useState } from "react";
import Navbar from "../components/Navbar";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
} from "@heroicons/react/24/solid";
import PlanModal from "../components/Plans/PlanModal";
import AdminLayout from "../components/admin/AdminLayout";

export default function AdminPlans({ embedded = false }) {
  const [plans, setPlans] = useState([
    {
      id: 1,
      name: "Load 100",
      amount: 100,
      description: "Ideal for short-term entertainment.",
    },
    {
      id: 2,
      name: "Load 175",
      amount: 175,
      description: "More channels and longer validity.",
    },
  ]);

  const [search, setSearch] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [modalType, setModalType] = useState(null); // "view", "add", "edit", "delete"

  const filteredPlans = plans.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.amount.toString().includes(search)
  );

  const openModal = (type, plan = null) => {
    setModalType(type);
    setSelectedPlan(plan);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedPlan(null);
  };

  const content = (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Plan Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage prepaid plans, load amounts, and descriptions.
          </p>
        </div>

        <button
          onClick={() => openModal("add")}
          className="flex items-center gap-2 bg-cignalRed px-4 py-2 rounded-lg font-semibold text-white hover:bg-red-700 transition"
        >
          <PlusIcon className="h-5 w-5" />
          Add Plan
        </button>
      </div>

      <input
        type="text"
        placeholder="Search plans by name or amount..."
        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-red-500"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
        <table className="w-full text-left border-collapse overflow-hidden">
          <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
            <tr>
              <th className="p-3">Plan Name</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Description</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="text-sm text-slate-800">
            {filteredPlans.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="p-6 text-center text-slate-400 text-sm"
                >
                  No plans found.
                </td>
              </tr>
            ) : (
              filteredPlans.map((plan) => (
                <tr
                  key={plan.id}
                  className="border-b border-slate-200 hover:bg-slate-50"
                >
                  <td className="p-3">{plan.name}</td>
                  <td className="p-3">₱{plan.amount}</td>
                  <td className="p-3">{plan.description}</td>

                  <td className="p-3">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        className="text-blue-500 hover:text-blue-600"
                        onClick={() => openModal("view", plan)}
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>

                      <button
                        className="text-yellow-500 hover:text-yellow-600"
                        onClick={() => openModal("edit", plan)}
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>

                      <button
                        className="text-red-500 hover:text-red-600"
                        onClick={() => openModal("delete", plan)}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PlanModal
        type={modalType}
        plan={selectedPlan}
        onClose={closeModal}
        onSave={(savedPlan) => {
          if (modalType === "add") {
            setPlans([...plans, { id: Date.now(), ...savedPlan }]);
          } else if (modalType === "edit") {
            setPlans(plans.map((p) => (p.id === savedPlan.id ? savedPlan : p)));
          } else if (modalType === "delete" && selectedPlan) {
            setPlans(plans.filter((p) => p.id !== selectedPlan.id));
          }
          closeModal();
        }}
      />
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <AdminLayout
      title="Plan Management"
      subtitle="Manage prepaid plans, load amounts, and descriptions."
    >
      {content}
    </AdminLayout>
  );
}