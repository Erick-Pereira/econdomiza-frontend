import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import App from './App';

const el = document.getElementById('react-root');
if (el) {
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}