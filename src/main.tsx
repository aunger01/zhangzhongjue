import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import './styles/animations.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('缺少 #root 容器，无法挂载应用。');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
