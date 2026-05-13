import React, { useEffect, useState } from 'react';
import { useAuthSession } from '../context/AuthSessionContext';
import { formatApiError } from '../lib/api-error-message';
import { EcondomizaApi } from '../services/api';

const ConfiguracoesPage: React.FC = () => {
  const { profile } = useAuthSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!profile) {
      setLoading(false);
      setPrefs(null);
      setError('Sessão indisponível.');
      return;
    }
    try {
      setLoading(true);
      const pr = await EcondomizaApi.getNotificationPreferences(profile.id);
      setPrefs((pr.data as Record<string, unknown>) ?? null);
      setError(null);
    } catch (e) {
      console.error(e);
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [profile?.id]);

  const handleSavePrefs = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      await EcondomizaApi.updateNotificationPreferences(prefs);
      await load();
    } catch (e) {
      console.error(e);
      setError(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const setPref = (key: string, value: unknown) => {
    setPrefs((prev) => ({ ...(prev ?? {}), [key]: value }));
  };

  if (loading) {
    return (
      <div className="configuracoes-loading">
        <p>A carregar…</p>
      </div>
    );
  }

  return (
    <div className="page" id="configuracoes-page">
      <div className="page-header">
        <h1>Configurações</h1>
        <p>Perfil e preferências de notificação (dados do gateway)</p>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, color: 'crimson' }}>
          {error}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>Perfil</h2>
        </div>
        <pre
          style={{
            padding: 16,
            overflow: 'auto',
            fontSize: 13,
            background: '#0f172a',
            color: '#e2e8f0',
            borderRadius: 8,
          }}
        >
          {JSON.stringify(profile, null, 2)}
        </pre>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <h2>Notificações</h2>
        </div>
        {prefs ? (
          <div style={{ display: 'grid', gap: 12, maxWidth: 480 }}>
            {typeof prefs.emailEnabled === 'boolean' && (
              <label>
                <input
                  type="checkbox"
                  checked={prefs.emailEnabled === true}
                  onChange={(e) => setPref('emailEnabled', e.target.checked)}
                />{' '}
                E-mail
              </label>
            )}
            {typeof prefs.smsEnabled === 'boolean' && (
              <label>
                <input
                  type="checkbox"
                  checked={prefs.smsEnabled === true}
                  onChange={(e) => setPref('smsEnabled', e.target.checked)}
                />{' '}
                SMS
              </label>
            )}
            {prefs.minSeverity != null && (
              <label>
                Severidade mínima{' '}
                <select
                  value={String(prefs.minSeverity)}
                  onChange={(e) => setPref('minSeverity', e.target.value)}
                >
                  <option value="INFO">INFO</option>
                  <option value="WARNING">WARNING</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </label>
            )}
            <button type="button" className="btn-primary" disabled={saving} onClick={() => void handleSavePrefs()}>
              {saving ? 'A guardar…' : 'Guardar preferências'}
            </button>
          </div>
        ) : (
          <p>Sem dados de preferências (endpoint /api/notifications/preferences).</p>
        )}
        <pre
          style={{
            marginTop: 16,
            padding: 16,
            overflow: 'auto',
            fontSize: 12,
            background: '#1e293b',
            color: '#e2e8f0',
            borderRadius: 8,
          }}
        >
          {JSON.stringify(prefs, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default ConfiguracoesPage;
