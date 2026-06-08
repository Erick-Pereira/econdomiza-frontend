import { useCallback, useEffect, useId, useState } from 'react';
import { Building2, X } from 'lucide-react';
import type { CondoRow } from '../../lib/condominio-lookup';
import { filterCondoList, parseLookupData } from '../../lib/condominio-lookup';
import { formatApiError } from '../../lib/api-error-message';
import { EcondomizaApi } from '../../services';
import { Button, EmptyState, Input, LoadingSpinner } from '../ui';
import { cn, focusRingClass, transitionInteractiveClass } from '../../lib/cn';

export type CondominioLookupModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (row: CondoRow) => void;
  currentTenantId?: string;
};

export function CondominioLookupModal({
  open,
  onClose,
  onConfirm,
  currentTenantId,
}: CondominioLookupModalProps) {
  const titleId = useId();
  const searchInputId = 'condo-lookup-search-input';
  const [searchTerm, setSearchTerm] = useState('');
  const [allRows, setAllRows] = useState<CondoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(currentTenantId);

  const loadAllCondominios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[CondominioLookupModal] Carregando todos os condomínios...');
      const res = await EcondomizaApi.lookupCondominios('');
      console.log('[CondominioLookupModal] Resposta de carregamento:', JSON.stringify(res.data, null, 2));

      const parsed = parseLookupData(res.data);
      console.debug('[CondominioLookupModal] Condomínios carregados:', parsed.length, 'resultados');
      setAllRows(parsed);
    } catch (err) {
      console.error('[CondominioLookupModal] Erro ao carregar condomínios:', err);
      setError(formatApiError(err));
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setSelectedId(currentTenantId);
      setSearchTerm('');
      setError(null);
      // Carregar todos os condomínios ao abrir o modal
      loadAllCondominios();
      const t = window.setTimeout(() => document.getElementById(searchInputId)?.focus(), 50);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [open, currentTenantId, loadAllCondominios]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const runSearch = useCallback(async () => {
    console.log('[CondominioLookupModal] runSearch chamada, searchTerm:', searchTerm);
    const term = searchTerm.trim();
    if (term.length < 2) {
      console.log('[CondominioLookupModal] Termo muito curto:', term.length);
      setError('Digite pelo menos 2 caracteres para buscar.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      console.log('[CondominioLookupModal] Chamando API com termo:', term);
      const res = await EcondomizaApi.lookupCondominios(term);
      console.log('[CondominioLookupModal] Resposta da API completa:', JSON.stringify(res, null, 2));
      console.log('[CondominioLookupModal] res.data:', JSON.stringify(res.data, null, 2));

      const parsed = parseLookupData(res.data);
      console.log('[CondominioLookupModal] Dados processados:', parsed.length, 'resultados');
      setAllRows(parsed);
    } catch (err) {
      console.error('[CondominioLookupModal] Erro na busca de condomínios:', err);
      setError(formatApiError(err));
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  const visibleRows = filterCondoList(allRows, searchTerm);

  const handleConfirm = () => {
    const row = allRows.find((r) => r.id === selectedId);
    if (!row) {
      setError('Selecione um condomínio na lista.');
      return;
    }
    onConfirm(row);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="condo-modal" role="presentation">
      <button type="button" className="condo-modal__backdrop" aria-label="Fechar" onClick={onClose} />
      <div className="condo-modal__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="condo-modal__head">
          <h2 id={titleId}>Buscar condomínio</h2>
          <button
            type="button"
            className={cn('condo-modal__icon-btn', focusRingClass, transitionInteractiveClass)}
            onClick={onClose}
            aria-label="Fechar diálogo"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <p className="condo-modal__lead">Pesquise por nome ou CNPJ do condomínio.</p>

        <div className="condo-modal__body">
          <div className="condo-modal__search-row">
            <Input
              id={searchInputId}
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nome ou CNPJ…"
              aria-label="Termo de busca"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void runSearch();
                }
              }}
            />
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                console.log('[CondominioLookupModal] Botão de busca clicado, searchTerm:', searchTerm);
                void runSearch();
              }}
              disabled={loading}
            >
              {loading ? '…' : 'Buscar'}
            </Button>
          </div>

          {error && (
            <p className="condo-modal__status auth-screen-error" role="alert">
              {error}
            </p>
          )}

          <div className="condo-modal__results" aria-live="polite">
            {loading ? (
              <LoadingSpinner message="A pesquisar condomínios…" />
            ) : visibleRows.length > 0 ? (
              <ul className="condo-modal__list">
                {visibleRows.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={cn(
                        'condo-modal__list-item',
                        selectedId === row.id && 'condo-modal__list-item--selected',
                        focusRingClass,
                        transitionInteractiveClass
                      )}
                      onClick={() => setSelectedId(row.id)}
                      aria-pressed={selectedId === row.id}
                    >
                      <Building2 size={18} className="condo-modal__list-icon" aria-hidden />
                      <span className="condo-modal__list-text">
                        <span className="condo-modal__list-title">{row.nome}</span>
                        <span className="condo-modal__list-meta">{row.cnpj || row.id}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="Nenhum resultado"
                description="Faça uma busca ou refine o termo."
                icon={<Building2 className="h-12 w-12 text-slate-400" />}
              />
            )}
          </div>
        </div>

        <div className="condo-modal__actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={handleConfirm} disabled={!selectedId}>
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CondominioLookupModal;
