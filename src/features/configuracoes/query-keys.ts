export const configuracoesKeys = {
  all: ['configuracoes'] as const,
  condominio: (tenantId: string) => [...configuracoesKeys.all, 'condominio', tenantId] as const,
};
