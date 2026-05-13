/** GUID de tenant (condomínio) esperado pelo gateway. */
export const TENANT_GUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isValidTenantGuid(value: string): boolean {
  return TENANT_GUID_REGEX.test(value.trim());
}

/** Mensagens partilhadas entre login e registo (evita cópia divergente). */
export const AUTH_COPY = {
  tenantRequired: 'Selecione um condomínio em Buscar ou informe um Tenant ID válido.',
  emailPasswordRequired: {
    email: 'E-mail é obrigatório',
    password: 'Senha é obrigatória',
  } as const,
  loginNoTokens: 'Resposta de login sem tokens. Contacte o suporte.',
  loginNoProfile: 'Não foi possível carregar o perfil após o login.',
} as const;
