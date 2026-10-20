// Compatibility guard for window.fetch
try {
  let _fetch = window.fetch;
  Object.defineProperty(window, 'fetch', {
    get: () => _fetch,
    set: (fn) => {
      _fetch = fn;
    },
    configurable: true,
    enumerable: true
  });
} catch {
  // Ignore if already configured
}

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
