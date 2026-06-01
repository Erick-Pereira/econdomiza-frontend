export type DeliveryListParams = {
  visao: 'recentes' | 'historico';
  page: number;
  pageSize: number;
  status?: string;
  channel?: string;
};

export type NotificationPreferencesPayload = Record<string, unknown>;

export const notificacoesKeys = {
  all: ['notificacoes'] as const,
  dashboard: (userId: string) => [...notificacoesKeys.all, 'dashboard', userId] as const,
  deliveries: (userId: string, params: DeliveryListParams) =>
    [...notificacoesKeys.all, 'deliveries', userId, params] as const,
  governance: () => [...notificacoesKeys.all, 'governance'] as const,
  templates: () => [...notificacoesKeys.all, 'templates'] as const,
  preferences: (userId: string) => [...notificacoesKeys.all, 'preferences', userId] as const,
};
