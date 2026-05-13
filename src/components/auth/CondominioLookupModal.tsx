import React, { useEffect, useMemo, useState } from 'react';
import { filterCondoList, type CondoRow, parseLookupData } from '../../lib/condominio-lookup';
import { formatApiError } from '../../lib/api-error-message';
import { EcondomizaApi } from '../../services/api';

export interface CondominioLookupModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (row: CondoRow) => void;
  currentTenantId?: string;
}

export const CondominioLookupModal: React.FC<CondominioLookupModalProps> = ({
  open,
  onClose,
  onConfirm,
  currentTenantId,
}) => {
  const [all, setAll] = useState<CondoRow[]>([]);
  const [filterText, setFilterText] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFilterText('');
      setError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await EcondomizaApi.lookupCondominios('');
        if (cancelled) return;
        const rows = parseLookupData(res.data);
        setAll(rows);
        const cur = currentTenantId?.trim();
        if (cur && rows.some((r) => r.id === cur)) {
          setSelectedId(cur);
        } else {
          setSelectedId(null);
        }
      } catch (e: unknown) {
        if (cancelled) return;
        setError(formatApiError(e));
        setAll([]);
        setSelectedId(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, currentTenantId]);

  const visibleRows = useMemo(() => filterCondoList(all, filterText), [all, filterText]);

  const onFilterChange = (v: string) => {
    setFilterText(v);
    const next = filterCondoList(all, v);
    setSelectedId((id) => (id && next.some((r) => r.id === id) ? id : null));
  };

  const handleConfirm = () => {
    if (!selectedId) return;
    const row = all.find((r) => r.id === selectedId);
    if (row) onConfirm(row);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  const emptyMessage =
    all.length === 0 && !loading ? 'Nenhum condomínio disponível.' : 'Nenhum condomínio corresponde ao filtro.';

  return (
    <div
      className="condo-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="condo-modal-title"
      onKeyDown={handleKeyDown}
    >
      <button type="button" className="condo-modal__backdrop" aria-label="Fechar" onClick={onClose} />
      <div className="condo-modal__panel">
        <div className="condo-modal__head">
          <h3 id="condo-modal-title">Escolher condomínio</h3>
          <button type="button" className="condo-modal__icon-btn" onClick={onClose} aria-label="Fechar diálogo">
            <i className="fas fa-times" aria-hidden />
          </button>
        </div>
        <p className="condo-modal__lead">Filtre por nome, CNPJ ou parte do identificador (GUID).</p>
        <div className="condo-modal__filter">
          <i className="fas fa-filter" aria-hidden />
          <input
            type="search"
            className="form-input condo-modal__search-input"
            placeholder="Filtrar por nome ou CNPJ…"
            value={filterText}
            onChange={(e) => onFilterChange(e.target.value)}
            autoComplete="off"
            autoFocus
            aria-label="Filtrar lista de condomínios"
          />
        </div>
        <div className="condo-modal__list" role="listbox" aria-label="Condomínios">
          {loading && <p className="condo-modal__lead condo-modal__status">A carregar condomínios…</p>}
          {error && !loading && <p className="auth-screen-error condo-modal__status">{error}</p>}
          {!loading && !error && visibleRows.length === 0 && (
            <p className="condo-modal__lead condo-modal__status">{emptyMessage}</p>
          )}
          {!loading &&
            !error &&
            visibleRows.map((row) => (
              <button
                key={row.id}
                type="button"
                role="option"
                aria-selected={selectedId === row.id}
                className={`condo-modal__row${selectedId === row.id ? ' is-selected' : ''}`}
                onClick={() => setSelectedId(row.id)}
              >
                <div className="condo-modal__row-name">{row.nome || '(sem nome)'}</div>
                <div className="condo-modal__row-cnpj">{row.cnpj || '—'}</div>
              </button>
            ))}
        </div>
        <div className="condo-modal__actions">
          <button type="button" className="btn-small secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={handleConfirm} disabled={!selectedId}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};
