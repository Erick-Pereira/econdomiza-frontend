import React from 'react';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { PageFatalErrorState } from '../components/layout/PageLoadStates';
import { Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { AuditoriaExpensesList } from '../features/auditoria/components/AuditoriaExpensesList';
import { AuditoriaPageSkeleton } from '../features/auditoria/components/AuditoriaPageSkeleton';
import { AuditoriaStatsGrid } from '../features/auditoria/components/AuditoriaStatsGrid';
import { AuditoriaUploadPanel } from '../features/auditoria/components/AuditoriaUploadPanel';
import { useAuditoriaData } from '../features/auditoria/hooks/useAuditoriaData';
import { roleAllowsAuditDocumentUpload } from '../features/auditoria';
import { cn } from '../lib/cn';

const AuditoriaPage: React.FC = () => {
  const { profile } = useAuth();
  const canUpload = roleAllowsAuditDocumentUpload(profile?.role);

  const {
    expenses,
    stats,
    fetchError,
    uploadError,
    uploadWarning,
    uploadSuccessMessage,
    isInitialLoading,
    isFetching,
    isUploading,
    refetch,
    uploadFile,
  } = useAuditoriaData();

  if (isInitialLoading) {
    return <AuditoriaPageSkeleton />;
  }

  if (fetchError && expenses.length === 0) {
    return <PageFatalErrorState id="auditoria-page" message={fetchError} onRetry={() => void refetch()} />;
  }

  return (
    <div className="page w-full max-w-full min-w-0 overflow-x-hidden space-y-8" id="auditoria-page">
      <PageHeader
        eyebrow="Fiscalização"
        title={canUpload ? 'Auditoria de despesas' : 'Relatório de auditoria'}
        description={
          canUpload
            ? 'Envie documentos, acompanhe o processamento e consulte despesas normalizadas.'
            : 'Consulta de despesas processadas e trilha de auditoria — somente leitura.'
        }
        toolbar={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
            icon={<RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} aria-hidden />}
          >
            {isFetching ? 'A atualizar…' : 'Atualizar'}
          </Button>
        }
      />

      {fetchError && expenses.length > 0 && (
        <div
          className="rounded-xl border border-status-warning/30 bg-status-warning/10 px-4 py-3 text-sm text-text-main"
          role="status"
        >
          Alguns dados podem estar desatualizados: {fetchError}
        </div>
      )}

      <AuditoriaStatsGrid stats={stats} />

      {canUpload ? (
        <AuditoriaUploadPanel
          isUploading={isUploading}
          uploadError={uploadError}
          uploadWarning={uploadWarning}
          uploadSuccessMessage={uploadSuccessMessage}
          onUpload={uploadFile}
        />
      ) : (
        <div className="rounded-xl border border-surface-border bg-surface-muted/50 px-5 py-4 text-sm text-text-muted">
          O upload de documentos é restrito ao perfil{' '}
          <strong className="text-text-main">Administradora</strong>. Para enviar notas ou planilhas, contacte
          a administradora do condomínio.
        </div>
      )}

      <AuditoriaExpensesList expenses={expenses} fetchError={fetchError} readOnly={!canUpload} />
    </div>
  );
};

export default AuditoriaPage;
