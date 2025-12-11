
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '../App';
import { ToastProvider } from '../components/Toast';
import { initializeApp } from "firebase/app";

// Initialize Firebase with placeholder config to avoid startup errors.
// Real config is injected by the environment in production.
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890abcdef"
};

try {
  initializeApp(firebaseConfig);
} catch (e) {
  console.warn("Firebase initialization skipped or failed:", e);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
