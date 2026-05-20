import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import App from './App';
// TEMP_AUTH_DISABLED: Inicializar modo dev sem autenticação
import { initTempAuthBypass } from './lib/temp-auth-init';

// TEMP_AUTH_DISABLED: Chamar inicialização
initTempAuthBypass();

const el = document.getElementById('react-root');
if (el) {
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}