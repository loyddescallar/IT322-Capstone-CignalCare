import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  ChevronDown,
  MessageCircle,
  RotateCcw,
  Send,
  X,
} from 'lucide-react';
import {
  prepareChatbotSupportDraft,
  sendChatbotMessage,
} from '../api/chatbotApi';
import {
  CHATBOT_FALLBACK,
  getRuleBasedResponse,
  shouldUseLiveSystemData,
} from '../data/chatbotRules';

function renderText(text) {
  return String(text || '')
    .split('\n')
    .map((line, i) => {
      if (!line.trim()) return <div key={i} className="h-1.5" />;

      const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith('**') ? <strong key={j}>{part.slice(2, -2)}</strong> : part
      );

      if (line.startsWith('|')) {
        const cells = line.split('|').filter(Boolean);
        if (cells.every((cell) => cell.trim() === '---' || cell.trim() === '')) return null;
        return (
          <div key={i} className="flex gap-3 text-xs">
            <span className="w-24 flex-shrink-0 font-semibold">{cells[0]?.trim()}</span>
            <span className="text-gray-400">{cells[1]?.trim()}</span>
            <span>{cells[2]?.trim()}</span>
          </div>
        );
      }

      if (line.startsWith('→')) {
        return (
          <div key={i} className="flex items-start gap-1.5 text-xs">
            <span className="mt-0.5 flex-shrink-0 text-[#cc0000]">→</span>
            <span>{parts.slice(1)}</span>
          </div>
        );
      }

      if (line.startsWith('•')) {
        return (
          <div key={i} className="flex items-start gap-1.5 text-xs">
            <span className="flex-shrink-0 text-[#cc0000]">•</span>
            <span>{parts.slice(1)}</span>
          </div>
        );
      }

      return <p key={i} className="text-xs leading-relaxed">{parts}</p>;
    })
    .filter(Boolean);
}

const ACTION_COLORS = {
  red: 'bg-[#cc0000] text-white hover:bg-red-700',
  slate: 'bg-slate-700 text-white hover:bg-slate-800',
  emerald: 'bg-emerald-600 text-white hover:bg-emerald-700',
  blue: 'bg-blue-600 text-white hover:bg-blue-700',
};

const INIT = [
  {
    id: 1,
    from: 'bot',
    text: 'Kumusta! Ako si **CignalBot** 🤖, ang AI support assistant ng CignalCare+.\n\nPaano kita matutulungan ngayon?',
    quickReplies: ['No Signal', 'Load/Reload', 'File a Ticket', 'Request Technician'],
  },
];

const DIRECT_ACTION_MESSAGES = new Set([
  'file a ticket',
  'ticket',
  'request technician',
  'technician',
  'tech',
]);

function buildConversationContext(messages, limit = 12) {
  return messages
    .slice(-limit)
    .map((message) => ({
      role: message.from === 'user' ? 'user' : 'assistant',
      text: String(message.text || '').slice(0, 700),
    }));
}

function hasUsefulSupportContext(messages) {
  const userMessages = messages
    .filter((message) => message.from === 'user')
    .map((message) => String(message.text || '').trim())
    .filter(Boolean)
    .filter((message) => !DIRECT_ACTION_MESSAGES.has(message.toLowerCase()));

  if (!userMessages.length) return false;

  const text = userMessages.join(' ').toLowerCase();
  return /(signal|screen|remote|receiver|box|decoder|channel|audio|sound|power|error|smart card|hdmi|video|picture|cable|dish|load|reload|payment|paymongo|billing|not working|hindi gumagana|hindi pa rin|ayaw|sira|problema)/i.test(text);
}

function inferDraftTarget(action) {
  if (action?.draftTarget) return action.draftTarget;
  if (action?.path === '/user/report-problem') return 'ticket';
  if (action?.path === '/user/technician-request') return 'technician';
  return null;
}

export default function CignalBot() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState(INIT);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [preparingAction, setPreparingAction] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing, preparingAction]);

  const sendMessage = async (text) => {
    const cleanText = String(text || '').trim();
    if (!cleanText || typing || preparingAction) return;

    const userMessage = { id: Date.now(), from: 'user', text: cleanText };
    const nextMessages = [...messages, userMessage];
    const conversationContext = buildConversationContext(nextMessages, 8);

    setMessages(nextMessages);
    setInput('');
    setTyping(true);

    const shouldUseLiveData = shouldUseLiveSystemData(cleanText);
    const ruleResponse = shouldUseLiveData ? null : getRuleBasedResponse(cleanText);

    if (ruleResponse) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      setTyping(false);
      setMessages((previous) => [
        ...previous,
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

      setMessages((previous) => [
        ...previous,
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

      setMessages((previous) => [
        ...previous,
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

  const openAction = async (action) => {
    if (!action?.path || preparingAction) return;

    const draftTarget = inferDraftTarget(action);
    const shouldPrepareDraft = draftTarget && hasUsefulSupportContext(messages);

    if (!shouldPrepareDraft) {
      setOpen(false);
      navigate(action.path);
      return;
    }

    const actionKey = `${draftTarget}:${action.path}`;
    setPreparingAction(actionKey);

    try {
      const data = await prepareChatbotSupportDraft({
        target: draftTarget,
        context: buildConversationContext(messages, 12),
      });
      const draft = data?.draft || {};

      const state = draftTarget === 'ticket'
        ? {
            source: 'cignalbot',
            cignalBotDraft: true,
            prefillCategory: draft.category,
            prefillSubject: draft.subject,
            prefillIssueDescription: draft.description,
          }
        : {
            source: 'cignalbot',
            cignalBotDraft: true,
            prefillServiceType: draft.serviceType,
            prefillIssueDescription: draft.description,
          };

      setOpen(false);
      navigate(action.path, { state });
    } catch (error) {
      console.error('CIGNALBOT SUPPORT DRAFT ERROR:', error);
      setOpen(false);
      navigate(action.path);
    } finally {
      setPreparingAction('');
    }
  };

  const resetChat = () => {
    setMessages(INIT);
    setInput('');
    setPreparingAction('');
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {open && (
        <div
          className="flex w-80 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
          style={{ height: minimized ? 'auto' : '420px' }}
        >
          <div className="flex flex-shrink-0 items-center gap-2 bg-gradient-to-r from-[#880000] to-[#cc0000] px-4 py-3 text-white">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
              <Bot size={16} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold leading-tight">CignalBot</p>
              <p className="text-xs text-red-200">Verified support + Gemini AI</p>
            </div>
            <button onClick={resetChat} className="rounded-lg p-1 hover:bg-white/20" title="Reset chat">
              <RotateCcw size={13} />
            </button>
            <button onClick={() => setMinimized(!minimized)} className="rounded-lg p-1 hover:bg-white/20">
              <ChevronDown size={15} className={`transition-transform ${minimized ? 'rotate-180' : ''}`} />
            </button>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-white/20">
              <X size={15} />
            </button>
          </div>

          {!minimized && (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-3">
                {messages.map((message) => (
                  <div key={message.id}>
                    <div className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {message.from === 'bot' && (
                        <div className="mr-2 mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#cc0000] to-[#880000] text-white">
                          <Bot size={12} />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                          message.from === 'user'
                            ? 'rounded-br-sm bg-[#cc0000] text-white'
                            : 'rounded-bl-sm border border-gray-200 bg-white text-gray-800 shadow-sm'
                        }`}
                      >
                        {renderText(message.text)}
                      </div>
                    </div>

                    {message.quickReplies?.length > 0 && (
                      <div className="ml-9 mt-1.5 flex flex-wrap gap-1.5">
                        {message.quickReplies.map((reply, index) => (
                          <button
                            key={index}
                            onClick={() => sendMessage(reply)}
                            disabled={Boolean(preparingAction)}
                            className="rounded-full border border-[#cc0000] bg-white px-2.5 py-1 text-xs text-[#cc0000] transition-colors hover:bg-red-50 disabled:opacity-50"
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                    )}

                    {message.actions?.length > 0 && (
                      <div className="ml-9 mt-1.5 flex flex-col gap-1.5">
                        {message.actions.map((action, index) => {
                          const actionTarget = inferDraftTarget(action);
                          const actionKey = actionTarget ? `${actionTarget}:${action.path}` : '';
                          const isPreparing = actionKey && preparingAction === actionKey;

                          return (
                            <button
                              key={index}
                              onClick={() => openAction(action)}
                              disabled={Boolean(preparingAction)}
                              className={`rounded-lg px-3 py-1.5 text-left text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${ACTION_COLORS[action.color] || ACTION_COLORS.red}`}
                            >
                              {isPreparing ? 'Preparing support draft...' : action.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

                {typing && (
                  <div className="flex justify-start">
                    <div className="mr-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#cc0000] to-[#880000] text-white">
                      <Bot size={12} />
                    </div>
                    <div className="rounded-xl rounded-bl-sm border border-gray-200 bg-white px-3 py-2 shadow-sm">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((index) => (
                          <div
                            key={index}
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                            style={{ animationDelay: `${index * 0.15}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="flex flex-shrink-0 flex-wrap gap-1.5 border-t border-gray-100 bg-white px-3 py-2">
                {['No Signal', 'Load', 'Ticket', 'Technician'].map((reply) => (
                  <button
                    key={reply}
                    onClick={() => sendMessage(reply)}
                    disabled={Boolean(preparingAction)}
                    className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:bg-red-50 hover:text-[#cc0000] disabled:opacity-50"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              <div className="flex flex-shrink-0 gap-2 border-t border-gray-100 bg-white p-3">
                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && sendMessage(input)}
                  placeholder="Ilagay ang mensahe..."
                  disabled={typing || Boolean(preparingAction)}
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#cc0000] disabled:bg-gray-50"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || typing || Boolean(preparingAction)}
                  className="flex-shrink-0 rounded-xl bg-[#cc0000] p-2 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <Send size={13} />
                </button>
              </div>

              <p className="bg-white pb-2 text-center text-gray-400" style={{ fontSize: '9px' }}>
                AI suggestions never submit records automatically
              </p>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => {
          setOpen(!open);
          setMinimized(false);
        }}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#cc0000] text-white shadow-2xl transition-all hover:scale-110 hover:bg-red-700 active:scale-95"
        aria-label="Open CignalBot"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
        <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-green-500" />
      </button>
    </div>
  );
}
