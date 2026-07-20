import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, X, Send, Bot, RotateCcw, ChevronDown } from 'lucide-react';
import { sendChatbotMessage } from '../api/chatbotApi';
import { CHATBOT_FALLBACK, getRuleBasedResponse } from '../data/chatbotRules';

function renderText(text) {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-1.5"/>;
    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith('**') ? <strong key={j}>{p.slice(2,-2)}</strong> : p
    );
    // Table row
    if (line.startsWith('|')) {
      const cells = line.split('|').filter(Boolean);
      if (cells.every(c => c.trim() === '---' || c.trim() === '')) return null;
      return <div key={i} className="flex gap-3 text-xs"><span className="font-semibold w-24 flex-shrink-0">{cells[0]?.trim()}</span><span className="text-gray-400">{cells[1]?.trim()}</span><span>{cells[2]?.trim()}</span></div>;
    }
    if (line.startsWith('→')) return <div key={i} className="flex items-start gap-1.5 text-xs"><span className="text-[#cc0000] flex-shrink-0 mt-0.5">→</span><span>{parts.slice(1)}</span></div>;
    if (line.startsWith('•')) return <div key={i} className="flex items-start gap-1.5 text-xs"><span className="text-[#cc0000] flex-shrink-0">•</span><span>{parts.slice(1)}</span></div>;
    return <p key={i} className="text-xs leading-relaxed">{parts}</p>;
  }).filter(Boolean);
}

const ACTION_COLORS = { red:'bg-[#cc0000] text-white hover:bg-red-700', slate:'bg-slate-700 text-white hover:bg-slate-800', emerald:'bg-emerald-600 text-white hover:bg-emerald-700', blue:'bg-blue-600 text-white hover:bg-blue-700' };

const INIT = [{ id:1, from:'bot', text:'Kumusta! Ako si **CignalBot** 🤖, ang AI support assistant ng CignalCare+.\n\nPaano kita matutulungan ngayon?', quickReplies:['No Signal','Load/Reload','File a Ticket','Request Technician'] }];

export default function CignalBot() {
  const navigate = useNavigate();
  const [open,     setOpen]    = useState(false);
  const [minimized,setMin]     = useState(false);
  const [messages, setMessages]= useState(INIT);
  const [input,    setInput]   = useState('');
  const [typing,   setTyping]  = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, typing]);

  const sendMessage = async (text) => {
    const cleanText = String(text || '').trim();
    if (!cleanText || typing) return;

    const userMessage = { id: Date.now(), from: 'user', text: cleanText };
    const conversationContext = [...messages, userMessage]
      .slice(-8)
      .map((message) => ({
        role: message.from === 'user' ? 'user' : 'assistant',
        text: String(message.text || '').slice(0, 700),
      }));

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setTyping(true);

    const ruleResponse = getRuleBasedResponse(cleanText);

    if (ruleResponse) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          from: 'bot',
          text: ruleResponse.response,
          quickReplies: ruleResponse.quickReplies || [],
          actions: ruleResponse.actions || [],
        },
      ]);
      return;
    }

    try {
      const data = await sendChatbotMessage({
        message: cleanText,
        context: conversationContext,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          from: 'bot',
          text: data.reply,
          quickReplies: data.quickReplies || [],
          actions: data.actions || [],
        },
      ]);
    } catch (error) {
      console.error('CIGNALBOT GEMINI ERROR:', error);
      const fallbackRule =
        getRuleBasedResponse(cleanText, { broad: true }) || CHATBOT_FALLBACK;

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          from: 'bot',
          text:
            '**AI assistance is temporarily unavailable, so I am using the built-in support guide.**\n\n' +
            fallbackRule.response,
          quickReplies: fallbackRule.quickReplies || [],
          actions: fallbackRule.actions || [],
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {/* Chat Window */}
      {open && (
        <div className="w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{height: minimized?'auto':'420px'}}>
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#880000] to-[#cc0000] text-white flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0"><Bot size={16}/></div>
            <div className="flex-1">
              <p className="text-sm font-bold leading-tight">CignalBot</p>
              <p className="text-xs text-red-200">Hybrid AI · Online</p>
            </div>
            <button onClick={() => { setMessages(INIT); setInput(''); }} className="hover:bg-white/20 p-1 rounded-lg" title="Reset chat"><RotateCcw size={13}/></button>
            <button onClick={() => setMin(!minimized)} className="hover:bg-white/20 p-1 rounded-lg"><ChevronDown size={15} className={`transition-transform ${minimized?'rotate-180':''}`}/></button>
            <button onClick={() => setOpen(false)} className="hover:bg-white/20 p-1 rounded-lg"><X size={15}/></button>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
                {messages.map(m => (
                  <div key={m.id}>
                    <div className={`flex ${m.from==='user'?'justify-end':'justify-start'}`}>
                      {m.from==='bot' && <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#cc0000] to-[#880000] flex items-center justify-center text-white flex-shrink-0 mr-2 mt-0.5"><Bot size={12}/></div>}
                      <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs ${m.from==='user'?'bg-[#cc0000] text-white rounded-br-sm':'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'}`}>
                        {renderText(m.text)}
                      </div>
                    </div>
                    {m.quickReplies?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5 ml-9">
                        {m.quickReplies.map((q,i) => (
                          <button key={i} onClick={() => sendMessage(q)} className="text-xs border border-[#cc0000] text-[#cc0000] bg-white px-2.5 py-1 rounded-full hover:bg-red-50 transition-colors">{q}</button>
                        ))}
                      </div>
                    )}
                    {m.actions?.length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-1.5 ml-9">
                        {m.actions.map((a,i) => (
                          <button key={i} onClick={() => { setOpen(false); navigate(a.path); }}
                            className={`text-left text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${ACTION_COLORS[a.color]||ACTION_COLORS.red}`}>{a.label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {typing && (
                  <div className="flex justify-start">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#cc0000] to-[#880000] flex items-center justify-center text-white flex-shrink-0 mr-2"><Bot size={12}/></div>
                    <div className="bg-white border border-gray-200 rounded-xl rounded-bl-sm px-3 py-2 shadow-sm">
                      <div className="flex gap-1">{[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef}/>
              </div>

              {/* Quick replies */}
              <div className="px-3 py-2 border-t border-gray-100 flex gap-1.5 flex-wrap bg-white flex-shrink-0">
                {['No Signal','Load','Ticket','Technician'].map(q => (
                  <button key={q} onClick={() => sendMessage(q)} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full hover:bg-red-50 hover:text-[#cc0000] transition-colors">{q}</button>
                ))}
              </div>

              {/* Input */}
              <div className="p-3 border-t border-gray-100 flex gap-2 bg-white flex-shrink-0">
                <input type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMessage(input)}
                  placeholder="Ilagay ang mensahe..." disabled={typing}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#cc0000] disabled:bg-gray-50"/>
                <button onClick={() => sendMessage(input)} disabled={!input.trim()||typing} className="bg-[#cc0000] hover:bg-red-700 text-white p-2 rounded-xl disabled:opacity-50 flex-shrink-0"><Send size={13}/></button>
              </div>

              <p className="text-center text-gray-400 pb-2 bg-white" style={{fontSize:'9px'}}>Rule-based support + Gemini AI</p>
            </>
          )}
        </div>
      )}

      {/* Bubble */}
      <button onClick={() => { setOpen(!open); setMin(false); }}
        className="w-14 h-14 bg-[#cc0000] hover:bg-red-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 relative">
        {open ? <X size={24}/> : <MessageCircle size={24}/>}
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"/>
      </button>
    </div>
  );
}
