import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const ToastContext = createContext(undefined);
const TONE_CLASSES = {
  success: "border-signal-green/70 shadow-terminal-glow",
  error: "border-signal-red/70",
  warning: "border-signal-amber/70",
  info: "border-primary/70",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const showToast = useCallback(
    ({ message, type = "info", duration = 4500 } = {}) => {
      const trimmed = `${message ?? ""}`.trim();
      if (!trimmed) return;

      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;

      setToasts((prev) => [...prev, { id, message: trimmed, type }]);

      if (Number.isFinite(duration) && duration > 0) {
        timers.current[id] = setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach((timeoutId) => clearTimeout(timeoutId));
      timers.current = {};
    };
  }, []);

  const value = useMemo(() => ({ showToast, removeToast }), [showToast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex justify-end px-4 sm:px-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex w-full max-w-lg flex-col gap-3 items-end">
        {toasts.map((toast) => {
          const toneClass = TONE_CLASSES[toast.type] ?? TONE_CLASSES.info;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-card border bg-base-soft/95 text-ink shadow-terminal transition hover:-translate-y-0.5 ${toneClass}`}
            >
              <div className="flex items-start justify-between gap-3 p-4">
                <p className="text-sm font-medium leading-relaxed tracking-[0.06em]">{toast.message}</p>
                <button
                  type="button"
                  className="terminal-button is-ghost text-xs tracking-[0.12em]"
                  onClick={() => onDismiss(toast.id)}
                  aria-label="Sluit melding"
                >
                  Sluiten
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast moet binnen een ToastProvider worden gebruikt.");
  }
  return context;
}
