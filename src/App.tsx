import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ErrorProvider } from './utils/global-error-handler';
import { ToastProvider } from './components/ui/Toast';
import { LoginForm } from './features/auth/components/LoginForm';
import { RegisterForm } from './features/auth/components/RegisterForm';
import { MainLayoutRefactored } from './app/layouts/MainLayoutRefactored';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { QueryProvider } from './app/QueryProvider';
import TestPage from './pages/TestPage';

function App() {
  return (
    <ErrorProvider>
      <QueryProvider>
        <ToastProvider>
          <Router>
            <AppErrorBoundary>
              <AuthProvider>
                <Routes>
                  <Route path="/login" element={<LoginForm />} />
                  <Route path="/register" element={<RegisterForm />} />
                  <Route path="/auth.html" element={<Navigate to="/login" replace />} />
                  <Route path="/test" element={<TestPage />} />
                  <Route path="/*" element={<MainLayoutRefactored />} />
                </Routes>
              </AuthProvider>
            </AppErrorBoundary>
          </Router>
        </ToastProvider>
      </QueryProvider>
    </ErrorProvider>
  );
}

export default App;
