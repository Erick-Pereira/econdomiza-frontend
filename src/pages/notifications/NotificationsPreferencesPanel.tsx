import React, { useEffect, useState } from 'react';
import { formatApiError } from '../../lib/api-error-message';
import {
  useNotificationPreferences,
  useNotificationPreferencesMutations,
} from '../../features/notificacoes/hooks/useNotificationPreferences';
import type { PreferencesFormState } from '../../features/notificacoes/lib/preferences-map';

export interface NotificationsPreferencesPanelProps {
  userId: string;
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

/** Formulário de preferências reutilizável na central de notificações. */
const NotificationsPreferencesPanel: React.FC<NotificationsPreferencesPanelProps> = ({ userId }) => {
  const { formDefaults, isLoading, errorMessage: queryError, refetch } = useNotificationPreferences(userId);
  const { saveForm, clearMuteSnooze, isMutating } = useNotificationPreferencesMutations(userId);

  const [form, setForm] = useState<PreferencesFormState>(defaultForm);
  const [applyMuteSnooze, setApplyMuteSnooze] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    if (formDefaults) {
      setForm(formDefaults);
      setApplyMuteSnooze(false);
    }
  }, [formDefaults]);

  const error = actionError ?? queryError;

  const patchForm = (patch: Partial<PreferencesFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setActionError(null);
    setOkMsg(null);
    try {
      await saveForm.mutateAsync({ form, applyMuteSnooze });
      setOkMsg('Preferências gravadas.');
    } catch (err) {
      setActionError(formatApiError(err));
    }
  };

  const onClearMuteSnooze = async () => {
    if (!userId) return;
    setActionError(null);
    setOkMsg(null);
    try {
      await clearMuteSnooze.mutateAsync(form);
      setApplyMuteSnooze(false);
      setOkMsg('Silêncio e snooze de preços removidos.');
    } catch (err) {
      setActionError(formatApiError(err));
    }
  };

  if (!userId) {
    return <p className="empty-state">Faça login para configurar preferências de notificação.</p>;
  }

  if (isLoading && !formDefaults) {
    return <p className="op-muted">Carregando preferências…</p>;
  }

  return (
    <div className="notif-prefs-panel">
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
            Escolha como quer receber avisos do sistema.
          </p>
          <div className="notif-prefs-channels">
            <label className="notif-prefs-toggle">
              <input
                type="checkbox"
                checked={form.emailEnabled}
                onChange={(e) => patchForm({ emailEnabled: e.target.checked })}
              />
              <span>
                <strong>E-mail</strong>
                <span className="op-muted op-small"> Recomendado para avisos importantes</span>
              </span>
            </label>
            <label className="notif-prefs-toggle">
              <input
                type="checkbox"
                checked={form.smsEnabled}
                onChange={(e) => patchForm({ smsEnabled: e.target.checked })}
              />
              <span>
                <strong>SMS</strong>
                <span className="op-muted op-small"> Mensagens curtas ao telemóvel</span>
              </span>
            </label>
          </div>
          <div className="notif-prefs-grid">
            <label className="op-field">
              <span>Endereço de e-mail</span>
              <input
                type="email"
                value={form.emailAddress}
                onChange={(e) => patchForm({ emailAddress: e.target.value })}
                autoComplete="email"
              />
            </label>
            <label className="op-field">
              <span>Celular (SMS)</span>
              <input
                type="tel"
                value={form.phoneNumber}
                onChange={(e) => patchForm({ phoneNumber: e.target.value })}
                autoComplete="tel"
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="notif-prefs-fieldset">
          <legend>Alertas de preço</legend>
          <p className="op-muted op-small notif-prefs-fieldset__lead">
            Tipos de movimento de preço que quer acompanhar.
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
            <label className="op-field op-field--inline notif-prefs-severity">
              <span>Prioridade mínima</span>
              <select
                value={form.minimumSeverity}
                onChange={(e) => patchForm({ minimumSeverity: e.target.value })}
              >
                <option value="Info">Todas (inclui informativas)</option>
                <option value="Warning">Avisos e acima</option>
                <option value="Critical">Só críticas</option>
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="notif-prefs-fieldset">
          <legend>Silêncio temporário</legend>
          <p className="op-muted op-small notif-prefs-fieldset__lead">
            Pausar notificações até uma data. Marque «Aplicar ao gravar» para guardar estas datas; use o botão
            abaixo para limpar.
          </p>
          <div className="notif-prefs-grid">
            <label className="op-field">
              <span>Silêncio global até</span>
              <input
                type="datetime-local"
                value={form.muteLocal}
                onChange={(e) => patchForm({ muteLocal: e.target.value })}
              />
            </label>
            <label className="op-field">
              <span>Snooze só em alertas de preço até</span>
              <input
                type="datetime-local"
                value={form.snoozeLocal}
                onChange={(e) => patchForm({ snoozeLocal: e.target.value })}
              />
            </label>
          </div>
          <label className="notif-prefs-toggle notif-prefs-toggle--inline" style={{ marginTop: '0.75rem' }}>
            <input
              type="checkbox"
              checked={applyMuteSnooze}
              onChange={(e) => setApplyMuteSnooze(e.target.checked)}
            />
            <span>Aplicar estas datas ao gravar</span>
          </label>
        </fieldset>

        <div className="notif-prefs-actions">
          <button type="submit" className="btn-primary" disabled={isMutating}>
            {isMutating ? 'Salvando…' : 'Salvar preferências'}
          </button>
          <button
            type="button"
            className="btn-small secondary"
            disabled={isMutating}
            onClick={() => void onClearMuteSnooze()}
          >
            Limpar silêncio / snooze
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
