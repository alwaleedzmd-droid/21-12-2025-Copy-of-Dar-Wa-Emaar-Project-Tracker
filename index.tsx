
import React from 'react';
import { createRoot } from 'react-dom/client';
// استخدام HashRouter من react-router بدلاً من react-router-dom لضمان التوافق مع البيئة
import { HashRouter } from 'react-router';
import App from './App';
import { DataProvider } from './contexts/DataContext';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Failed to find root element");

const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <HashRouter>
      <DataProvider>
        <App />
      </DataProvider>
    </HashRouter>
  </React.StrictMode>
);