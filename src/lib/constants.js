// lib/constants.js
const rawBase = (import.meta?.env?.BASE_URL ?? "/").replace(/\/$/, "");
const origin =
  typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "";

const resolvedBase = `${origin}${rawBase || ""}`.replace(/\/$/, "");
export const baseUrl = `${resolvedBase}/api`;
