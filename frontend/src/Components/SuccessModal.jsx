export default function SuccessModal({ open, message }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 modal-animate p-4">
      <div className="bg-white text-black rounded-xl px-8 py-6 max-w-sm w-full shadow-2xl text-center">
        <h3 className="text-xl font-semibold mb-2">Login Successful</h3>

        <p className="text-sm text-gray-700 mb-4">{message}</p>

        <p className="text-xs text-gray-500">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
