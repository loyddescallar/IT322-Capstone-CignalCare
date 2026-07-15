import { Check } from 'lucide-react';

export default function RequestTimeline({ steps, current, failed = false, compact = false }) {
  const currentIndex = Math.max(0, steps.indexOf(current));

  if (failed) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-100">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        {current || 'Rejected'}
      </div>
    );
  }

  return (
    <div className={`flex w-full items-center ${compact ? 'max-w-md' : ''}`} aria-label={`Progress: ${current}`}>
      {steps.map((step, index) => {
        const completed = index < currentIndex;
        const active = index === currentIndex;

        return (
          <div key={step} className="flex min-w-0 flex-1 items-center last:flex-none">
            <div className="flex min-w-0 flex-col items-center gap-1">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold transition ${
                  completed
                    ? 'border-green-500 bg-green-500 text-white'
                    : active
                      ? 'border-[#cc0000] bg-[#cc0000] text-white ring-4 ring-red-100'
                      : 'border-slate-200 bg-white text-slate-400'
                }`}
              >
                {completed ? <Check size={12} strokeWidth={3} /> : index + 1}
              </span>
              {!compact && (
                <span className={`hidden max-w-[88px] truncate text-center text-[10px] font-semibold sm:block ${active ? 'text-[#cc0000]' : completed ? 'text-green-600' : 'text-slate-400'}`}>
                  {step}
                </span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={`mx-1 h-0.5 min-w-3 flex-1 rounded-full ${index < currentIndex ? 'bg-green-400' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
