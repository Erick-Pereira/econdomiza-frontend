import React, { useEffect, useRef, useState } from 'react';
import { formatApiError } from '../../lib/api-error-message';
import {
  useNotificationPreferences,
  useNotificationPreferencesMutations,
} from '../../features/notificacoes/hooks/useNotificationPreferences';
import {
  validatePreferencesForm,
  type PreferencesFormState,
} from '../../features/notificacoes/lib/preferences-map';
import { formatPhoneInput } from '../../features/notificacoes/lib/phone-format';

export interface NotificationsPreferencesPanelProps {
  userId: string;
  profileEmail?: string | null;
  /** Dentro de Configurações — sem padding extra nem badge duplicado. */
  embedded?: boolean;
}

const defaultForm: PreferencesFormState = {
  emailEnabled: true,
  smsEnabled: false,
  emailAddress: '',
  phoneNumber: '',
  alertDrop: true,
  alertRise: true,
  alertTrend: true,
  minimumSeverity: 'Info',
  muteLocal: '',
  snoozeLocal: '',
};

/** Formulário de preferências — estilos em `styles.css` (notif-prefs-*). */
const NotificationsPreferencesPanel: React.FC<NotificationsPreferencesPanelProps> = ({
  userId,
  profileEmail,
  embedded = false,
}) => {
  const {
    formDefaults,
    needsSetup,
    isLoading,
    errorMessage: queryError,
    refetch,
  } = useNotificationPreferences(userId, profileEmail);
  const { saveForm, clearMuteSnooze, isMutating } = useNotificationPreferencesMutations(userId);

  const [form, setForm] = useState<PreferencesFormState>(defaultForm);
  const [actionError, setActionError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const syncedDefaultsKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!formDefaults) return;
    const key = JSON.stringify(formDefaults);
    if (syncedDefaultsKeyRef.current === key) return;
    syncedDefaultsKeyRef.current = key;
    setForm(formDefaults);
  }, [formDefaults]);

  const error = actionError ?? queryError;

  const patchForm = (patch: Partial<PreferencesFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const validation = validatePreferencesForm(form);
    if (!validation.ok) {
      setActionError(validation.message);
      setOkMsg(null);
      return;
    }

    const confirmed = window.confirm(
      'Guardar estas preferências no servidor?\n\nOs alertas de preço passarão a usar estes canais e regras.'
    );
    if (!confirmed) return;

    setActionError(null);
    setOkMsg(null);
    try {
      const savedForm = await saveForm.mutateAsync({ form, applyMuteSnooze: true });
      setForm(savedForm);
      setOkMsg('Preferências guardadas no servidor. Os próximos alertas respeitarão estas regras.');
    } catch (err) {
      setActionError(formatApiError(err));
    }
  };

  const onClearMuteSnooze = async () => {
    if (!userId) return;
    setActionError(null);
    setOkMsg(null);
    try {
      await clearMuteSnooze.mutateAsync({ ...form, muteLocal: '', snoozeLocal: '' });
      patchForm({ muteLocal: '', snoozeLocal: '' });
      setOkMsg('Silêncio e snooze removidos.');
    } catch (err) {
      setActionError(formatApiError(err));
    }
  };

  if (!userId) {
    return <p className="empty-state">Faça login para configurar preferências de notificação.</p>;
  }

  if (isLoading && !formDefaults) {
    return <p className="op-muted">A carregar preferências…</p>;
  }

  return (
    <div
      className={`notif-prefs-panel w-full max-w-full min-w-0 overflow-x-hidden${embedded ? ' notif-prefs-panel--embedded' : ''}`}
    >
      {!embedded && (
        <div className="notif-prefs-status">
          <span className={`op-badge ${needsSetup ? 'op-badge--warn' : 'op-badge--ok'}`}>
            {needsSetup ? 'Configuração pendente' : 'Configurado'}
          </span>
        </div>
      )}

      {needsSetup && (
        <div className="banner banner--warning" role="status">
          <strong>Ainda não recebe alertas.</strong> Confirme o e-mail, active pelo menos um canal e clique em
          «Guardar preferências».
        </div>
      )}

      {error && (
        <div className="banner banner--error" role="alert">
          {error}
        </div>
      )}
      {okMsg && <div className="banner banner--info">{okMsg}</div>}

      <form className="notif-prefs-panel__form" onSubmit={(ev) => void onSave(ev)}>
        <fieldset className="notif-prefs-fieldset">
          <legend>Canais de envio</legend>
          <p className="op-muted op-small notif-prefs-fieldset__lead">
            Escolha como quer receber avisos quando houver alertas de preço no condomínio.
          </p>

          <div className="notif-prefs-channels">
            <label className="notif-prefs-toggle notif-prefs-toggle--channel">
              <input
                type="checkbox"
                checked={form.emailEnabled}
                onChange={(e) => patchForm({ emailEnabled: e.target.checked })}
              />
              <span className="notif-prefs-toggle__body">
                <strong>E-mail</strong>
                <span className="op-muted op-small"> Recomendado — avisos completos com detalhe</span>
              </span>
            </label>

            {form.emailEnabled && (
              <label className="op-field">
                <span>Endereço de e-mail</span>
                <input
                  type="email"
                  className="config-input"
                  value={form.emailAddress}
                  onChange={(e) => patchForm({ emailAddress: e.target.value })}
                  autoComplete="email"
                  placeholder="seu@email.com"
                />
              </label>
            )}

            <label className="notif-prefs-toggle notif-prefs-toggle--channel">
              <input
                type="checkbox"
                checked={form.smsEnabled}
                onChange={(e) => patchForm({ smsEnabled: e.target.checked })}
              />
              <span className="notif-prefs-toggle__body">
                <strong>SMS</strong>
                <span className="op-muted op-small"> Mensagens curtas no telemóvel</span>
              </span>
            </label>

            {form.smsEnabled && (
              <label className="op-field">
                <span>Telemóvel</span>
                <input
                  type="tel"
                  className="config-input"
                  value={form.phoneNumber}
                  onChange={(e) => patchForm({ phoneNumber: formatPhoneInput(e.target.value) })}
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+55 (11) 91234-5678"
                />
              </label>
            )}
          </div>
        </fieldset>

        <fieldset className="notif-prefs-fieldset">
          <legend>Alertas de preço</legend>
          <p className="op-muted op-small notif-prefs-fieldset__lead">
            Tipos de movimento que quer acompanhar. Desmarque o que não for relevante.
          </p>

          <div className="notif-prefs-chips-row">
            <label className="notif-prefs-toggle notif-prefs-toggle--inline">
              <input
                type="checkbox"
                checked={form.alertDrop}
                onChange={(e) => patchForm({ alertDrop: e.target.checked })}
              />
              <span>Quedas</span>
            </label>
            <label className="notif-prefs-toggle notif-prefs-toggle--inline">
              <input
                type="checkbox"
                checked={form.alertRise}
                onChange={(e) => patchForm({ alertRise: e.target.checked })}
              />
              <span>Subidas</span>
            </label>
            <label className="notif-prefs-toggle notif-prefs-toggle--inline">
              <input
                type="checkbox"
                checked={form.alertTrend}
                onChange={(e) => patchForm({ alertTrend: e.target.checked })}
              />
              <span>Tendências</span>
            </label>
          </div>

          <label className="op-field notif-prefs-severity">
            <span>Prioridade mínima</span>
            <select
              className="config-input"
              value={form.minimumSeverity}
              onChange={(e) => patchForm({ minimumSeverity: e.target.value })}
            >
              <option value="Info">Todas (inclui informativas)</option>
              <option value="Warning">Avisos e acima</option>
              <option value="Critical">Só críticas</option>
            </select>
            <span className="op-muted op-small">Alertas abaixo deste nível são ignorados.</span>
          </label>
        </fieldset>

        <fieldset className="notif-prefs-fieldset">
          <legend>Silêncio temporário</legend>
          <p className="op-muted op-small notif-prefs-fieldset__lead">
            Opcional. Deixe em branco para receber alertas normalmente. Gravado ao guardar.
          </p>

          <div className="notif-prefs-grid">
            <label className="op-field">
              <span>Silêncio global até</span>
              <input
                type="datetime-local"
                className="config-input"
                value={form.muteLocal}
                onChange={(e) => patchForm({ muteLocal: e.target.value })}
              />
            </label>
            <label className="op-field">
              <span>Snooze só em alertas de preço até</span>
              <input
                type="datetime-local"
                className="config-input"
                value={form.snoozeLocal}
                onChange={(e) => patchForm({ snoozeLocal: e.target.value })}
              />
            </label>
          </div>
        </fieldset>

        <div className="notif-prefs-actions flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button type="submit" className="btn-primary" disabled={isMutating}>
            {isMutating ? 'A guardar…' : 'Guardar preferências'}
          </button>
          <button
            type="button"
            className="btn-small secondary"
            disabled={isMutating}
            onClick={() => void onClearMuteSnooze()}
          >
            Limpar silêncio
          </button>
          <button
            type="button"
            className="btn-small secondary"
            disabled={isMutating}
            onClick={() => void refetch()}
          >
            Recarregar
          </button>
        </div>
      </form>
    </div>
  );
};

export default NotificationsPreferencesPanel;
