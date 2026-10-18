import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import incidentApi from '../api/incidentApi';

export default function ServiceAdvisoryBanner() {
  const [items, setItems] = useState([]);
  const [hidden, setHidden] = useState(new Set());

  useEffect(() => {
    let active = true;

    incidentApi
      .getMyIncidents()
      .then((response) => {
        if (active) setItems(response.data?.incidents || []);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const visible = items.filter((item) => !hidden.has(item.id));
  if (!visible.length) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto max-w-7xl space-y-2 px-4 py-3 sm:px-6 lg:px-8">
        {visible.slice(0, 2).map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-xl border border-amber-200 bg-white/90 px-3 py-3 sm:px-4"
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                Service Advisory · {item.location}
              </p>
              <p className="mt-1 break-words text-sm font-bold text-slate-900">
                {item.issue_label}
              </p>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                A common service issue has been confirmed in your area. You may still submit an individual concern if your situation is different.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setHidden((previous) => new Set([...previous, item.id]))}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-amber-600 transition hover:bg-amber-100"
              aria-label={`Dismiss ${item.issue_label || 'service advisory'}`}
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
