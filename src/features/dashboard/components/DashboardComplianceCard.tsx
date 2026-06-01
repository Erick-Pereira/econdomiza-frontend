import { Link } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { Button } from '../../../components/ui';

export function DashboardComplianceCard() {
  return (
    <section
      className="flex h-full flex-col rounded-xl border border-surface-border bg-surface-card shadow-macro-sm"
      aria-labelledby="dashboard-compliance-heading"
    >
      <header className="flex items-center gap-2 border-b border-surface-border px-5 py-4">
        <ClipboardCheck className="h-4 w-4 text-brand-primary" aria-hidden />
        <h2 id="dashboard-compliance-heading" className="text-base font-semibold text-text-main">
          Obrigações e vistorias
        </h2>
      </header>

      <div className="flex flex-1 flex-col justify-between gap-6 p-5">
        <p className="text-sm leading-relaxed text-text-muted">
          Vencimentos de AVCB, elevadores, licenças e outras obrigações legais — num só sítio, com checklist e
          calendário de conformidade.
        </p>
        <Link to="/conformidades" className="inline-flex w-full sm:w-auto">
          <Button variant="outline" size="md" fullWidth className="sm:w-auto">
            Abrir obrigações
          </Button>
        </Link>
      </div>
    </section>
  );
}
