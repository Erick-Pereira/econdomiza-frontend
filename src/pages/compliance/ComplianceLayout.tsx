import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * Shell mínimo: obrigações regulatórias (conformidade) num único hub (`ComplianceObrigacoesHubPage`).
 * Detalhe por despesa permanece em `/conformidades/despesa/:expenseId`.
 */
const ComplianceLayout: React.FC = () => (
  <div className="page compliance-hub compliance-hub--unified" id="obligation-hub-root">
    <Outlet />
  </div>
);

export default ComplianceLayout;
