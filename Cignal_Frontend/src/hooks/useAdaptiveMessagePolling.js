import { useEffect, useRef } from 'react';

// Request only while the tab is visible. Never overlap requests for one conversation.
// Abort in-flight fetches when switching conversations or unmounting.
// The callback receives an AbortSignal and should forward it to Axios.
export default function useAdaptiveMessagePolling(poll, scopeKey, enabled = true) {
  const currentPoll = useRef(poll);
  currentPoll.current = poll;

  useEffect(() => {
    if (!enabled) return undefined;

    let disposed = false;
    let inFlight = false;
    let activeController = null;

    const refresh = async () => {
      if (disposed || inFlight || document.visibilityState === 'hidden') return;

      inFlight = true;
      const controller = new AbortController();
      activeController = controller;
      try {
        await currentPoll.current(controller.signal);
      } catch (error) {
        if (error?.code !== 'ERR_CANCELED' && !controller.signal.aborted) {
          console.error('CHAT POLL ERROR:', error);
        }
      } finally {
        activeController = null;
        inFlight = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refresh();
      else activeController?.abort();
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), 8000);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      disposed = true;
      activeController?.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [scopeKey, enabled]);
}
