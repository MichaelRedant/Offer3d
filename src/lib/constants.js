// lib/constants.js
// Eén duidelijke regel: VITE_API_BASE heeft voorrang, anders gebruik de remote API.
// Geen BASE_URL fallback meer zodat dev nooit naar localhost wijst.

const envApiBase = import.meta?.env?.VITE_API_BASE;

export const baseUrl = (envApiBase || "https://xinudesign.be/offr3d/api").replace(/\/$/, "");
