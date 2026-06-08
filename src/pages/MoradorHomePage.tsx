import type { FC } from 'react';
import { ClipboardCheck, FileText, User, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/layout/PageHeader';
import { cn } from '../lib/cn';

const shortcuts = [
  {
    to: '/auditoria',
    icon: FileText,
    label: 'Relatório auditoria',
    desc: 'Despesas processadas e documentos',
    tone: 'bg-status-info/10 text-status-info',
  },
  {
    to: '/conformidades',
    icon: ClipboardCheck,
    label: 'Obrigações',
    desc: 'Vistorias, licenças e AVCB',
    tone: 'bg-brand-primary/10 text-brand-primary',
  },
  {
    to: '/configuracoes',
    icon: User,
    label: 'Minha conta',
    desc: 'Dados do perfil',
    tone: 'bg-status-success/10 text-status-success',
  },
] as const;

const MoradorHomePage: FC = () => {
  const { profile } = useAuth();
  const firstName = (profile?.name || profile?.email || 'Morador').split(' ')[0];

  return (
    <div className="page w-full max-w-full min-w-0 overflow-x-hidden space-y-8" id="morador-home-page">
      <PageHeader
        eyebrow="Bem-vindo"
        title={`Olá, ${firstName}`}
        description="Consulta de relatório de auditoria, obrigações e conta — sem perfil de fiscalização."
        layout="stack"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {shortcuts.map(({ to, icon: Icon, label, desc, tone }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col rounded-xl border border-surface-border bg-surface-card p-5 shadow-macro-sm transition-shadow hover:border-brand-primary/25 hover:shadow-macro-md"
          >
            <div className={cn('mb-4 flex h-11 w-11 items-center justify-center rounded-xl', tone)}>
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <p className="font-semibold text-text-main">{label}</p>
            <p className="mt-1 flex-1 text-sm text-text-muted">{desc}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-primary group-hover:text-brand-secondary">
              Abrir
              <ChevronRight className="h-4 w-4" aria-hidden />
            </span>
          </Link>
        ))}
      </div>

      <section className="rounded-xl border border-surface-border bg-surface-card p-6 shadow-macro-sm">
        <h2 className="text-base font-semibold text-text-main">Acesso do morador</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Como <strong className="text-text-main">Morador</strong>, você tem acesso de consulta às informações
          publicadas pelo condomínio: despesas auditadas, obrigações legais e seus dados de conta.
        </p>
        <p className="mt-4 text-sm text-text-muted">
          Para upload de documentos ou fiscalização completa, contacte o Síndico ou a administradora.
        </p>
      </section>
    </div>
  );
};

export default MoradorHomePage;
