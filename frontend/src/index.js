import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';

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
    // If calling backend API, attach token
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

root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
