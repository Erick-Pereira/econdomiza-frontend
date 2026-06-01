import { Link } from 'react-router-dom';
import { Check, ChevronRight, X } from 'lucide-react';
import type { AuditoriaExpenseRow } from '../../auditoria/lib/expense-map';
import {
  approvalBadgeVariant,
  approvalStatusLabel,
  processingBadgeVariant,
  processingStatusLabel,
} from '../../auditoria/lib/expense-map';
import { Badge, Button } from '../../../components/ui';
import { cn } from '../../../lib/cn';

type ComprasExpenseListItemProps = {
  expense: AuditoriaExpenseRow;
  canApprove: boolean;
  approvalPending: boolean;
  onApprove: (id: string, approve: boolean) => void;
  formatMoney: (n: number) => string;
};

export function ComprasExpenseListItem({
  expense,
  canApprove,
  approvalPending,
  onApprove,
  formatMoney,
}: ComprasExpenseListItemProps) {
  const detailPath = `/compras/${encodeURIComponent(expense.id)}`;
  const showApproval = canApprove && expense.approvalStatus.toLowerCase().includes('pending');

  return (
    <li className="group relative">
      <Link
        to={detailPath}
        className={cn(
          'flex flex-col gap-4 px-5 py-4 transition-all duration-200 ease-out',
          'hover:bg-[var(--state-hover)] focus-visible:bg-[var(--state-hover)] focus-visible:outline-none',
          'lg:flex-row lg:items-center',
          showApproval && 'lg:pr-52'
        )}
        aria-label={`Abrir despesa: ${expense.description}`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className="font-medium text-brand-primary group-hover:text-brand-secondary transition-colors">
              {expense.description}
            </p>
            <ChevronRight
              className="mt-0.5 h-4 w-4 shrink-0 text-text-muted opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
              aria-hidden
            />
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {expense.supplierName || 'Sem fornecedor'} · {expense.issueDateLabel}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant={processingBadgeVariant(expense.processingStatus)}>
              {processingStatusLabel(expense.processingStatus)}
            </Badge>
            <Badge variant={approvalBadgeVariant(expense.approvalStatus)}>
              {approvalStatusLabel(expense.approvalStatus)}
            </Badge>
          </div>
        </div>
        <p className="text-lg font-semibold tabular-nums text-text-main lg:text-right">
          {formatMoney(expense.totalAmount)}
        </p>
      </Link>

      {showApproval && (
        <div
          className="flex shrink-0 gap-2 px-5 pb-4 lg:absolute lg:right-5 lg:top-1/2 lg:-translate-y-1/2 lg:px-0 lg:pb-0"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Button
            type="button"
            size="sm"
            variant="primary"
            disabled={approvalPending}
            onClick={() => onApprove(expense.id, true)}
            icon={<Check className="h-4 w-4" aria-hidden />}
          >
            Aprovar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={approvalPending}
            onClick={() => onApprove(expense.id, false)}
            icon={<X className="h-4 w-4" aria-hidden />}
          >
            Reprovar
          </Button>
        </div>
      )}
    </li>
  );
}
