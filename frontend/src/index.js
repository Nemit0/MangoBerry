// src/index.js (업데이트)
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext'; 

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(

  <AuthProvider>
    <BrowserRouter>
        <App />
    </BrowserRouter>
  </AuthProvider>

);