import { useQuery } from '@tanstack/react-query';
import {
  isAlertRowResolved,
  prioridadeLabelFromSeverity,
  severityUpperFromAlertRow,
} from '../../../lib/alert-row';
import { normalizeListPayload } from '../../../lib/api-normalize';
import { EcondomizaApi } from '../../../services';
import { alertasKeys } from '../query-keys';

export interface AlertaRow {
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

function mapAlertRows(items: Record<string, unknown>[], condominioNome: string): AlertaRow[] {
  return items.map((item) => {
    const sev = severityUpperFromAlertRow(item);
    const prio = prioridadeLabelFromSeverity(sev);
    const msg = String(item.message ?? item.title ?? item.titulo ?? '');
    const product = String(item.productName ?? '');
    return {
      id: String(item.id ?? ''),
      tipo: String(item.type ?? item.tipo ?? 'alerta'),
      condominioNome,
      titulo: product ? `${product} — ${msg}` : msg,
      categoria: String(item.alertCategory ?? item.category ?? item.categoria ?? '—'),
      prioridade: prio,
      status: isAlertRowResolved(item) ? 'resolvido' : 'aberto',
      createdAt: String(item.createdAt ?? ''),
      updatedAt: String(item.updatedAt ?? item.createdAt ?? ''),
    };
  });
}

export function useAlertasList() {
  return useQuery({
    queryKey: alertasKeys.list(),
    queryFn: async () => {
      const [listRes, condoRes] = await Promise.all([
        EcondomizaApi.listAlerts({ page: 1, pageSize: 100 }),
        EcondomizaApi.getMyCondominio(),
      ]);
      const condo = condoRes.data as { nome?: string; name?: string };
      const nome = String(condo?.nome ?? condo?.name ?? 'Condomínio');
      const items = normalizeListPayload(listRes.data) as Record<string, unknown>[];
      return mapAlertRows(items, nome);
    },
  });
}
