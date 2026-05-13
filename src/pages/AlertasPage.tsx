import React, { useEffect, useState } from 'react';
import { normalizeListPayload } from '../lib/api-normalize';
import { formatApiError } from '../lib/api-error-message';
import { EcondomizaApi } from '../services/api';

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

  useEffect(() => {
    (async () => {
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
          const sev = String(item.severity ?? item.prioridade ?? 'WARNING').toUpperCase();
          const prio =
            sev === 'CRITICAL' ? 'alta' : sev === 'WARNING' ? 'media' : 'baixa';
          return {
            id: String(item.id ?? ''),
            tipo: String(item.type ?? item.tipo ?? 'alerta'),
            condominioNome: nome,
            titulo: String(item.title ?? item.titulo ?? item.message ?? ''),
            categoria: String(item.category ?? item.categoria ?? '—'),
            prioridade: prio,
            status: item.isResolved === true ? 'resolvido' : 'aberto',
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
    })();
  }, []);

  const formatDate = (date: string): string => {
    if (!date) return '—';
    try {
      return new Date(date).toLocaleString('pt-BR');
    } catch {
      return date;
    }
  };

  if (loading) {
    return (
      <div className="page" id="alertas-page">
        <p>A carregar alertas…</p>
      </div>
    );
  }

  if (error && !alertas.length) {
    return (
      <div className="page" id="alertas-page">
        <p>{error}</p>
        <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="page" id="alertas-page">
      <div className="page-header">
        <h1>Alertas</h1>
        <p>Fonte: GET /api/alerts (gateway)</p>
      </div>

      <div className="alerts-container">
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
                  <td>{formatDate(a.createdAt)}</td>
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
