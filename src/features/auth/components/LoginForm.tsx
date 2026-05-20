import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CondominioLookupModal } from '../../../components/auth/CondominioLookupModal';
import type { CondoRow } from '../../../lib/condominio-lookup';
import { useAuthSession } from '../../../context/AuthSessionContext';
import { useLoginForm } from '../hooks/useLoginForm';
import { useEstablishGatewaySession } from '../hooks/useEstablishGatewaySession';
import { AUTH_COPY, isValidTenantGuid } from '../constants';
import { Button, Input, PasswordInput, LoadingSpinner, FormError } from '../../../components/ui';

export interface LoginFormProps {
  defaultTenantId?: string;
  onLoginError?: (error: string) => void;
}

export interface LoginFormData {
  tenantId: string;
  email: string;
  password: string;
}

export interface FormErrors {
  tenantId?: string;
  email?: string;
  password?: string;
  general?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ defaultTenantId, onLoginError }) => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: sessionLoading } = useAuthSession();
  const { loginWithCredentials } = useEstablishGatewaySession();
  const [modalOpen, setModalOpen] = useState(false);
  const [condoLabel, setCondoLabel] = useState<string | null>(null);

  const form = useLoginForm();

  const { formData, errors, setErrors, validate, showAdvanced, setFormData } = form;

  useEffect(() => {
    if (!sessionLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [sessionLoading, isAuthenticated, navigate]);

  const summaryDisplay = useMemo(() => {
    if (condoLabel && condoLabel.trim()) return condoLabel.trim();
    if (!formData.tenantId) return null;
    if (!isValidTenantGuid(formData.tenantId)) return null;
    return formData.tenantId.trim();
  }, [condoLabel, formData.tenantId]);

  const onCondoPicked = useCallback(
    (row: CondoRow) => {
      setErrors((prev: FormErrors) => ({ ...prev, tenantId: undefined }));
      setCondoLabel(row.label);
      setFormData((prev: LoginFormData) => ({ ...prev, tenantId: row.id }));
    },
    [setFormData, setErrors]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrors({} as FormErrors);

      const tid = formData.tenantId.trim();
      if (!isValidTenantGuid(tid)) {
        setErrors((prev: FormErrors) => ({ ...prev, tenantId: AUTH_COPY.tenantRequired }));
        return;
      }

      if (!formData.email || !formData.password) {
        setErrors((prev: FormErrors) => ({
          ...prev,
          email: AUTH_COPY.emailPasswordRequired.email,
          password: AUTH_COPY.emailPasswordRequired.password,
        }));
        return;
      }

      const result = await loginWithCredentials(tid, formData.email.trim(), formData.password);
      if (!result.ok) {
        const msg = result.message;
        if (onLoginError) onLoginError(msg);
        setErrors((prev: FormErrors) => ({ ...prev, general: msg }));
        return;
      }

      navigate('/dashboard', { replace: true });
    },
    [formData.email, formData.password, formData.tenantId, navigate, onLoginError, setErrors, loginWithCredentials]
  );

  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      const isValid = validate();
      if (!isValid) {
        setIsLoading(false);
        return;
      }

      await handleSubmit(e);
      setIsLoading(false);
    },
    [validate, handleSubmit]
  );

  useEffect(() => {
    if (defaultTenantId) {
      const tid = defaultTenantId.trim();
      if (isValidTenantGuid(tid)) {
        setCondoLabel(null);
        setFormData((prev: LoginFormData) => ({ ...prev, tenantId: tid }));
      }
    }
  }, [defaultTenantId, setFormData]);

  useEffect(() => {
    if (!formData.tenantId.trim()) {
      setCondoLabel(null);
    }
  }, [formData.tenantId]);

  return (
    <main className="login-shell" aria-labelledby="login-heading">
      <div className="login-page">
        <div className="login-card">
          <img src="/logo-econdomiza.jpeg" alt="Logo" class="logo-large"></img>
          <h2 id="login-heading">Entrar</h2>
          <p id="login-intro" className="form-help login-intro">
            Escolha o <strong>condomínio</strong> em que vai trabalhar. 
          </p>

          <form onSubmit={onSubmit} aria-describedby="login-intro" noValidate>
            <div className="form-group">
              <label className="field-label" htmlFor="condo-summary-display">
                Condomínio
              </label>
              <div className="condo-chosen-row">
                <span
                  id="condo-summary-display"
                  className={`condo-summary${!summaryDisplay ? ' condo-summary--empty' : ''}`}
                  aria-live="polite"
                >
                  {summaryDisplay ?? 'Nenhum condomínio selecionado'}
                </span>
                <button
                  type="button"
                  className="btn-lookup"
                  onClick={() => setModalOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={modalOpen}
                  title="Buscar condomínios"
                >
                  Buscar
                </button>
              </div>

              {errors.tenantId && <p className="text-sm text-red-600 mt-1">{errors.tenantId}</p>}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => form.setShowAdvanced((s: boolean) => !s)}
              aria-expanded={showAdvanced}
              aria-controls="tenant-advanced-panel"
              id="tenant-advanced-toggle"
            >
              {showAdvanced ? 'Ocultar' : 'Tenant ID (avançado)'}
            </Button>

            {showAdvanced && (
              <div
                className="form-group"
                id="tenant-advanced-panel"
                role="region"
                aria-labelledby="tenant-advanced-toggle"
                style={{ marginBottom: 'var(--spacing-md)' }}
              >
                <Input
                  label="Tenant ID (GUID)"
                  id="tenantId"
                  placeholder="00000000-0000-0000-0000-000000000000"
                  value={formData.tenantId}
                  onChange={(e) => {
                    setCondoLabel(null);
                    form.setFormData((prev: LoginFormData) => ({ ...prev, tenantId: e.target.value }));
                  }}
                  error={errors.tenantId}
                  autoComplete="off"
                  aria-describedby="tenantId-help"
                />
                <p id="tenantId-help" className="text-sm text-gray-500 mt-1">
                  Uso operacional (suporte). O fluxo recomendado é <strong>Buscar</strong>.
                </p>
              </div>
            )}

            <Input
              label="E-mail"
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => form.setFormData((prev: LoginFormData) => ({ ...prev, email: e.target.value }))}
              error={errors.email}
              autoComplete="username"
              required
              helperText="Digite seu e-mail corporativo"
            />

            <PasswordInput
              label="Senha"
              id="password"
              value={formData.password}
              onChange={(e) => form.setFormData((prev: LoginFormData) => ({ ...prev, password: e.target.value }))}
              error={errors.password}
              autoComplete="current-password"
              required
              helperText="Mínimo 8 caracteres"
            />

            {errors.general && (
              <div className="mt-3">
                <FormError className="auth-screen-error">{errors.general}</FormError>
              </div>
            )}

            <div className="form-actions">
              {isLoading ? (
                <LoadingSpinner fullWidth message="A entrar…" />
              ) : (
                <Button type="submit" variant="primary" fullWidth>
                  Entrar
                </Button>
              )}
            </div>

            <p className="form-help login-intro" style={{ marginTop: 'var(--spacing-lg)' }}>
              <Link to="/register">Criar conta</Link>
              {' · '}
              <a href="/auth.html" className="link-accent">
                Autenticação clássica (HTML)
              </a>
            </p>
          </form>
        </div>
      </div>

      {modalOpen && (
        <CondominioLookupModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={onCondoPicked}
          currentTenantId={formData.tenantId.trim() || undefined}
        />
      )}
    </main>
  );
};
