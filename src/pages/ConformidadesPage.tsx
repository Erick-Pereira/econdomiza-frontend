import React, { useEffect, useState } from 'react';
import { useAuthSession } from '../context/AuthSessionContext';
import { normalizeListPayload } from '../lib/api-normalize';
import { formatApiError } from '../lib/api-error-message';
import { EcondomizaApi } from '../services/api';

interface ConformityItem {
  id: string;
  type: string;
  description: string;
  status: 'completed' | 'pending' | 'overdue';
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
}

function strField(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && v !== '') return String(v);
  }
  return '';
}

function mapConformityRow(raw: unknown): ConformityItem | null {
  if (raw == null || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  const id = strField(c, 'id', 'Id');
  if (!id) return null;

  const now = new Date();
  const dueRaw = c.dueDate ?? c.DueDate;
  const doneRaw = c.completedAt ?? c.CompletedAt;
  const dueDate = dueRaw != null && String(dueRaw) !== '' ? String(dueRaw) : null;
  const completedAt = doneRaw != null && String(doneRaw) !== '' ? String(doneRaw) : null;

  const due = dueDate ? new Date(dueDate) : null;
  const completed = completedAt ? new Date(completedAt) : null;

  let status: 'completed' | 'pending' | 'overdue' = 'pending';
  if (completed && !Number.isNaN(completed.getTime())) {
    status = 'completed';
  } else if (due && !Number.isNaN(due.getTime()) && due < now) {
    status = 'overdue';
  }

  return {
    id,
    type: strField(c, 'type', 'Type') || '—',
    description: strField(c, 'description', 'Description') || '—',
    status,
    dueDate,
    completedAt,
    notes: c.notes != null || c.Notes != null ? String(c.notes ?? c.Notes) : null,
  };
}

/** Resolve o id do condomínio para chamadas à API (tenant do JWT = id do condomínio no identity). */
async function resolveCondominioId(sessionTenantId: string): Promise<string> {
  const tid = sessionTenantId?.trim();
  if (tid) return tid;
  const condominioResult = await EcondomizaApi.getMyCondominio();
  const raw = condominioResult.data as Record<string, unknown> | undefined;
  if (raw && typeof raw === 'object') {
    const id = strField(raw, 'id', 'Id');
    if (id) return id;
  }
  throw new Error('Condomínio inválido: sem tenantId na sessão e sem id no perfil do condomínio.');
}

const ConformidadesPage: React.FC = () => {
  const { profile } = useAuthSession();
  const [conformities, setConformities] = useState<ConformityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const tenantId = profile?.tenantId?.trim();
        if (!tenantId) {
          setError('Sessão sem condomínio (tenantId).');
          setConformities([]);
          return;
        }

        const condominioId = await resolveCondominioId(tenantId);
        const result = await EcondomizaApi.listConformities(condominioId);
        if (cancelled) return;

        const conformitiesData = normalizeListPayload(result.data);
        const mapped: ConformityItem[] = [];
        for (const row of conformitiesData) {
          const item = mapConformityRow(row);
          if (item) mapped.push(item);
        }

        setConformities(mapped);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to fetch conformities data:', err);
        setError(formatApiError(err));
        setConformities([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [profile?.tenantId]);

  const formatDatePt = (iso: string | null): string => {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  if (loading) {
    return (
      <div className="conformidades-loading">
        <p>A carregar conformidades…</p>
      </div>
    );
  }

  if (error && conformities.length === 0) {
    return (
      <div className="conformidades-error">
        <p>{error}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="page" id="conformidades-page">
      <div className="page-header">
        <h1>Conformidades</h1>
        <p>Checklist de conformidades legais e regulatórias</p>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, color: 'crimson' }}>
          {error}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>Conformidades do Condomínio</h2>
        </div>
        <div className="conformities-list">
          {conformities.length > 0 ? (
            conformities.map((conformity) => (
              <div key={conformity.id} className={`conformity-item ${conformity.status}`}>
                <div className="conformity-checkbox">
                  {conformity.status === 'completed' ? (
                    <i className="fas fa-check"></i>
                  ) : conformity.status === 'overdue' ? (
                    <i className="fas fa-exclamation-triangle"></i>
                  ) : (
                    <i className="fas fa-clock"></i>
                  )}
                </div>
                <div className="conformity-content">
                  <h4>{conformity.type}</h4>
                  <p>{conformity.description}</p>
                </div>
                <div className="conformity-date">
                  {conformity.status === 'completed'
                    ? `Concluído em ${formatDatePt(conformity.completedAt)}`
                    : conformity.status === 'overdue'
                      ? `Vencido em ${formatDatePt(conformity.dueDate)}`
                      : `Vence em ${formatDatePt(conformity.dueDate)}`}
                </div>
              </div>
            ))
          ) : (
            <p className="empty-state">Nenhuma conformidade encontrada.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConformidadesPage;
