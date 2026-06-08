import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatApiError } from '../../../lib/api-error-message';
import { GatewayHttpError } from '../../../lib/gateway';
import { EcondomizaApi } from '../../../services';
import {
  formStateToPayload,
  fromDatetimeLocalToUtcIso,
  isPreferencesUnset,
  mergeProfileEmailIntoForm,
  prefsToFormState,
  readPrefs,
  type PreferencesFormState,
} from '../lib/preferences-map';
import { NO_USER_ERROR } from '../lib/notifications-model';
import { notificacoesKeys } from '../query-keys';

export function useNotificationPreferences(userId: string, profileEmail?: string | null) {
  const enabled = userId.length > 0;
  const query = useQuery({
    queryKey: notificacoesKeys.preferences(userId || '_'),
    queryFn: async () => {
      const { data } = await EcondomizaApi.notificationPreferences(userId);
      const unset = isPreferencesUnset(data);
      const raw = readPrefs(data, userId);
      let form = prefsToFormState(raw);
      if (unset) {
        form = mergeProfileEmailIntoForm(form, profileEmail);
      }
      return { form, needsSetup: unset };
    },
    enabled,
  });

  return {
    formDefaults: query.data?.form ?? null,
    needsSetup: query.data?.needsSetup ?? false,
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

      const { data: afterSave } = await EcondomizaApi.notificationPreferences(userId);
      if (isPreferencesUnset(afterSave)) {
        throw new GatewayHttpError(
          'As preferências não foram gravadas no servidor. Verifique a ligação ao serviço de notificações.',
          { status: 502 }
        );
      }

      return prefsToFormState(readPrefs(afterSave, userId));
    },
    onSuccess: (savedForm) => {
      queryClient.setQueryData(notificacoesKeys.preferences(userId), {
        form: savedForm,
        needsSetup: false,
      });
    },
  });

  const clearMuteSnooze = useMutation({
    mutationFn: async (form: PreferencesFormState) => {
      const body = formStateToPayload(userId, form, {
        applyMuteSnooze: true,
        muteIso: null,
        snoozeIso: null,
      });
      await EcondomizaApi.notificationUpdatePreferences(body);

      const { data: afterSave } = await EcondomizaApi.notificationPreferences(userId);
      return prefsToFormState(readPrefs(afterSave, userId));
    },
    onSuccess: (savedForm) => {
      queryClient.setQueryData(
        notificacoesKeys.preferences(userId),
        (prev: { form: PreferencesFormState; needsSetup: boolean } | undefined) => ({
          form: savedForm,
          needsSetup: prev?.needsSetup ?? false,
        })
      );
    },
  });

  const isMutating = savePreferences.isPending || saveForm.isPending || clearMuteSnooze.isPending;

  return { savePreferences, saveForm, clearMuteSnooze, isMutating };
}
