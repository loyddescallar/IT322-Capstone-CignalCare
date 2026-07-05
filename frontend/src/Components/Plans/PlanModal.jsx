export default function PlanModal({ type, plan, onClose, onSave }) {
  if (!type) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200] p-4">
      <div className="bg-white text-black rounded-lg p-6 w-full max-w-md shadow-xl animate-modalFadeIn">

        {/* VIEW PLAN */}
        {type === "view" && (
          <>
            <h2 className="text-xl font-semibold mb-4">Plan Details</h2>
            <p><b>Name:</b> {plan.name}</p>
            <p><b>Amount:</b> ₱{plan.amount}</p>
            <p><b>Description:</b> {plan.description}</p>
          </>
        )}

        {/* ADD OR EDIT PLAN */}
        {(type === "add" || type === "edit") && (
          <PlanForm
            initial={plan}
            onSubmit={(data) => onSave(type === "edit" ? { ...data, id: plan.id } : data)}
          />
        )}

        {/* DELETE PLAN */}
        {type === "delete" && (
          <>
            <h2 className="text-xl font-semibold text-red-600 mb-4">Delete Plan</h2>
            <p className="text-sm text-gray-700 mb-6">
              Are you sure you want to remove <b>{plan.name}</b>? This action cannot be undone.
            </p>
            <button
              onClick={() => onSave(plan)}
              className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition">
              Delete
            </button>
          </>
        )}

        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="mt-4 w-full bg-slate-900 text-white py-2 rounded-lg hover:bg-slate-700 transition"
        >
          Close
        </button>

      </div>
    </div>
  );
}
