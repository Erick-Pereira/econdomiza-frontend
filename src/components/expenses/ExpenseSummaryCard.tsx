// Simcag.Econdomiza.Frontend/Components/Expenses/ExpenseSummaryCard.tsx
import React from 'react';
import { Card, Badge } from '../../components/ui';

interface ExpenseSummaryCardProps {
  desc: string;
  supplier?: string;
  supplierId?: string;
  processingCode: string;
  approvalCode: string;
  settlementCode: string;
  confidence: number | null;
  lowConfidence: boolean;
  issueDate: string;
  retryCount: number;
  documentReference: string;
  legacyStatus: string;
  totalAmount?: number | null;
  totalPaid?: number | null;
  outstandingBalance?: number | null;
}

const formatCurrency = (value: number | null | undefined) => {
  const n = value ?? 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const ExpenseSummaryCard: React.FC<ExpenseSummaryCardProps> = ({
  desc,
  supplier,
  supplierId,
  processingCode,
  approvalCode,
  settlementCode,
  confidence,
  lowConfidence,
  issueDate,
  retryCount,
  documentReference,
  legacyStatus,
  totalAmount = 0,
  totalPaid = 0,
  outstandingBalance = 0,
}) => {
  const getProcessingBadgeVariant = (code: string): 'error' | 'warning' | 'ok' | 'neutral' => {
    if (code === 'Failed') return 'error';
    if (code === 'PartiallyCompleted') return 'warning';
    return 'ok';
  };

  const getApprovalBadgeVariant = (code: string): 'error' | 'warning' | 'ok' | 'neutral' => {
    if (code === 'Pending' || code === 'Rejected') return 'warning';
    return 'ok';
  };

  const getSettlementBadgeVariant = (code: string): 'error' | 'warning' | 'ok' | 'neutral' => {
    if (code === 'Pending') return 'warning';
    return 'ok';
  };

  return (
    <Card padding="lg">
      {/* Title and main info */}
      <h2 className="text-xl sm:text-2xl font-bold text-text-main">{desc || 'Despesa'}</h2>

      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
        {supplier && (
          <span className="text-text-muted">
            Fornecedor: <strong>{supplier}</strong>
          </span>
        )}
        {!supplier && supplierId && (
          <span className="text-text-muted">
            Fornecedor ID: <code>{supplierId}</code>
          </span>
        )}
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <Badge variant={getProcessingBadgeVariant(processingCode)}>Processing: {processingCode}</Badge>
        <Badge variant={getApprovalBadgeVariant(approvalCode)}>Approval: {approvalCode}</Badge>
        <Badge variant={getSettlementBadgeVariant(settlementCode)}>Settlement: {settlementCode}</Badge>
      </div>

      {/* AI Confidence */}
      {confidence !== null && (
        <div className="flex items-center gap-2 mt-3">
          <Badge variant={lowConfidence ? 'warning' : 'neutral'}>
            Confidence: {(confidence * 100).toFixed(0)}%{lowConfidence && ' - Baixa confiança'}
          </Badge>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 pt-6 border-t border-surface-border">
        <Card padding="none" hoverEffect={false}>
          <div className="flex items-center justify-between p-3 sm:p-4">
            <span className="text-xs sm:text-sm text-text-muted">Total</span>
            <span className="text-sm sm:text-base font-bold text-brand-primary">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </Card>
        <Card padding="none" hoverEffect={false}>
          <div className="flex items-center justify-between p-3 sm:p-4">
            <span className="text-xs sm:text-sm text-text-muted">Pago</span>
            <span className="text-sm sm:text-base font-bold text-green-600">{formatCurrency(totalPaid)}</span>
          </div>
        </Card>
        <Card padding="none" hoverEffect={false}>
          <div className="flex items-center justify-between p-3 sm:p-4">
            <span className="text-xs sm:text-sm text-text-muted">Em aberto</span>
            <span className="text-sm sm:text-base font-bold text-yellow-600">
              {formatCurrency(outstandingBalance)}
            </span>
          </div>
        </Card>
      </div>

      {/* Additional details in grid */}
      <div className="mt-4 pt-4 border-t border-surface-border text-xs sm:text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Emissão</p>
            <p className="font-medium text-sm">
              {issueDate ? new Date(issueDate).toLocaleDateString('pt-BR') : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Retries</p>
            <p className="font-medium text-sm">{retryCount}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Documento</p>
            <p className="font-medium text-sm truncate min-w-0" title={documentReference}>
              {documentReference || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Status legado</p>
            <p className="font-medium text-sm">{legacyStatus || '—'}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ExpenseSummaryCard;
