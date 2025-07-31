import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';

/* ───────────────────────── 1) Embed detection helpers ───────────────────────── */
function detectEmbedFromQuery() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('embed') === '1';
  } catch {
    return false;
  }
}

function detectEmbedFromPath() {
  try {
    const path = window.location.pathname || '';
    return path === '/embed' || path.startsWith('/embed/');
  } catch {
    return false;
  }
}

function detectIframe() {
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin access throws; assume we're iframed.
    return true;
  }
}

const IS_EMBED =
  detectEmbedFromQuery() || detectEmbedFromPath() || detectIframe();

// Expose for any page/component that wants to branch on embed behavior.
window.__EMBED_MODE = IS_EMBED;

// Add a class to <html> so global CSS can switch layouts easily.
try {
  const html = document.documentElement;
  if (IS_EMBED) html.classList.add('is-embed');
  else html.classList.remove('is-embed');
} catch { /* noop */ }

/* Optional: set a --vh CSS custom prop to handle viewport units more predictably. */
function setViewportUnit() {
  try {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  } catch { /* noop */ }
}
setViewportUnit();
window.addEventListener('resize', setViewportUnit);

/* ───────────────────────── 2) fetch override (kept) ───────────────────────── */
const root = ReactDOM.createRoot(document.getElementById('root'));

// Override fetch to automatically include JWT Authorization header for /api calls
if (window.fetch) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    let url = input;

    // Handle Request object
    if (input && typeof input === 'object' && input.url) {
      url = input.url;
    }

    // Attach token only for same-origin /api calls
    if (typeof url === 'string' && url.startsWith('/api')) {
      const token = localStorage.getItem('token');
      init.headers = {
        ...(init.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
    }

    return originalFetch(input, init);
  };
}

/* ───────────────────────── 3) Render ───────────────────────── */
root.render(
  <BrowserRouter>
    <App isEmbed={IS_EMBED} />
  </BrowserRouter>
);