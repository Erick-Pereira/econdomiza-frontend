import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EcondomizaApi } from '../../../services';
import { alertasKeys } from '../query-keys';
import { insightsKeys } from '../../insights/lib/insights-model';

export function useMarkAlertRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      await EcondomizaApi.markAlertRead(alertId);
      return alertId;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: alertasKeys.list() });
      void queryClient.invalidateQueries({ queryKey: insightsKeys.bundle() });
    },
  });
}
