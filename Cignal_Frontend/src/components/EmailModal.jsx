import { useState } from 'react';

export default function EmailModal({ onSave }) {
  const [email, setEmail] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-96">
        <h2 className="text-lg font-bold mb-4">Please enter your email</h2>
        <p className="text-sm text-gray-600 mb-4">Para sa notifications ng iyong load at subscription expiry.</p>
        <input 
          type="email" 
          className="border p-2 w-full rounded mb-4"
          placeholder="juan@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button 
          onClick={() => onSave(email)}
          className="bg-[#cc0000] text-white w-full py-2 rounded"
        >
          Save Email
        </button>
      </div>
    </div>
  );
}