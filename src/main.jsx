import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css';
import App from './App.jsx'

// Globale fetch-wrapper om Authorization header toe te voegen
const apiKey = import.meta.env.VITE_API_KEY;
if (apiKey && typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = (input, init = {}) => {
    const headers = new Headers(init.headers || {});
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${apiKey}`);
    }
    // CSRF header verwacht dezelfde key
    if (!headers.has('X-CSRF')) {
      headers.set('X-CSRF', apiKey);
    }
    return originalFetch(input, { ...init, headers });
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/offr3d/sw.js').catch((err) => {
      console.error('SW registration failed:', err);
    });
  });
}
