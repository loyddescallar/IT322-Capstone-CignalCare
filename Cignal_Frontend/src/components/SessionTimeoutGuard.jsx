import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Clock3, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  SESSION_ACTIVITY_KEY,
  SESSION_TIMEOUT_MS,
  getInactivityState,
  getSessionIdentity,
  readLastHumanActivity,
  saveLastHumanActivity,
} from '../utils/sessionActivity';

function currentUser() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.role) return user;
    return JSON.parse(localStorage.getItem('adminUser') || 'null');
  } catch {
    return null;
  }
}

function isProtectedScreen(path, role) {
  if (role === 'admin') return path === '/admin-dashboard' || path.startsWith('/admin/');
  if (role === 'user') {
    return path === '/user-dashboard' || path.startsWith('/user/') || path.startsWith('/troubleshoot');
  }
  return false;
}

function loginPath(role) {
  return role === 'admin' ? '/admin-login' : '/login';
}

export default function SessionTimeoutGuard() {
  const { pathname, search } = useLocation();
  const token = localStorage.getItem('token');
  const user = currentUser();
  const role = user?.role;
  const isProtected = isProtectedScreen(pathname, role) && Boolean(token);
  const identity = isProtected ? getSessionIdentity(token, user) : null;
  const [warning, setWarning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(SESSION_TIMEOUT_MS);
  const warningRef = useRef(false);
  const loggedOutRef = useRef(false);

  const expireSession = useCallback(() => {
    if (loggedOutRef.current) return;
    loggedOutRef.current = true;
    // Delete all local auth state and reload to discard sensitive in-memory UI,
    // including ticket previews, form drafts and CignalBot conversation history.
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('adminUser');
    localStorage.removeItem(SESSION_ACTIVITY_KEY);
    window.location.replace(`${loginPath(role)}?session=expired`);
  }, [role]);

  useEffect(() => {
    warningRef.current = false;
    setWarning(false);
    setRemainingMs(SESSION_TIMEOUT_MS);
    loggedOutRef.current = false;
    if (!identity || !isProtected) return undefined;

    let lastWrittenAt = 0;
    const storage = window.localStorage;
    if (readLastHumanActivity(storage, identity) === null) {
      saveLastHumanActivity(storage, identity);
    }

    const check = () => {
      if (loggedOutRef.current) return;
      if (storage.getItem('token') !== token) {
        // Another tab signed out or switched accounts. Never preserve this UI.
        window.location.replace(loginPath(role));
        return;
      }
      const last = readLastHumanActivity(storage, identity);
      // If the record was cleared externally, treat it as an invalidated
      // session rather than silently granting another five-minute window.
      if (last === null) {
        expireSession();
        return;
      }
      const status = getInactivityState(last);
      if (status.expired) {
        expireSession();
        return;
      }
      warningRef.current = status.warning;
      setWarning(status.warning);
      setRemainingMs(status.remainingMs);
    };

    const onHumanActivity = (event) => {
      if (!event.isTrusted || loggedOutRef.current || warningRef.current) return;
      const now = Date.now();
      if (now - lastWrittenAt < 1000) return;
      const last = readLastHumanActivity(storage, identity);
      if (last === null || getInactivityState(last, now).warning) {
        check();
        return;
      }
      saveLastHumanActivity(storage, identity, now);
      lastWrittenAt = now;
    };

    // Only real human input resets inactivity. Timers, background data refresh,
    // API polling and window focus events do not reset the clock.
    const humanEvents = ['pointermove', 'pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'];
    humanEvents.forEach((name) => window.addEventListener(name, onHumanActivity, { passive: true }));
    const onStorage = (event) => {
      if (event.key === SESSION_ACTIVITY_KEY || event.key === 'token' || event.key === null) check();
    };
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    const timer = window.setInterval(check, 1000);
    check();

    return () => {
      window.clearInterval(timer);
      humanEvents.forEach((name) => window.removeEventListener(name, onHumanActivity));
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, [identity, isProtected, token, role, expireSession]);

  const staySignedIn = () => {
    const last = readLastHumanActivity(localStorage, identity);
    if (!identity || localStorage.getItem('token') !== token ||
        last === null || getInactivityState(last).expired) {
      expireSession();
      return;
    }
    saveLastHumanActivity(localStorage, identity);
    warningRef.current = false;
    setWarning(false);
    setRemainingMs(SESSION_TIMEOUT_MS);
  };

  // After an automatic logout, show a gentle, unmistakable explanation on the login screen.
  if ((pathname === '/login' || pathname === '/admin-login') &&
      new URLSearchParams(search).get('session') === 'expired') {
    return (
      <div role="status" className="fixed left-1/2 top-3 z-[1000] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-900 shadow-lg">
        Your session ended after 5 minutes of inactivity. Please sign in again.
      </div>
    );
  }
  if (!isProtected || !identity || !warning) return null;

  const secondsLeft = Math.ceil(remainingMs / 1000);
  const timeLeft = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]"
      role="presentation"
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-timeout-title"
        aria-describedby="session-timeout-description"
        className="w-full max-w-md rounded-2xl border border-amber-100 bg-white p-5 text-slate-800 shadow-2xl sm:p-7"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <ShieldAlert size={26} aria-hidden="true" />
          </div>
          <div>
            <h2 id="session-timeout-title" className="text-xl font-bold">Are you still there?</h2>
            <p className="text-sm font-medium text-amber-700">Inactivity security warning</p>
          </div>
        </div>
        <p id="session-timeout-description" className="text-sm leading-6 text-slate-600">
          You have been inactive for 3 minutes. For your protection, this {role === 'admin' ? 'administrator' : 'subscriber'} session will automatically sign out when the countdown ends. Unsaved changes may be lost.
        </p>
        <div className="my-5 rounded-xl bg-slate-50 px-4 py-4 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Clock3 size={16} aria-hidden="true" /> Time remaining
          </div>
          <p className="mt-1 font-mono text-4xl font-bold tabular-nums text-red-700" role="timer" aria-live="off">{timeLeft}</p>
        </div>
        <button
          type="button"
          autoFocus
          onClick={staySignedIn}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#cc0000] px-4 py-3 text-base font-bold text-white transition hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        >
          <ShieldCheck size={20} aria-hidden="true" /> Stay Signed In
        </button>
        <p className="mt-3 text-center text-xs text-slate-500">Only pressing this button extends your session after the warning appears.</p>
      </section>
    </div>
  );
}
