import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { DEFAULT_REGISTER_ROLE, type TenantRole } from '../../../domain/auth-roles';
import { TENANT_GUID_REGEX } from '../constants';

export interface RegisterFormData {
  tenantId: string;
  name: string;
  email: string;
  password: string;
  role: TenantRole;
}

export interface RegisterFormErrors {
  tenantId?: string;
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  general?: string;
}

export interface UseRegisterFormReturn {
  formData: RegisterFormData;
  errors: RegisterFormErrors;
  setFormData: Dispatch<SetStateAction<RegisterFormData>>;
  setErrors: Dispatch<SetStateAction<RegisterFormErrors>>;
  validate: () => boolean;
  resetForm: () => void;
  isFormValid: boolean;
  isEmailValid: boolean;
  isPasswordValid: boolean;
  isNameValid: boolean;
  hasCondominio: boolean;
  showAdvanced: boolean;
  setShowAdvanced: Dispatch<SetStateAction<boolean>>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const useRegisterForm = (): UseRegisterFormReturn => {
  const [formData, setFormData] = useState<RegisterFormData>({
    tenantId: '',
    name: '',
    email: '',
    password: '',
    role: DEFAULT_REGISTER_ROLE,
  });
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isEmailValid = useMemo(() => {
    return EMAIL_REGEX.test(formData.email);
  }, [formData.email]);

  const isPasswordValid = useMemo(() => {
    return formData.password.length >= 8;
  }, [formData.password]);

  const isNameValid = useMemo(() => {
    return formData.name.trim().length >= 3;
  }, [formData.name]);

  const hasCondominio = useMemo(() => {
    const tid = formData.tenantId.trim();
    return tid !== '' && TENANT_GUID_REGEX.test(tid);
  }, [formData.tenantId]);

  const isFormValid = useMemo(() => {
    return (
      hasCondominio && !!formData.email && isEmailValid && isPasswordValid && isNameValid && !!formData.role
    );
  }, [hasCondominio, formData.email, formData.role, isEmailValid, isPasswordValid, isNameValid]);

  const validate = useCallback((): boolean => {
    const newErrors: RegisterFormErrors = {};

    if (!hasCondominio) {
      newErrors.tenantId = 'Selecione um condomínio em Buscar.';
    }

    if (!formData.name || !isNameValid) {
      newErrors.name = 'Nome completo deve ter no mínimo 3 caracteres.';
    }

    if (!formData.email || !isEmailValid) {
      newErrors.email = 'E-mail é obrigatório e deve ser válido.';
    }

    if (!formData.password || !isPasswordValid) {
      newErrors.password = 'Senha deve ter no mínimo 8 caracteres.';
    }

    if (!formData.role) {
      newErrors.role = 'Selecione um perfil.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [
    formData.email,
    formData.name,
    formData.password,
    formData.role,
    hasCondominio,
    isEmailValid,
    isPasswordValid,
    isNameValid,
  ]);

  const resetForm = useCallback(() => {
    setFormData({
      tenantId: '',
      name: '',
      email: '',
      password: '',
      role: DEFAULT_REGISTER_ROLE,
    });
    setErrors({});
  }, []);

  return {
    formData,
    errors,
    setFormData,
    setErrors,
    validate,
    resetForm,
    isFormValid,
    isEmailValid,
    isPasswordValid,
    isNameValid,
    hasCondominio,
    showAdvanced,
    setShowAdvanced,
  };
};
