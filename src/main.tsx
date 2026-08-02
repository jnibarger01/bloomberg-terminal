import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setBackendUrl, setApiKey } from './services/dataAdapter';

// Initialize backend configuration
const initBackendConfig = () => {
  // Load backend URL from localStorage or use default
  const savedBackendUrl = localStorage.getItem('bloomberg-backend-url');
  if (savedBackendUrl) {
    setBackendUrl(savedBackendUrl);
  }
  
  // Load API key from localStorage
  const savedApiKey = localStorage.getItem('bloomberg-api-key');
  if (savedApiKey) {
    setApiKey(savedApiKey);
  }
};

initBackendConfig();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);