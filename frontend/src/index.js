import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// AGGRESSIVE ResizeObserver error suppression
// This error is harmless and only appears in development
(function() {
  // Suppress console errors
  const originalError = console.error;
  console.error = function(...args) {
    if (
      args[0]?.includes?.('ResizeObserver') ||
      args[0]?.message?.includes?.('ResizeObserver')
    ) {
      return;
    }
    originalError.apply(console, args);
  };

  // Suppress window errors
  const errorHandler = (event) => {
    if (
      event.message?.includes('ResizeObserver') ||
      event.error?.message?.includes('ResizeObserver')
    ) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return false;
    }
  };
  
  window.addEventListener('error', errorHandler, true);
  
  // Suppress unhandled rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('ResizeObserver')) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return false;
    }
  }, true);

  // Override ResizeObserver to catch and ignore the error
  const originalResizeObserver = window.ResizeObserver;
  window.ResizeObserver = class ResizeObserver extends originalResizeObserver {
    constructor(callback) {
      super((entries, observer) => {
        window.requestAnimationFrame(() => {
          callback(entries, observer);
        });
      });
    }
  };
})();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />); // Removed StrictMode to prevent double rendering
