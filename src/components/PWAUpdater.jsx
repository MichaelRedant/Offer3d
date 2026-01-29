import { useEffect, useMemo, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useToast } from "../context/ToastContext";

// Keep PWA wiring inside its own component so App stays clean.
export default function PWAUpdater() {
  const { showToast } = useToast();
  const [dismissed, setDismissed] = useState(false);

  const {
    offlineReady,
    needRefresh,
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisterError(error) {
      console.error("Service worker registration failed", error);
      showToast({ message: "Service worker kon niet registreren.", type: "error", duration: 5000 });
    },
  });

  const showUpdateBanner = useMemo(() => needRefresh && !dismissed, [needRefresh, dismissed]);

  useEffect(() => {
    if (offlineReady) {
      showToast({
        message: "Offr3d staat klaar voor offline gebruik.",
        type: "success",
        duration: 6000,
      });
    }
  }, [offlineReady, showToast]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleOnline = () =>
      showToast({ message: "Je bent weer online.", type: "success", duration: 3500 });
    const handleOffline = () =>
      showToast({ message: "Offline modus: wijzigingen worden gesynchroniseerd zodra je weer online bent.", type: "warning", duration: 5500 });

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [showToast]);

  if (!showUpdateBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:left-4 z-[9998] flex justify-start">
      <div className="terminal-card border border-primary/60 bg-parchment shadow-terminal max-w-xl w-full">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.08em] text-ink">Nieuwe versie beschikbaar</p>
            <p className="text-xs text-ink/80">Herlaad om direct de laatste update te gebruiken.</p>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="terminal-button"
              onClick={() => updateServiceWorker(true)}
            >
              Herladen
            </button>
            <button
              type="button"
              className="terminal-button is-ghost"
              onClick={() => setDismissed(true)}
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
