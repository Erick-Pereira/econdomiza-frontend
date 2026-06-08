import React from 'react';
import { User } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SkeletonLoading } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useMyCondominio } from '../features/configuracoes/hooks/useConfiguracoesAccount';
import { TENANT_ROLE_LABELS, isTenantRole } from '../domain/auth-roles';
import { formatDatePtBr } from '../lib/format-date-pt-br';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-muted/40 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 text-sm font-medium text-text-main">{value || '—'}</p>
    </div>
  );
}

const ConfiguracoesPage: React.FC = () => {
  const { profile } = useAuth();
  const { condominioNome, isLoading } = useMyCondominio(profile?.tenantId);

  const roleLabel =
    profile?.role && isTenantRole(profile.role) ? TENANT_ROLE_LABELS[profile.role] : (profile?.role ?? '—');

  if (!profile) {
    return (
      <div className="space-y-4" aria-busy="true">
        <SkeletonLoading size="lg" className="w-48 rounded-lg" />
        <SkeletonLoading size="md" className="w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="page w-full max-w-full min-w-0 overflow-x-hidden space-y-8" id="configuracoes-page">
      <PageHeader
        eyebrow="Conta"
        title="Meu perfil"
        description="Dados da sessão atual — leitura via identity-service (sem edição nesta versão)."
        layout="stack"
      />

      <section className="rounded-xl border border-surface-border bg-surface-card p-6 shadow-macro-sm">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
            <User className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-main">{profile.name || profile.email}</h2>
            <p className="text-sm text-text-muted">{roleLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="E-mail" value={profile.email} />
          <Field label="Perfil" value={roleLabel} />
          <Field label="Condomínio" value={isLoading ? 'A carregar…' : (condominioNome ?? '—')} />
          <Field label="Membro desde" value={formatDatePtBr(profile.createdAt, '—')} />
        </div>

        <p className="mt-6 text-xs text-text-muted">
          Alterações de perfil ou papel devem ser feitas pelo administrador do condomínio ou suporte da
          plataforma.
        </p>
      </section>
    </div>
  );
};

export default ConfiguracoesPage;
