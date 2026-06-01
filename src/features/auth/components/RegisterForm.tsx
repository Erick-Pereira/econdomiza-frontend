import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { CondoRow } from '../../../lib/condominio-lookup';
import { formatApiError } from '../../../lib/api-error-message';
import { EcondomizaApi } from '../../../services';
import { useAuth } from '../../../context/AuthContext';
import { useRegisterForm } from '../hooks/useRegisterForm';
import { useEstablishGatewaySession } from '../hooks/useEstablishGatewaySession';
import { isTenantRole, REGISTER_ROLE_OPTIONS, type TenantRole } from '../../../domain/auth-roles';
import { AUTH_COPY, isValidTenantGuid } from '../constants';
import { PRODUCT_COPY } from '../../../lib/product-copy';
import { CondominioPickerField } from './CondominioPickerField';
import {
  Button,
  Input,
  PasswordInput,
  LoadingSpinner,
  FormError,
  Select,
  SkeletonLoading,
} from '../../../components/ui';

export interface RegisterFormProps {
  defaultTenantId?: string;
  onRegisterError?: (error: string) => void;
}

function RegisterSessionSkeleton() {
  return (
    <main className="login-shell" aria-busy="true">
      <div className="login-shell__form-area w-full">
        <div className="login-page space-y-4">
          <SkeletonLoading size="lg" className="w-32 rounded-lg" />
          <SkeletonLoading size="md" className="w-full rounded-lg" />
        </div>
      </div>
    </main>
  );
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ defaultTenantId, onRegisterError }) => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: sessionLoading } = useAuth();
  const { establishFromEnvelope } = useEstablishGatewaySession();
  const [condoLabel, setCondoLabel] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { formData, errors, setErrors, validate, showAdvanced, setShowAdvanced, setFormData } =
    useRegisterForm();

  useEffect(() => {
    if (!sessionLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [sessionLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (defaultTenantId) {
      const tid = defaultTenantId.trim();
      if (isValidTenantGuid(tid)) {
        setCondoLabel(null);
        setFormData((prev) => ({ ...prev, tenantId: tid }));
      }
    }
  }, [defaultTenantId, setFormData]);

  const summaryDisplay = useMemo(() => condoLabel?.trim() || null, [condoLabel]);

  const onCondoPicked = useCallback(
    (row: CondoRow) => {
      setErrors((prev) => ({ ...prev, tenantId: undefined }));
      setCondoLabel(row.label);
      setFormData((prev) => ({ ...prev, tenantId: row.id }));
    },
    [setFormData, setErrors]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrors({});
      if (!validate()) return;

      const tid = formData.tenantId.trim();
      if (!isValidTenantGuid(tid)) {
        setErrors((prev) => ({ ...prev, tenantId: AUTH_COPY.tenantRequired }));
        return;
      }

      setSubmitting(true);
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
        onRegisterError?.(errorMessage);
        setErrors((prev) => ({ ...prev, general: errorMessage }));
      } finally {
        setSubmitting(false);
      }
    },
    [validate, formData, establishFromEnvelope, navigate, onRegisterError, setErrors]
  );

  if (sessionLoading) return <RegisterSessionSkeleton />;

  return (
    <main className="login-shell" aria-labelledby="register-heading">
      <aside className="login-shell__brand" aria-hidden="true">
        <p className="login-shell__brand-kicker">{PRODUCT_COPY.brandKicker}</p>
        <h1 className="login-shell__brand-title">Criar conta</h1>
        <p className="login-shell__brand-desc">{PRODUCT_COPY.registerIntro}</p>
        <div className="mt-8 flex items-center gap-2 text-sm text-white/80">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
          <span>Perfil validado pelo administrador do condomínio</span>
        </div>
      </aside>

      <div className="login-shell__form-area">
        <div className="login-page">
          <div className="login-card">
            <h2 id="register-heading">Registar</h2>
            <p id="register-intro" className="form-help login-intro">
              {PRODUCT_COPY.registerCondominioNote}
            </p>

            <form
              onSubmit={(e) => void handleSubmit(e)}
              aria-describedby="register-intro"
              noValidate
              className="space-y-4"
            >
              <CondominioPickerField
                summaryLabel={summaryDisplay}
                error={errors.tenantId}
                helpText={PRODUCT_COPY.registerCondominioNote}
                selectedId={formData.tenantId.trim() || undefined}
                onSelect={onCondoPicked}
              />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced((s) => !s)}
                aria-expanded={showAdvanced}
              >
                {showAdvanced ? 'Ocultar tenant ID' : 'Tenant ID (avançado)'}
              </Button>

              {showAdvanced && (
                <Input
                  label="Tenant ID (GUID)"
                  id="tenantId"
                  value={formData.tenantId}
                  onChange={(e) => {
                    setCondoLabel(null);
                    setFormData((prev) => ({ ...prev, tenantId: e.target.value }));
                  }}
                  error={errors.tenantId}
                  autoComplete="off"
                  helperText="Uso operacional (suporte)."
                />
              )}

              <Input
                label="Nome completo"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                error={errors.name}
                autoComplete="name"
                required
              />

              <Input
                label="E-mail"
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                error={errors.email}
                autoComplete="username"
                required
                helperText={PRODUCT_COPY.registerEmailHelp}
              />

              <PasswordInput
                label="Senha"
                id="password"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                error={errors.password}
                autoComplete="new-password"
                required
                helperText="Mínimo 8 caracteres"
              />

              <Select
                label="Perfil"
                id="role-select"
                value={formData.role}
                options={[]}
                onChange={(e) => {
                  const v = e.target.value;
                  if (isTenantRole(v)) setFormData((prev) => ({ ...prev, role: v as TenantRole }));
                }}
              >
                {REGISTER_ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-text-muted">
                {REGISTER_ROLE_OPTIONS.find((r) => r.value === formData.role)?.helper}
              </p>

              {errors.general && <FormError className="auth-screen-error">{errors.general}</FormError>}

              <div className="form-actions pt-1">
                {submitting ? (
                  <LoadingSpinner fullWidth message="A criar conta…" />
                ) : (
                  <Button type="submit" variant="primary" fullWidth size="lg">
                    Criar conta
                  </Button>
                )}
              </div>

              <p className="form-help auth-screen-switch">
                Já tem conta?{' '}
                <Link to="/login" className="link-accent">
                  Faça login
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
};
