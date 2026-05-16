import React, { useEffect, useState } from 'react';
import { useAuthSession } from '../context/AuthSessionContext';
import { EcondomizaApi } from '../services';
import { PageHeader } from '../components/layout/PageHeader';

function AccountField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="account-field-label">{label}</div>
      <div className="account-field-value">{value || '—'}</div>
    </div>
  );
}

const ConfiguracoesPage: React.FC = () => {
  const { profile } = useAuthSession();
  const [condominioNome, setCondominioNome] = useState<string | null>(null);
  const [condominioCarregado, setCondominioCarregado] = useState(false);

  const profileName = String(profile?.name ?? profile?.email ?? 'Usuário');
  const profileEmail = String(profile?.email ?? '—');
  const profileRole = String(profile?.role ?? '—');
  const profileTenant = String(profile?.tenantId ?? '').trim();

  useEffect(() => {
    if (!profileTenant) {
      setCondominioNome(null);
      setCondominioCarregado(true);
      return;
    }
    let cancel = false;
    void (async () => {
      try {
        const res = await EcondomizaApi.getMyCondominio();
        if (cancel) return;
        const d = res.data as Record<string, unknown>;
        const nome = String(d?.nome ?? d?.name ?? '').trim();
        setCondominioNome(nome || null);
      } catch {
        if (!cancel) setCondominioNome(null);
      } finally {
        if (!cancel) setCondominioCarregado(true);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [profileTenant]);

  const condominioApresentacao = !profileTenant
    ? '—'
    : !condominioCarregado
      ? 'Carregando…'
      : condominioNome && condominioNome.length > 0
        ? condominioNome
        : 'Nome do condomínio indisponível';

  return (
    <div className="page" id="configuracoes-page">
      <PageHeader
        title="Conta"
        description="Veja os dados do seu perfil e do condomínio vinculado. Para alterar nome, e-mail ou permissões, entre em contato com o administrador do sistema."
        layout="stack"
      />

      {!profile && <div className="banner banner--error">Não foi possível carregar os dados da conta.</div>}

      {profile && (
        <div className="card">
          <div className="card-header">
            <h2>Seus dados</h2>
            <span className="tag-readonly">Somente leitura</span>
          </div>
          <div className="account-summary-grid">
            <AccountField label="Nome" value={profileName} />
            <AccountField label="E-mail" value={profileEmail} />
            <AccountField label="Papel" value={profileRole} />
            <AccountField label="Condomínio" value={condominioApresentacao} />
          </div>
          {profileTenant && condominioCarregado && (
            <details className="config-support-ref" style={{ marginTop: 'var(--spacing-md)' }}>
              <summary className="form-help" style={{ cursor: 'pointer', fontWeight: 600 }}>
                Código do condomínio (suporte)
              </summary>
              <p className="form-help" style={{ marginTop: 8, marginBottom: 0 }}>
                Envie este código apenas se o suporte solicitar:
              </p>
              <code className="insights-mono" style={{ fontSize: '0.8rem', wordBreak: 'break-all', display: 'block', marginTop: 8 }}>
                {profileTenant}
              </code>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

export default ConfiguracoesPage;
