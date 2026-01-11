
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; 
import App from './App';
import { DataProvider } from './contexts/DataContext';
import { NotificationProvider } from './context/NotificationContext';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Failed to find root element");

const root = createRoot(rootElement);

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
