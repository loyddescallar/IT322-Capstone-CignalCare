export default function TypingIndicator({ sender = "admin" }) {
  return (
    <div className="flex items-center gap-2 ml-2 animate-fadeInFast">
      <span className="text-xs text-slate-500 font-medium">
        {sender === "admin" ? "Admin is typing…" : "Typing…"}
      </span>

      <div className="flex gap-[3px]">
        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-300"></span>
      </div>
    </div>
  );
}
