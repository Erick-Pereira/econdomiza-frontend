import React from 'react';
import { Bell, User } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SkeletonLoading } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useMyCondominio } from '../features/configuracoes/hooks/useConfiguracoesAccount';
import { TENANT_ROLE_LABELS, isTenantRole } from '../domain/auth-roles';
import { formatDatePtBr } from '../lib/format-date-pt-br';
import { canConfigureNotificationPreferences } from '../lib/permissions/rbac';
import NotificationsPreferencesPanel from './notifications/NotificationsPreferencesPanel';

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="config-profile-field">
      <p className="config-profile-field__label">{label}</p>
      <p className="config-profile-field__value">{value || '—'}</p>
    </div>
  );
}

const ConfiguracoesPage: React.FC = () => {
  const { profile } = useAuth();
  const { condominioNome, isLoading } = useMyCondominio(profile?.tenantId);
  const showNotificationPrefs = canConfigureNotificationPreferences(profile?.role);
  const userId = profile?.id?.trim() ?? '';

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
        title="Configurações"
        description="Perfil da sessão e preferências de notificação para alertas de preço."
        layout="stack"
      />

      <section className="config-section" aria-labelledby="config-perfil-heading">
        <div className="config-section__head">
          <div className="config-section__avatar" aria-hidden>
            <User className="config-section__avatar-icon" />
          </div>
          <div>
            <h2 id="config-perfil-heading" className="config-section__title">
              {profile.name || profile.email}
            </h2>
            <p className="config-section__subtitle">{roleLabel}</p>
          </div>
        </div>

        <div className="config-profile-grid">
          <ProfileField label="E-mail" value={profile.email} />
          <ProfileField label="Perfil" value={roleLabel} />
          <ProfileField label="Condomínio" value={isLoading ? 'A carregar…' : (condominioNome ?? '—')} />
          <ProfileField label="Membro desde" value={formatDatePtBr(profile.createdAt, '—')} />
        </div>

        <p className="config-section__footnote">
          Alterações de perfil ou papel devem ser feitas pelo administrador do condomínio ou suporte da
          plataforma.
        </p>
      </section>

      {showNotificationPrefs && (
        <section className="config-section" aria-labelledby="config-notificacoes-heading">
          <div className="config-section__head config-section__head--split">
            <div className="config-section__head-main">
              <div className="config-section__icon" aria-hidden>
                <Bell className="config-section__icon-svg" />
              </div>
              <div>
                <h2 id="config-notificacoes-heading" className="config-section__title">
                  Notificações
                </h2>
                <p className="config-section__lead">
                  Escolha como receber alertas de preço. O sistema só envia após guardar com pelo menos um
                  canal activo.
                </p>
              </div>
            </div>
            <span className="op-badge op-badge--neutral">Obrigatório para alertas</span>
          </div>

          <NotificationsPreferencesPanel userId={userId} profileEmail={profile.email} embedded />
        </section>
      )}
    </div>
  );
};

export default ConfiguracoesPage;
