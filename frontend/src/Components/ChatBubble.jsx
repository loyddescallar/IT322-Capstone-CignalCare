export default function ChatBubble({ text, time, sender }) {
  const isUser = sender === "user";

  return (
    <div
      className={`flex w-full mb-3 animate-fadeInFast ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`relative max-w-[75%] px-4 py-2 rounded-2xl shadow-md 
          ${isUser ? "bg-cignalRed text-white rounded-br-none" 
                   : "bg-slate-200 text-slate-900 rounded-bl-none"}`}
      >
        <p className="text-sm leading-snug">{text}</p>
        <p className="text-[10px] opacity-60 text-right mt-1">{time}</p>
      </div>
    </div>
  );
}
