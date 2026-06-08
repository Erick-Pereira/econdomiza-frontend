import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { CondoRow } from '../../../lib/condominio-lookup';
import { formatApiError } from '../../../lib/api-error-message';
import { EcondomizaApi } from '../../../services';
import { useAuth } from '../../../context/AuthContext';
import { useLoginForm } from '../hooks/useLoginForm';
import { useEstablishGatewaySession } from '../hooks/useEstablishGatewaySession';
import { AUTH_COPY } from '../constants';
import { PRODUCT_COPY } from '../../../lib/product-copy';
import { CondominioPickerField } from './CondominioPickerField';
import { AuthScreenSwitch } from './AuthScreenSwitch';
import {
  Button,
  Input,
  PasswordInput,
  LoadingSpinner,
  FormError,
  FormSuccessMessage,
  SkeletonLoading,
} from '../../../components/ui';

function LoginSessionSkeleton() {
  return (
    <main className="login-shell" aria-busy="true" aria-label="A verificar sessão">
      <div className="login-shell__form-area w-full">
        <div className="login-page space-y-4">
          <SkeletonLoading size="lg" className="w-24 rounded-xl" />
          <SkeletonLoading size="md" className="w-full rounded-lg" />
          <SkeletonLoading size="md" className="w-full rounded-lg" />
          <SkeletonLoading size="md" className="w-full rounded-lg" />
        </div>
      </div>
    </main>
  );
}

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: sessionLoading } = useAuth();
  const { establishFromEnvelope } = useEstablishGatewaySession();
  const [condoLabel, setCondoLabel] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const locationMessage = (location.state as { message?: string } | null)?.message;

  const { formData, errors, setErrors, validate, hasCondominio, setFormData } = useLoginForm();

  useEffect(() => {
    if (!sessionLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [sessionLoading, isAuthenticated, navigate]);

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
      if (!hasCondominio) {
        setErrors((prev) => ({ ...prev, tenantId: AUTH_COPY.condominioRequired }));
        return;
      }

      setSubmitting(true);
      try {
        const loginRes = await EcondomizaApi.login(tid, formData.email.trim(), formData.password);
        const sessionResult = await establishFromEnvelope(loginRes.data);
        if (sessionResult.ok) {
          navigate('/dashboard', { replace: true });
          return;
        }
        setErrors((prev) => ({ ...prev, general: sessionResult.message }));
      } catch (err: unknown) {
        setErrors((prev) => ({ ...prev, general: formatApiError(err) }));
      } finally {
        setSubmitting(false);
      }
    },
    [
      validate,
      hasCondominio,
      formData.tenantId,
      formData.email,
      formData.password,
      establishFromEnvelope,
      navigate,
      setErrors,
    ]
  );

  if (sessionLoading) {
    return <LoginSessionSkeleton />;
  }

  return (
    <main className="login-shell" aria-labelledby="login-heading">
      <aside className="login-shell__brand" aria-hidden="true">
        <p className="login-shell__brand-kicker">{PRODUCT_COPY.brandKicker}</p>
        <h1 className="login-shell__brand-title">{PRODUCT_COPY.brandTitle}</h1>
        <p className="login-shell__brand-desc">
          Fiscalize gastos, conformidade e alertas do seu condomínio com clareza e rastreabilidade — sem
          complexidade de um ERP.
        </p>
        <div className="mt-8 flex items-center gap-2 text-sm text-white/80">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
          <span>Acesso seguro via gateway com perfis por condomínio</span>
        </div>
      </aside>

      <div className="login-shell__form-area">
        <div className="login-page">
          <div className="login-card">
            <img src="/logo-econdomiza.jpeg" alt="" className="logo-large md:hidden" aria-hidden />
            <h2 id="login-heading">Entrar</h2>
            <p id="login-intro" className="form-help login-intro">
              {PRODUCT_COPY.loginIntro}
            </p>

            {locationMessage && (
              <FormSuccessMessage className="auth-screen-success mb-4">{locationMessage}</FormSuccessMessage>
            )}

            <form
              onSubmit={(e) => void handleSubmit(e)}
              aria-describedby="login-intro"
              noValidate
              className="space-y-4"
            >
              <CondominioPickerField
                id="login-condo-summary"
                summaryLabel={summaryDisplay}
                error={errors.tenantId}
                helpText={PRODUCT_COPY.loginCondominioNote}
                selectedId={formData.tenantId.trim() || undefined}
                onSelect={onCondoPicked}
              />

              <Input
                label="E-mail"
                id="login-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                error={errors.email}
                autoComplete="username"
                required
                disabled={submitting}
                placeholder="seu@email.com"
                className="flex-1 min-w-0 w-full px-3 py-2 text-sm text-text-main bg-surface-background border border-surface-border rounded-lg shadow-atomic focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 transition-all duration-200 ease-in-out"
              />

              <PasswordInput
                label="Senha"
                id="login-password"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                error={errors.password}
                autoComplete="current-password"
                required
                disabled={submitting}
                placeholder="Digite sua senha"
                className="w-full"
              />

              {errors.general && <FormError className="auth-screen-error">{errors.general}</FormError>}

              <div className="form-actions pt-1">
                {submitting ? (
                  <LoadingSpinner fullWidth message="A entrar…" />
                ) : (
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    disabled={!hasCondominio}
                    size="lg"
                  >
                    Entrar
                  </Button>
                )}
              </div>

              <AuthScreenSwitch mode="login" />
            </form>
          </div>
        </div>
      </div>
    </main>
  );
};
