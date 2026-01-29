
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; 
import App from './App';
import { DataProvider } from './contexts/DataContext';
import { NotificationProvider } from './context/NotificationContext';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Failed to find root element");

const root = createRoot(rootElement);

// If a demo query param is present, persist a lightweight demo session
try {
  const params = new URLSearchParams(window.location.search);
  const demoEmail = params.get('demo');
  if (demoEmail) {
    try {
      const email = demoEmail.toLowerCase();
      localStorage.setItem('dar_demo_session', JSON.stringify({ id: 'demo-' + email, email }));
      // remove query param to keep URLs clean
      const url = new URL(window.location.href);
      url.searchParams.delete('demo');
      window.history.replaceState({}, document.title, url.toString());
    } catch (e) { /* ignore storage errors */ }
  }
} catch (e) { /* ignore URL parsing errors in older browsers */ }

/**
 * Hard Refactor: Using BrowserRouter for address bar sync.
 * Order: BrowserRouter -> DataProvider (Auth) -> NotificationProvider (Real-time).
 */
root.render(
  <React.StrictMode>
    <BrowserRouter> 
      <DataProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </DataProvider>
    </BrowserRouter>
  </React.StrictMode>
);
