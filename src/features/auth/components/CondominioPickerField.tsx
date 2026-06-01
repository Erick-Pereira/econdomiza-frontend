import { useCallback, useState } from 'react';
import { CondominioLookupModal } from '../../../components/auth/CondominioLookupModal';
import type { CondoRow } from '../../../lib/condominio-lookup';

export type CondominioPickerFieldProps = {
  id?: string;
  label?: string;
  summaryLabel: string | null;
  error?: string;
  helpText?: string;
  selectedId?: string;
  onSelect: (row: CondoRow) => void;
};

/** Seleção de condomínio por busca — sem exposição de identificadores técnicos. */
export function CondominioPickerField({
  id = 'condo-summary-display',
  label = 'Condomínio',
  summaryLabel,
  error,
  helpText,
  selectedId,
  onSelect,
}: CondominioPickerFieldProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleConfirm = useCallback(
    (row: CondoRow) => {
      onSelect(row);
      setModalOpen(false);
    },
    [onSelect]
  );

  return (
    <>
      <div className="form-group">
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
        <div className="condo-chosen-row">
          <span
            id={id}
            className={`condo-summary${!summaryLabel ? ' condo-summary--empty' : ''}`}
            aria-live="polite"
          >
            {summaryLabel ?? 'Nenhum condomínio selecionado'}
          </span>
          <button
            type="button"
            className="btn-lookup"
            onClick={() => setModalOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={modalOpen}
          >
            Buscar
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        {helpText && (
          <p className="form-help" style={{ marginTop: '0.35rem' }}>
            {helpText}
          </p>
        )}
      </div>

      {modalOpen && (
        <CondominioLookupModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={handleConfirm}
          currentTenantId={selectedId}
        />
      )}
    </>
  );
}
