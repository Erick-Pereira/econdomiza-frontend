import { Navigate } from 'react-router-dom';

/** @deprecated Use `/notificacoes` via NotificationsLayout */
export default function NotificacoesPage() {
  return <Navigate to="/notificacoes" replace />;
}
