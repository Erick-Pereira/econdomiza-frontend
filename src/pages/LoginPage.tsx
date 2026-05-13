import { LoginForm } from '../features/auth/components/LoginForm';

/**
 * Página fina de login: delega para o formulário canónico da feature `auth`.
 * Mantida para imports legados e possíveis rotas dedicadas.
 */
export default function LoginPage() {
  return <LoginForm defaultTenantId={import.meta.env.VITE_DEFAULT_TENANT_ID} />;
}
