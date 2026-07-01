export default function ChatInput({ message, setMessage, onSend }) {
  const handleKey = (e) => {
    if (e.key === "Enter") onSend();
  };

  return (
    <div className="flex items-center gap-2 p-3 border-t bg-white">
      <input
        type="text"
        placeholder="Type a message..."
        className="flex-1 border rounded-full px-4 py-2 outline-none 
                   focus:ring-2 focus:ring-cignalRed/70 transition"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKey}
      />

      <button
        onClick={onSend}
        disabled={!message.trim()}
        className={`px-4 py-2 text-white rounded-full transition
          ${message.trim()
            ? "bg-cignalRed hover:bg-red-600"
            : "bg-slate-400 cursor-not-allowed"}`}
      >
        Send
      </button>
    </div>
  );
}
