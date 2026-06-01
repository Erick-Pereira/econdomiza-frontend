import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatApiError } from '../../../lib/api-error-message';
import { EcondomizaApi } from '../../../services';
import {
  formStateToPayload,
  fromDatetimeLocalToUtcIso,
  prefsToFormState,
  readPrefs,
  type PreferencesFormState,
} from '../lib/preferences-map';
import { NO_USER_ERROR } from '../lib/notifications-model';
import { notificacoesKeys } from '../query-keys';

export function useNotificationPreferences(userId: string) {
  const enabled = userId.length > 0;
  const query = useQuery({
    queryKey: notificacoesKeys.preferences(userId || '_'),
    queryFn: async () => {
      const { data } = await EcondomizaApi.notificationPreferences(userId);
      return prefsToFormState(readPrefs(data, userId));
    },
    enabled,
  });

  return {
    formDefaults: query.data ?? null,
    isLoading: query.isLoading,
    errorMessage: !enabled ? NO_USER_ERROR : query.isError ? formatApiError(query.error) : null,
    refetch: query.refetch,
  };
}

export function useNotificationPreferencesMutations(userId: string) {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    if (!userId) return;
    await queryClient.invalidateQueries({ queryKey: notificacoesKeys.preferences(userId) });
  };

  const savePreferences = useMutation({
    mutationFn: (body: Record<string, unknown>) => EcondomizaApi.notificationUpdatePreferences(body),
    onSuccess: invalidate,
  });

  const saveForm = useMutation({
    mutationFn: async ({
      form,
      applyMuteSnooze,
    }: {
      form: PreferencesFormState;
      applyMuteSnooze: boolean;
    }) => {
      const muteIso = fromDatetimeLocalToUtcIso(form.muteLocal);
      const snoozeIso = fromDatetimeLocalToUtcIso(form.snoozeLocal);
      const body = formStateToPayload(userId, form, {
        applyMuteSnooze,
        muteIso,
        snoozeIso,
      });
      await EcondomizaApi.notificationUpdatePreferences(body);
    },
    onSuccess: invalidate,
  });

  const clearMuteSnooze = useMutation({
    mutationFn: async (form: PreferencesFormState) => {
      const body = formStateToPayload(userId, form, {
        applyMuteSnooze: true,
        muteIso: null,
        snoozeIso: null,
      });
      await EcondomizaApi.notificationUpdatePreferences(body);
    },
    onSuccess: invalidate,
  });

  const isMutating = savePreferences.isPending || saveForm.isPending || clearMuteSnooze.isPending;

  return { savePreferences, saveForm, clearMuteSnooze, isMutating };
}
