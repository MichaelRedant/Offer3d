// lib/constants.js
// Eén duidelijke regel: VITE_API_BASE heeft voorrang, anders gebruik de remote API.
// Geen BASE_URL fallback meer zodat dev nooit naar localhost wijst.

const envApiBase = import.meta?.env?.VITE_API_BASE;

// Val terug op dezelfde host zodat lokale builds niet onbedoeld productie aanroepen.
const fallback = `${window.location.origin}/offr3d/api`;

export const baseUrl = (envApiBase || fallback).replace(/\/$/, "");
