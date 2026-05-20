import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthSessionProvider } from './context/AuthSessionContext';
import { ErrorProvider } from './utils/global-error-handler';
import { ToastProvider } from './components/ui/Toast';
import { LoginForm } from './features/auth/components/LoginForm';
import { RegisterForm } from './features/auth/components/RegisterForm';
import { MainLayout } from './app/layouts/MainLayout';
import { AppErrorBoundary } from './components/AppErrorBoundary';

function App() {
  // TEMP_AUTH_DISABLED: Ativar modo desenvolvimento sem autenticação
  // Remova a linha abaixo ou defina como false para reativar autenticação
  const TEMP_AUTH_DISABLED = true; // CHANGE: false para reativar auth
  if (TEMP_AUTH_DISABLED && typeof window !== 'undefined') {
    localStorage.setItem('TEMP_AUTH_DISABLED_MODE', 'true');
  }

  return (
    <ErrorProvider>
      <ToastProvider>
        <Router>
          <AppErrorBoundary>
            <AuthSessionProvider>
              <Routes>
                <Route
                  path="/login"
                  element={<LoginForm defaultTenantId={import.meta.env.VITE_DEFAULT_TENANT_ID} />}
                />
                <Route
                  path="/register"
                  element={<RegisterForm defaultTenantId={import.meta.env.VITE_DEFAULT_TENANT_ID} />}
                />
                {/* TEMP_AUTH_DISABLED: Redirecionar /auth.html → /dashboard em modo dev */}
                <Route path="/auth.html" element={<Navigate to={TEMP_AUTH_DISABLED ? "/dashboard" : "/login"} replace />} />
                <Route path="*" element={<MainLayout />} />
              </Routes>
            </AuthSessionProvider>
          </AppErrorBoundary>
        </Router>
      </ToastProvider>
    </ErrorProvider>
  );
}

export default App;
