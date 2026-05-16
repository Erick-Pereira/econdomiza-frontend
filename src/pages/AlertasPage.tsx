import React, { useCallback, useEffect, useState } from 'react';
import {
  formatAlertDateTimePtBr,
  isAlertRowResolved,
  prioridadeLabelFromSeverity,
  severityUpperFromAlertRow,
} from '../lib/alert-row';
import { normalizeListPayload } from '../lib/api-normalize';
import { formatApiError } from '../lib/api-error-message';
import { EcondomizaApi } from '../services';
import { PageHeader } from '../components/layout/PageHeader';
import { PageFatalErrorState, PageLoadingState } from '../components/layout/PageLoadStates';
import { TableScrollHint } from '../components/layout/TableScrollHint';

interface AlertRow {
  id: string;
  tipo: string;
  condominioNome: string;
  titulo: string;
  categoria: string;
  prioridade: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const AlertasPage: React.FC = () => {
  const [alertas, setAlertas] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, condoRes] = await Promise.all([
        EcondomizaApi.listAlerts({ page: 1, pageSize: 100 }),
        EcondomizaApi.getMyCondominio(),
      ]);
      const condo = condoRes.data as { nome?: string; name?: string };
      const nome = String(condo?.nome ?? condo?.name ?? 'Condomínio');
      const items = normalizeListPayload(listRes.data);
      const rows: AlertRow[] = (items as Record<string, unknown>[]).map((item) => {
        const sev = severityUpperFromAlertRow(item);
        const prio = prioridadeLabelFromSeverity(sev);
        const msg = String(item.message ?? item.title ?? item.titulo ?? '');
        const product = String(item.productName ?? '');
        return {
          id: String(item.id ?? ''),
          tipo: String(item.type ?? item.tipo ?? 'alerta'),
          condominioNome: nome,
          titulo: product ? `${product} — ${msg}` : msg,
          categoria: String(item.alertCategory ?? item.category ?? item.categoria ?? '—'),
          prioridade: prio,
          status: isAlertRowResolved(item) ? 'resolvido' : 'aberto',
          createdAt: String(item.createdAt ?? ''),
          updatedAt: String(item.updatedAt ?? item.createdAt ?? ''),
        };
      });
      setAlertas(rows);
      setError(null);
    } catch (e) {
      console.error(e);
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) {
    return <PageLoadingState id="alertas-page" message="Carregando alertas…" skeletonMaxWidth={640} />;
  }

  if (error && !alertas.length) {
    return <PageFatalErrorState id="alertas-page" message={error} onRetry={() => void loadData()} />;
  }

  return (
    <div className="page" id="alertas-page">
      <PageHeader
        title="Alertas"
        description="Prioridade e estado dos alertas gerados para o condomínio. Atualize para sincronizar com o servidor."
        quickLinks={[
          { to: '/notificacoes', label: 'Notificações' },
          { to: '/insights', label: 'Insights operacionais' },
          { to: '/compras', label: 'Compras' },
        ]}
        toolbar={
          <button type="button" className="btn-small" disabled={loading} onClick={() => void loadData()}>
            {loading ? 'A atualizar…' : 'Atualizar'}
          </button>
        }
      />

      {error && alertas.length > 0 && <div className="banner banner--error">{error}</div>}

      <TableScrollHint />
      <div className="alerts-container table-scroll">
        {alertas.length > 0 ? (
          <table className="alerts-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Condomínio</th>
                <th>Título</th>
                <th>Categoria</th>
                <th>Prioridade</th>
                <th>Estado</th>
                <th>Criado</th>
              </tr>
            </thead>
            <tbody>
              {alertas.map((a) => (
                <tr key={a.id}>
                  <td>{a.tipo}</td>
                  <td>{a.condominioNome}</td>
                  <td>{a.titulo}</td>
                  <td>{a.categoria}</td>
                  <td>{a.prioridade}</td>
                  <td>{a.status}</td>
                  <td>{formatAlertDateTimePtBr(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <p>Sem alertas ou sem permissão (Conselho).</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertasPage;
