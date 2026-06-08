import { useQuery } from '@tanstack/react-query';
import {
  isAlertRowResolved,
  prioridadeLabelFromSeverity,
  severityUpperFromAlertRow,
} from '../../../lib/alert-row';
import { normalizeListPayload } from '../../../lib/api-normalize';
import { pickCreatedAtIso, sortByCreatedAtDesc } from '../../../lib/sort-by-date';
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
  const rows = items.map((item) => {
    const sev = severityUpperFromAlertRow(item);
    const prio = prioridadeLabelFromSeverity(sev);
    const msg = String(item.message ?? item.title ?? item.titulo ?? '');
    const product = String(item.productName ?? item.ProductName ?? '');
    return {
      id: String(item.id ?? item.Id ?? ''),
      tipo: String(item.type ?? item.tipo ?? item.Type ?? 'alerta'),
      condominioNome,
      titulo: product ? `${product} — ${msg}` : msg,
      categoria: String(item.alertCategory ?? item.category ?? item.categoria ?? item.Category ?? '—'),
      prioridade: prio,
      status: isAlertRowResolved(item) ? 'resolvido' : 'aberto',
      createdAt: pickCreatedAtIso(item),
      updatedAt: String(item.updatedAt ?? item.UpdatedAt ?? pickCreatedAtIso(item)),
    };
  });
  return sortByCreatedAtDesc(rows);
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
