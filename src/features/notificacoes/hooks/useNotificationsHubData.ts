import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatApiError } from '../../../lib/api-error-message';
import { EcondomizaApi } from '../../../services';
import {
  NO_USER_ERROR,
  readDashboard,
  readGov,
  readItemsPage,
  readTemplates,
} from '../lib/notifications-model';
import { notificacoesKeys, type DeliveryListParams } from '../query-keys';

export function useNotificationsDashboard(userId: string) {
  const enabled = userId.length > 0;
  const query = useQuery({
    queryKey: notificacoesKeys.dashboard(userId || '_'),
    queryFn: async () => {
      const { data } = await EcondomizaApi.notificationOperationalDashboard(userId);
      return readDashboard(data);
    },
    enabled,
  });

  return {
    dashboard: query.data ?? null,
    isLoading: query.isLoading,
    errorMessage: !enabled ? NO_USER_ERROR : query.isError ? formatApiError(query.error) : null,
    refetch: query.refetch,
  };
}

export function useNotificationsDeliveries(userId: string, params: DeliveryListParams) {
  const enabled = userId.length > 0;
  const query = useQuery({
    queryKey: notificacoesKeys.deliveries(userId || '_', params),
    queryFn: async () => {
      const apiParams: { status?: string; channel?: string; page: number; pageSize: number } = {
        page: params.page,
        pageSize: params.pageSize,
      };
      if (params.status?.trim()) apiParams.status = params.status.trim();
      if (params.channel?.trim()) apiParams.channel = params.channel.trim();
      const { data } = await EcondomizaApi.notificationDeliveries(userId, apiParams);
      return readItemsPage(data);
    },
    enabled,
  });

  return {
    page: query.data ?? null,
    isLoading: query.isLoading,
    errorMessage: !enabled ? NO_USER_ERROR : query.isError ? formatApiError(query.error) : null,
    refetch: query.refetch,
  };
}

export function useNotificationsMeta(enabled: boolean) {
  const [govQuery, templatesQuery] = useQueries({
    queries: [
      {
        queryKey: notificacoesKeys.governance(),
        queryFn: async () => {
          const res = await EcondomizaApi.notificationGovernance();
          return readGov(res.data);
        },
        enabled,
      },
      {
        queryKey: notificacoesKeys.templates(),
        queryFn: async () => {
          const res = await EcondomizaApi.notificationTemplates();
          return readTemplates(res.data);
        },
        enabled,
      },
    ],
  });

  const errorMessage =
    [
      govQuery.isError ? formatApiError(govQuery.error) : null,
      templatesQuery.isError ? formatApiError(templatesQuery.error) : null,
    ]
      .filter(Boolean)
      .join(' ') || null;

  return {
    gov: govQuery.data ?? null,
    templates: templatesQuery.data ?? [],
    isLoading: enabled && (govQuery.isLoading || templatesQuery.isLoading),
    errorMessage,
    refetch: async () => {
      await Promise.all([govQuery.refetch(), templatesQuery.refetch()]);
    },
  };
}

export function useNotificationRetryDelivery(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deliveryId: string) => EcondomizaApi.notificationRetryDelivery(deliveryId, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificacoesKeys.all });
    },
  });
}
