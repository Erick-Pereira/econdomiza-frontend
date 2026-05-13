import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CondominioLookupModal } from '../../../components/auth/CondominioLookupModal';
import type { CondoRow } from '../../../lib/condominio-lookup';
import { formatApiError } from '../../../lib/api-error-message';
import { EcondomizaApi } from '../../../services/api';
import { useAuthSession } from '../../../context/AuthSessionContext';
import { useRegisterForm } from '../hooks/useRegisterForm';
import { useEstablishGatewaySession } from '../hooks/useEstablishGatewaySession';
import { AUTH_COPY, isValidTenantGuid } from '../constants';
import { Button, Input, PasswordInput, LoadingSpinner } from '../../../components/ui';

export interface RegisterFormProps {
  defaultTenantId?: string;
  onRegisterError?: (error: string) => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ defaultTenantId, onRegisterError }) => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: sessionLoading } = useAuthSession();
  const { establishFromEnvelope } = useEstablishGatewaySession();
  const [modalOpen, setModalOpen] = useState(false);
  const [condoLabel, setCondoLabel] = useState<string | null>(null);

  const form = useRegisterForm();

  useEffect(() => {
    if (!sessionLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [sessionLoading, isAuthenticated, navigate]);

  const {
    formData,
    errors,
    setErrors,
    validate,
    showAdvanced,
    hasCondominio,
    isNameValid,
  } = form;

  const summaryDisplay = useMemo(() => {
    if (condoLabel && condoLabel.trim()) return condoLabel.trim();
    if (!formData.tenantId) return null;
    if (!isValidTenantGuid(formData.tenantId)) return null;
    return formData.tenantId.trim();
  }, [condoLabel, formData.tenantId]);

  const onCondoPicked = useCallback(
    (row: CondoRow) => {
      setErrors((prev) => ({ ...prev, tenantId: undefined }));
      setCondoLabel(row.label);
      form.setFormData((prev) => ({ ...prev, tenantId: row.id }));
    },
    [form.setFormData, setErrors]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrors({});

      const tid = formData.tenantId.trim();
      if (!isValidTenantGuid(tid)) {
        setErrors((prev) => ({ ...prev, tenantId: AUTH_COPY.tenantRequired }));
        return;
      }

      if (!formData.email || !formData.password) {
        setErrors((prev) => ({
          ...prev,
          email: AUTH_COPY.emailPasswordRequired.email,
          password: AUTH_COPY.emailPasswordRequired.password,
        }));
        return;
      }

      try {
        const registerRes = await EcondomizaApi.register({
          tenantId: tid,
          email: formData.email.trim(),
          password: formData.password,
          name: formData.name.trim(),
          role: formData.role,
        });
        const sessionResult = await establishFromEnvelope(registerRes.data);
        if (sessionResult.ok) {
          navigate('/dashboard', { replace: true });
          return;
        }
        if (sessionResult.code === 'no_tokens' || sessionResult.code === 'no_profile') {
          navigate('/login', {
            replace: true,
            state: { message: 'Conta criada com sucesso! Faça login para continuar.' },
          });
          return;
        }
        setErrors((prev) => ({ ...prev, general: sessionResult.message }));
      } catch (err: unknown) {
        const errorMessage = formatApiError(err);
        if (onRegisterError) onRegisterError(errorMessage);
        setErrors((prev) => ({ ...prev, general: errorMessage }));
      }
    },
    [
      formData.email,
      formData.password,
      formData.tenantId,
      formData.name,
      formData.role,
      navigate,
      onRegisterError,
      setErrors,
      establishFromEnvelope,
    ]
  );

  const [loading, setLoading] = React.useState(false);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      setLoading(true);
      const isValid = validate();
      if (!isValid) {
        setErrors({});
        setLoading(false);
        return;
      }

      await handleSubmit(e);
      setErrors({});
      setLoading(false);
    },
    [validate, setErrors, handleSubmit]
  );

  useEffect(() => {
    if (defaultTenantId) {
      const tid = defaultTenantId.trim();
      if (isValidTenantGuid(tid)) {
        setCondoLabel(null);
        form.setFormData((prev) => ({ ...prev, tenantId: tid }));
      }
    }
  }, [defaultTenantId, form.setFormData]);

  useEffect(() => {
    if (!formData.tenantId.trim()) {
      setCondoLabel(null);
    }
  }, [formData.tenantId]);

  const handleRoleChange = useCallback(
    (role: string) => {
      form.setFormData((prev) => ({ ...prev, role }));
    },
    [form.setFormData]
  );

  const roles: { value: string; label: string }[] = [
    { value: 'Sindico', label: 'Síndico' },
    { value: 'Administrador', label: 'Administrador' },
    { value: 'Membro', label: 'Membro' },
  ];

  return (
    <main className="login-shell" aria-labelledby="register-heading">
      <div className="login-page">
        <div className="login-card">
          <h2 id="register-heading">Criar Conta</h2>
          <p id="register-intro" className="form-help">
            Cadastre-se para acessar o sistema Econdomiza e começar a gerenciar seu condomínio.
          </p>

          <form onSubmit={onSubmit} aria-describedby="register-intro" noValidate>
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
              onClick={() => form.setShowAdvanced((s) => !s)}
              aria-expanded={showAdvanced}
              aria-controls="register-tenant-advanced"
              id="register-tenant-advanced-toggle"
            >
              {showAdvanced ? 'Ocultar' : 'Tenant ID (avançado)'}
            </Button>

            {showAdvanced && (
              <div
                className="form-group"
                id="register-tenant-advanced"
                role="region"
                aria-labelledby="register-tenant-advanced-toggle"
                style={{ marginBottom: 'var(--spacing-md)' }}
              >
                <Input
                  label="Tenant ID (GUID)"
                  id="tenantId"
                  placeholder="00000000-0000-0000-0000-000000000000"
                  value={formData.tenantId}
                  onChange={(e) => {
                    setCondoLabel(null);
                    form.setFormData((prev) => ({ ...prev, tenantId: e.target.value }));
                  }}
                  error={errors.tenantId}
                  autoComplete="off"
                  aria-describedby="tenantId-help"
                />
                <p id="tenantId-help" className="text-sm text-gray-500 mt-1">
                  Uso operacional (suporte).
                </p>
              </div>
            )}

            <Input
              label="Nome completo"
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => form.setFormData((prev) => ({ ...prev, name: e.target.value }))}
              error={errors.name}
              autoComplete="name"
              required
              helperText="Seu nome completo"
              disabled={!hasCondominio}
            />

            <Input
              label="E-mail"
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => form.setFormData((prev) => ({ ...prev, email: e.target.value }))}
              error={errors.email}
              autoComplete="username"
              required
              helperText="Digite seu e-mail corporativo"
              disabled={!hasCondominio}
            />

            <PasswordInput
              label="Senha"
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => form.setFormData((prev) => ({ ...prev, password: e.target.value }))}
              error={errors.password}
              autoComplete="new-password"
              required
              helperText="Mínimo 8 caracteres"
              disabled={!hasCondominio}
            />

            <div className="form-group">
              <label className="field-label" htmlFor="role-select">
                Perfil
              </label>
              <select
                id="role-select"
                value={formData.role}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                disabled={!hasCondominio || isNameValid === false || !formData.email}
                aria-describedby="role-helper"
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <p id="role-helper" className="text-sm text-gray-500 mt-1">
                Selecione seu perfil no condomínio
              </p>
            </div>

            {errors.general && (
              <p className="auth-screen-error mt-2" role="alert">
                {errors.general}
              </p>
            )}

            <div className="form-actions">
              {loading ? (
                <LoadingSpinner fullWidth message="Criando conta…" />
              ) : (
                <Button type="submit" variant="primary" fullWidth>
                  Criar conta
                </Button>
              )}
            </div>

            <p className="form-help" style={{ marginTop: 'var(--spacing-lg)' }}>
              Já tem uma conta?{' '}
              <button type="button" className="link-accent" onClick={() => navigate('/login')}>
                Faça login
              </button>
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
