/** GUID interno do condomínio (gateway) — nunca exposto na UI. */
export const TENANT_GUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isValidTenantGuid(value: string): boolean {
  return TENANT_GUID_REGEX.test(value.trim());
}

/** Mensagens partilhadas entre login e registo. */
export const AUTH_COPY = {
  condominioRequired: 'Selecione o condomínio em Buscar.',
  wrongCondominio:
    'Seu usuário não está vinculado ao condomínio selecionado. Verifique a opção escolhida e tente novamente.',
  emailPasswordRequired: {
    email: 'E-mail é obrigatório',
    password: 'Senha é obrigatória',
  } as const,
  loginNoTokens: 'Resposta de login sem tokens. Contacte o suporte.',
  loginNoProfile: 'Não foi possível carregar o perfil após o login.',
  tenantRequired: 'Selecione o condomínio em Buscar.',
} as const;

export function isWrongCondominioLoginError(message: string): boolean {
  return message.toLowerCase().includes('vinculado ao condomínio');
}
