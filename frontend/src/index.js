import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Suppress ResizeObserver errors (harmless development warnings)
const debounce = (callback, delay) => {
  let tid;
  return function (...args) {
    const ctx = this;
    tid && clearTimeout(tid);
    tid = setTimeout(() => {
      callback.apply(ctx, args);
    }, delay);
  };
};

// Global error handler
const _ = window.console.error;
window.console.error = function (msg, ...args) {
  const suppressedWarnings = [
    'ResizeObserver loop completed with undelivered notifications',
    'ResizeObserver loop limit exceeded'
  ];
  
  if (suppressedWarnings.some(warning => String(msg).includes(warning))) {
    return;
  }
  
  _.call(console, msg, ...args);
};

// Also suppress in error events
window.addEventListener('error', (e) => {
  if (e.message && (
    e.message.includes('ResizeObserver loop') ||
    e.message.includes('ResizeObserver')
  )) {
    e.stopImmediatePropagation();
    e.preventDefault();
    return false;
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
