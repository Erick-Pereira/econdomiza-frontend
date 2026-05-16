import React, { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import NotFoundPage from '../pages/NotFoundPage';
import { AUTHENTICATED_PAGE_LOADERS } from './authenticated-route-registry';

const DashboardPage = lazy(AUTHENTICATED_PAGE_LOADERS['/dashboard']);
const ComprasPage = lazy(AUTHENTICATED_PAGE_LOADERS['/compras']);
const ExpenseOperationalDetailPage = lazy(() => import('../pages/ExpenseOperationalDetailPage'));
const FornecedoresPage = lazy(AUTHENTICATED_PAGE_LOADERS['/fornecedores']);
const ProdutosPage = lazy(AUTHENTICATED_PAGE_LOADERS['/produtos']);
const AlertasPage = lazy(AUTHENTICATED_PAGE_LOADERS['/alertas']);
const NotificationsLayout = lazy(AUTHENTICATED_PAGE_LOADERS['/notificacoes']);
const NotificationsCentralPage = lazy(() => import('../pages/notifications/NotificationsCentralPage'));
const ComplianceLayout = lazy(AUTHENTICATED_PAGE_LOADERS['/conformidades']);
const ComplianceObrigacoesHubPage = lazy(() => import('../pages/compliance/ComplianceObrigacoesHubPage'));
const ExpenseCompliancePage = lazy(() => import('../pages/compliance/ExpenseCompliancePage'));
const AuditoriaPage = lazy(AUTHENTICATED_PAGE_LOADERS['/auditoria']);
const InsightsPage = lazy(AUTHENTICATED_PAGE_LOADERS['/insights']);
const RelatoriosPage = lazy(AUTHENTICATED_PAGE_LOADERS['/relatorios']);
const ConfiguracoesPage = lazy(AUTHENTICATED_PAGE_LOADERS['/configuracoes']);

/**
 * Rotas autenticadas (lazy). O `Suspense` fica no `LazyShell` em `MainLayout`.
 * Imports dinâmicos: `authenticated-route-registry.ts` (e `route-prefetch.ts`).
 */
const AuthenticatedRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/mercado" element={<Navigate to="/produtos" replace />} />
    <Route path="/compras/:expenseId" element={<ExpenseOperationalDetailPage />} />
    <Route path="/compras" element={<ComprasPage />} />
    <Route path="/fornecedores" element={<FornecedoresPage />} />
    <Route path="/produtos" element={<ProdutosPage />} />
    <Route path="/alertas" element={<AlertasPage />} />
    <Route path="/notificacoes" element={<NotificationsLayout />}>
      <Route index element={<NotificationsCentralPage />} />
      <Route path="historico" element={<Navigate to="/notificacoes?visao=historico" replace />} />
      <Route path="falhas" element={<Navigate to="/notificacoes?visao=historico&estado=Failed" replace />} />
      <Route path="retries" element={<Navigate to="/notificacoes?visao=historico" replace />} />
      <Route path="governanca" element={<Navigate to="/notificacoes?visao=canais" replace />} />
      <Route path="templates" element={<Navigate to="/notificacoes?visao=canais" replace />} />
      <Route path="preferencias" element={<Navigate to="/notificacoes?visao=preferencias" replace />} />
    </Route>
    <Route path="/conformidades" element={<ComplianceLayout />}>
      <Route index element={<ComplianceObrigacoesHubPage />} />
      <Route path="condominio" element={<Navigate to="/conformidades" replace />} />
      <Route path="pendencias" element={<Navigate to="/conformidades?visao=compras" replace />} />
      <Route path="violacoes" element={<Navigate to="/conformidades?visao=compras" replace />} />
      <Route path="excecoes" element={<Navigate to="/conformidades?visao=compras" replace />} />
      <Route path="historico" element={<Navigate to="/conformidades?visao=compras" replace />} />
      <Route path="regras" element={<Navigate to="/conformidades" replace />} />
      <Route path="despesa/:expenseId" element={<ExpenseCompliancePage />} />
    </Route>
    <Route path="/auditoria" element={<AuditoriaPage />} />
    <Route path="/insights" element={<InsightsPage />} />
    <Route path="/relatorios" element={<RelatoriosPage />} />
    <Route path="/configuracoes" element={<ConfiguracoesPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

export default AuthenticatedRoutes;
