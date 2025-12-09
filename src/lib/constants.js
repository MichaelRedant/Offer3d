// lib/constants.js
// Bouw een basispad dat altijd de submap omvat (bijv. /offr3d), zodat fetches
// niet per ongeluk naar de root (/api) gaan als BASE_URL leeg of verkeerd is.
let rawBase = (import.meta?.env?.BASE_URL ?? "/").replace(/\/$/, "");

if (!rawBase && typeof window !== "undefined") {
  // Fallback: als we in een submap draaien, neem die over
  const match = window.location.pathname.match(/^\/([A-Za-z0-9_-]+)(\/|$)/);
  if (match) {
    rawBase = `/${match[1]}`;
  }
}

const origin =
  typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "";

const resolvedBase = `${origin}${rawBase || ""}`.replace(/\/$/, "");
export const baseUrl = `${resolvedBase}/api`;
