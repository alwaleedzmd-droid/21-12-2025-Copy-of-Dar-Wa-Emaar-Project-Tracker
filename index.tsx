
import React from 'react';
import { createRoot } from 'react-dom/client';
// استخدام MemoryRouter هو الحل النهائي لمشاكل "No routes matched" و "replaceState" في بيئات Sandbox
// Fix: Use 'react-router' instead of 'react-router-dom' for core components to avoid export errors in this environment.
import { MemoryRouter } from 'react-router';
import App from './App';
import { DataProvider } from './contexts/DataContext';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Failed to find root element");

const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <MemoryRouter>
      <DataProvider>
        <App />
      </DataProvider>
    </MemoryRouter>
  </React.StrictMode>
);