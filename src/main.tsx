import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import 'vazirmatn/Vazirmatn-font-face.css';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(<App />);
