
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { DataProvider } from './contexts/DataContext';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Failed to find root element");

const root = createRoot(rootElement);

// تم استخدام HashRouter بدلاً من BrowserRouter لضمان التوافق مع بيئات الاستضافة المختلفة
// وتجنب خطأ 404 عند تحديث الصفحات الفرعية.
root.render(
  <React.StrictMode>
    <HashRouter>
      <DataProvider>
        <App />
      </DataProvider>
    </HashRouter>
  </React.StrictMode>
);
