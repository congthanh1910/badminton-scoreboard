import React from 'react';
import { Toaster } from 'react-hot-toast';
import ReactDOM from 'react-dom/client';
import '@/styles/globals.css';
import App from '@/app';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster />
  </React.StrictMode>
);
