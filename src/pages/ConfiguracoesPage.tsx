import React, { useEffect, useState } from 'react';
import { useAuthSession } from '../context/AuthSessionContext';
import { EcondomizaApi } from '../services';
import { PageHeader } from '../components/layout/PageHeader';

function AccountField({ label, value }: { label: string; value: string }) {
  return (
    <div className="account-field-card">
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
    <>
      <style>{`
        .configuracoes-page {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          box-sizing: border-box;
        }

        .config-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 28px;
          margin-top: 24px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
        }

        .config-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .config-card-header h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
        }

        .config-card-header p {
          margin-top: 6px;
          color: #6b7280;
          font-size: 0.95rem;
        }

        .tag-readonly {
          background: #f3f4f6;
          color: #374151;
          padding: 8px 14px;
          border-radius: 999px;
          font-size: 0.85rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .account-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 18px;
        }

        .account-field-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 18px;
          transition: 0.2s ease;
        }

        .account-field-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.05);
        }

        .account-field-label {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #6b7280;
          margin-bottom: 8px;
        }

        .account-field-value {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          word-break: break-word;
        }

        .config-support-ref {
          margin-top: 28px;
          background: #f9fafb;
          border: 1px dashed #d1d5db;
          border-radius: 14px;
          padding: 16px;
        }

        .support-summary {
          cursor: pointer;
          font-weight: 600;
          color: #111827;
          list-style: none;
        }

        .support-description {
          margin-top: 12px;
          margin-bottom: 10px;
          color: #6b7280;
          font-size: 0.95rem;
        }

        .support-code {
          display: block;
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          background: #111827;
          color: #f9fafb;
          font-size: 0.85rem;
          overflow-x: auto;
          word-break: break-all;
        }

        .banner--error {
          margin-top: 20px;
          padding: 16px;
          border-radius: 14px;
          background: #fee2e2;
          color: #991b1b;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .configuracoes-page {
            padding: 16px;
          }

          .config-card {
            padding: 20px;
            border-radius: 18px;
          }

          .config-card-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .account-summary-grid {
            grid-template-columns: 1fr;
          }

          .account-field-card {
            padding: 16px;
          }

          .config-card-header h2 {
            font-size: 1.3rem;
          }

          .account-field-value {
            font-size: 0.95rem;
          }
        }

        @media (max-width: 480px) {
          .configuracoes-page {
            padding: 12px;
          }

          .config-card {
            padding: 16px;
          }

          .tag-readonly {
            width: 100%;
            text-align: center;
          }

          .support-code {
            font-size: 0.75rem;
          }
        }
      `}</style>

      <div className="page configuracoes-page" id="configuracoes-page">
        <PageHeader
          title="Conta"
          description="Veja os dados do seu perfil e do condomínio vinculado. Para alterar nome, e-mail ou permissões, entre em contato com o administrador do sistema."
          layout="stack"
        />

        {!profile && (
          <div className="banner banner--error">
            Não foi possível carregar os dados da conta.
          </div>
        )}

        {profile && (
          <div className="config-card">
            <div className="config-card-header">
              <div>
                <h2>Seus dados</h2>
                <p>Informações da sua conta</p>
              </div>

              <span className="tag-readonly">
                Somente leitura
              </span>
            </div>

            <div className="account-summary-grid">
              <AccountField label="Nome" value={profileName} />
              <AccountField label="E-mail" value={profileEmail} />
              <AccountField label="Papel" value={profileRole} />
              <AccountField label="Condomínio" value={condominioApresentacao} />
            </div>

            {profileTenant && condominioCarregado && (
              <details className="config-support-ref">
                <summary className="support-summary">
                  Código do condomínio (suporte)
                </summary>

                <p className="support-description">
                  Envie este código apenas se o suporte solicitar:
                </p>

                <code className="support-code">
                  {profileTenant}
                </code>
              </details>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ConfiguracoesPage;