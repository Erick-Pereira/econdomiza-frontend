import React, { useCallback, useEffect, useState } from 'react';
import { EcondomizaApi } from '../../services';
import { formatApiError } from '../../lib/api-error-message';

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalToUtcIso(local: string): string | null {
  const t = local.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function readPrefs(raw: unknown, fallbackUserId: string): Record<string, unknown> {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  if (!o.userId && !o.UserId && fallbackUserId) {
    return { ...o, userId: fallbackUserId };
  }
  return o;
}

export interface NotificationsPreferencesPanelProps {
  userId: string;
}

/** Formulário de preferências reutilizável na central de notificações. */
const NotificationsPreferencesPanel: React.FC<NotificationsPreferencesPanelProps> = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [alertDrop, setAlertDrop] = useState(true);
  const [alertRise, setAlertRise] = useState(true);
  const [alertTrend, setAlertTrend] = useState(true);
  const [minimumSeverity, setMinimumSeverity] = useState('Info');
  const [muteLocal, setMuteLocal] = useState('');
  const [snoozeLocal, setSnoozeLocal] = useState('');
  const [applyMuteSnooze, setApplyMuteSnooze] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setError('Perfil sem identificador de utilizador.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data } = await EcondomizaApi.notificationPreferences(userId);
      const p = readPrefs(data, userId);
      setEmailEnabled(Boolean(p.emailEnabled ?? p.EmailEnabled ?? true));
      setSmsEnabled(Boolean(p.smsEnabled ?? p.SmsEnabled ?? false));
      setEmailAddress(String(p.emailAddress ?? p.EmailAddress ?? ''));
      setPhoneNumber(String(p.phoneNumber ?? p.PhoneNumber ?? ''));
      setAlertDrop(Boolean(p.alertDropEnabled ?? p.AlertDropEnabled ?? true));
      setAlertRise(Boolean(p.alertRiseEnabled ?? p.AlertRiseEnabled ?? true));
      setAlertTrend(Boolean(p.alertTrendEnabled ?? p.AlertTrendEnabled ?? true));
      setMinimumSeverity(String(p.minimumSeverity ?? p.MinimumSeverity ?? 'Info'));
      setMuteLocal(toDatetimeLocalValue(String(p.muteAllUntilUtc ?? p.MuteAllUntilUtc ?? '') || undefined));
      setSnoozeLocal(toDatetimeLocalValue(String(p.snoozePriceAlertsUntilUtc ?? p.SnoozePriceAlertsUntilUtc ?? '') || undefined));
      setError(null);
      setOkMsg(null);
    } catch (e) {
      console.error(e);
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    try {
      setSaving(true);
      setOkMsg(null);
      const muteIso = fromDatetimeLocalToUtcIso(muteLocal);
      const snoozeIso = fromDatetimeLocalToUtcIso(snoozeLocal);
      const body: Record<string, unknown> = {
        userId,
        emailEnabled,
        smsEnabled,
        emailAddress: emailAddress.trim() || null,
        phoneNumber: phoneNumber.trim() || null,
        alertDropEnabled: alertDrop,
        alertRiseEnabled: alertRise,
        alertTrendEnabled: alertTrend,
        minimumSeverity: minimumSeverity.trim() || 'Info',
        applyMuteSnooze,
      };
      if (applyMuteSnooze) {
        body.muteAllUntilUtc = muteIso;
        body.snoozePriceAlertsUntilUtc = snoozeIso;
      }
      await EcondomizaApi.notificationUpdatePreferences(body);
      setOkMsg('Preferências gravadas.');
      await load();
    } catch (err) {
      console.error(err);
      setError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const clearMuteSnooze = async () => {
    if (!userId) return;
    try {
      setSaving(true);
      await EcondomizaApi.notificationUpdatePreferences({
        userId,
        emailEnabled,
        smsEnabled,
        emailAddress: emailAddress.trim() || null,
        phoneNumber: phoneNumber.trim() || null,
        alertDropEnabled: alertDrop,
        alertRiseEnabled: alertRise,
        alertTrendEnabled: alertTrend,
        minimumSeverity: minimumSeverity.trim() || 'Info',
        applyMuteSnooze: true,
        muteAllUntilUtc: null,
        snoozePriceAlertsUntilUtc: null,
      });
      setMuteLocal('');
      setSnoozeLocal('');
      setApplyMuteSnooze(false);
      setOkMsg('Silêncio e snooze de preços removidos.');
      await load();
    } catch (err) {
      console.error(err);
      setError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (!userId) {
    return <p className="empty-state">Faça login para gerenciar preferências.</p>;
  }

  if (loading) {
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
          <p className="op-muted op-small notif-prefs-fieldset__lead">Escolha como quer receber avisos do sistema.</p>
          <div className="notif-prefs-channels">
            <label className="notif-prefs-toggle">
              <input type="checkbox" checked={emailEnabled} onChange={(e) => setEmailEnabled(e.target.checked)} />
              <span>
                <strong>E-mail</strong>
                <span className="op-muted op-small"> Recomendado para avisos importantes</span>
              </span>
            </label>
            <label className="notif-prefs-toggle">
              <input type="checkbox" checked={smsEnabled} onChange={(e) => setSmsEnabled(e.target.checked)} />
              <span>
                <strong>SMS</strong>
                <span className="op-muted op-small"> Mensagens curtas ao telemóvel</span>
              </span>
            </label>
          </div>
          <div className="notif-prefs-grid">
            <label className="op-field">
              <span>Endereço de e-mail</span>
              <input type="email" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} autoComplete="email" />
            </label>
            <label className="op-field">
              <span>Celular (SMS)</span>
              <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} autoComplete="tel" />
            </label>
          </div>
        </fieldset>

        <fieldset className="notif-prefs-fieldset">
          <legend>Alertas de preço</legend>
          <p className="op-muted op-small notif-prefs-fieldset__lead">Tipos de movimento de preço que quer acompanhar.</p>
          <div className="notif-prefs-chips-row">
            <label className="notif-prefs-toggle notif-prefs-toggle--inline">
              <input type="checkbox" checked={alertDrop} onChange={(e) => setAlertDrop(e.target.checked)} />
              <span>Quedas</span>
            </label>
            <label className="notif-prefs-toggle notif-prefs-toggle--inline">
              <input type="checkbox" checked={alertRise} onChange={(e) => setAlertRise(e.target.checked)} />
              <span>Subidas</span>
            </label>
            <label className="notif-prefs-toggle notif-prefs-toggle--inline">
              <input type="checkbox" checked={alertTrend} onChange={(e) => setAlertTrend(e.target.checked)} />
              <span>Tendências</span>
            </label>
            <label className="op-field op-field--inline notif-prefs-severity">
              <span>Prioridade mínima</span>
              <select value={minimumSeverity} onChange={(e) => setMinimumSeverity(e.target.value)}>
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
            Pausar notificações até uma data. Marque «Aplicar ao gravar» para guardar estas datas; use o botão abaixo
            para limpar.
          </p>
          <div className="notif-prefs-grid">
            <label className="op-field">
              <span>Silêncio global até</span>
              <input type="datetime-local" value={muteLocal} onChange={(e) => setMuteLocal(e.target.value)} />
            </label>
            <label className="op-field">
              <span>Snooze só em alertas de preço até</span>
              <input type="datetime-local" value={snoozeLocal} onChange={(e) => setSnoozeLocal(e.target.value)} />
            </label>
          </div>
          <label className="notif-prefs-toggle notif-prefs-toggle--inline" style={{ marginTop: '0.75rem' }}>
            <input type="checkbox" checked={applyMuteSnooze} onChange={(e) => setApplyMuteSnooze(e.target.checked)} />
            <span>Aplicar estas datas ao gravar</span>
          </label>
        </fieldset>

        <div className="notif-prefs-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar preferências'}
          </button>
          <button type="button" className="btn-small secondary" disabled={saving} onClick={() => void clearMuteSnooze()}>
            Limpar silêncio / snooze
          </button>
          <button type="button" className="btn-small secondary" disabled={saving} onClick={() => void load()}>
            Recarregar
          </button>
        </div>
      </form>
    </div>
  );
};

export default NotificationsPreferencesPanel;
