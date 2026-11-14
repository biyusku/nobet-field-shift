import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { TooltipProvider } from './components/kit';
import { StoreProvider } from './state';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider delayDuration={200}>
      <StoreProvider>
        <App />
      </StoreProvider>
    </TooltipProvider>
  </StrictMode>,
);
