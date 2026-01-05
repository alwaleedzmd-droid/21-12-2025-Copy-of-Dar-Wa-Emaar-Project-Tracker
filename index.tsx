
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { DataProvider } from './contexts/DataContext';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Failed to find root element");

const root = createRoot(rootElement);

// استخدام HashRouter هو الحل الأمثل لبيئات الاستضافة التي لا تدعم توجيه الخادم (Server-side routing)
root.render(
  <React.StrictMode>
    <HashRouter>
      <DataProvider>
        <App />
      </DataProvider>
    </HashRouter>
  </React.StrictMode>
);
