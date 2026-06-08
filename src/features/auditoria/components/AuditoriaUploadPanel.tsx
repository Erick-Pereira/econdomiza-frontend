import { useCallback, useRef, useState } from 'react';
import { CloudUpload, FileText, Loader2 } from 'lucide-react';
import { Button, FormError, FormSuccessMessage } from '../../../components/ui';
import { cn } from '../../../lib/cn';

const ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.xls,application/pdf,image/*,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

interface AuditoriaUploadPanelProps {
  disabled?: boolean;
  isUploading: boolean;
  uploadError: string | null;
  uploadWarning?: string | null;
  uploadSuccessMessage?: string | null;
  onUpload: (file: File) => Promise<unknown>;
}

export function AuditoriaUploadPanel({
  disabled = false,
  isUploading,
  uploadError,
  uploadWarning = null,
  uploadSuccessMessage = null,
  onUpload,
}: AuditoriaUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file || disabled || isUploading) return;
      try {
        await onUpload(file);
      } catch {
        /* erro propagado via uploadError */
      }
    },
    [disabled, isUploading, onUpload]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    void handleFile(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    void handleFile(file);
  };

  return (
    <section
      className="rounded-xl border border-surface-border bg-surface-card shadow-macro-sm"
      aria-labelledby="auditoria-upload-heading"
    >
      <header className="border-b border-surface-border px-5 py-4">
        <h2 id="auditoria-upload-heading" className="text-base font-semibold text-text-main">
          Enviar documento
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Notas fiscais, recibos ou planilhas para ingestão e auditoria automática.
        </p>
      </header>

      <div className="p-5">
        <div
          className={cn(
            'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
            dragOver
              ? 'border-brand-primary bg-brand-primary/5'
              : 'border-surface-border bg-surface-muted/50',
            disabled && 'opacity-60 pointer-events-none'
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            disabled={disabled || isUploading}
            onChange={onInputChange}
            aria-label="Selecionar arquivo para upload"
          />

          {isUploading ? (
            <Loader2 className="mb-3 h-10 w-10 animate-spin text-brand-primary" aria-hidden />
          ) : (
            <CloudUpload className="mb-3 h-10 w-10 text-brand-primary" aria-hidden />
          )}

          <p className="text-sm font-medium text-text-main">
            {isUploading ? 'A enviar arquivo…' : 'Arraste um arquivo ou selecione do computador'}
          </p>
          <p className="mt-1 text-xs text-text-muted">PDF, imagens ou planilhas (CSV/XLSX)</p>

          <Button
            type="button"
            variant="primary"
            size="md"
            className="mt-4"
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
            icon={<FileText className="h-4 w-4" aria-hidden />}
          >
            Escolher arquivo
          </Button>
        </div>

        {uploadSuccessMessage && (
          <FormSuccessMessage className="mt-4">{uploadSuccessMessage}</FormSuccessMessage>
        )}
        {uploadWarning && (
          <div
            className="mt-4 rounded-lg border border-status-warning/40 bg-status-warning/10 px-4 py-3 text-sm text-text-main"
            role="alert"
          >
            <strong className="font-medium">Atenção — pipeline incompleto:</strong> {uploadWarning}
          </div>
        )}
        {uploadError && <FormError className="mt-4">{uploadError}</FormError>}
      </div>
    </section>
  );
}
