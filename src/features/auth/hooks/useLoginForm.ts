import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { TENANT_GUID_REGEX } from '../constants';

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

export const useLoginForm = (): {
  formData: LoginFormData;
  errors: FormErrors;
  showAdvanced: boolean;
  setFormData: Dispatch<SetStateAction<LoginFormData>>;
  setErrors: Dispatch<SetStateAction<FormErrors>>;
  setShowAdvanced: Dispatch<SetStateAction<boolean>>;
  validate: () => boolean;
  resetForm: () => void;
  isFormValid: boolean;
  isEmailValid: boolean;
  isPasswordValid: boolean;
  hasCondominio: boolean;
} => {
  const [formData, setFormData] = useState<LoginFormData>({
    tenantId: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isEmailValid = useMemo(() => {
    const email = formData.email;
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, [formData.email]);

  const isPasswordValid = useMemo(() => {
    const pwd = formData.password;
    return pwd.length >= 8;
  }, [formData.password]);

  const hasCondominio = useMemo(() => {
    const tid = formData.tenantId.trim();
    if (!tid) return false;
    return TENANT_GUID_REGEX.test(tid);
  }, [formData.tenantId]);

  const isFormValid = useMemo(() => {
    return hasCondominio && !!formData.email && !!formData.password;
  }, [formData.email, formData.password, formData.tenantId, hasCondominio]);

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.tenantId) {
      newErrors.tenantId = 'Selecione um condomínio ou informe um Tenant ID válido.';
    } else {
      const tid = formData.tenantId.trim();
      if (!TENANT_GUID_REGEX.test(tid)) {
        newErrors.tenantId = 'Tenant ID inválido. Use o modal de busca.';
      }
    }

    if (!formData.email) {
      newErrors.email = 'E-mail é obrigatório.';
    } else if (!isEmailValid) {
      newErrors.email = 'Insira um e-mail válido.';
    }

    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória.';
    } else if (!isPasswordValid) {
      newErrors.password = 'A senha deve ter no mínimo 8 caracteres.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData.tenantId, formData.email, formData.password, isEmailValid, isPasswordValid]);

  const resetForm = useCallback(() => {
    setFormData({
      tenantId: '',
      email: '',
      password: '',
    });
    setErrors({});
    setShowAdvanced(false);
  }, []);

  useEffect(() => {
    validate();
  }, [formData.tenantId, formData.email, formData.password, validate]);

  return {
    formData,
    errors,
    showAdvanced,
    setFormData,
    setErrors,
    setShowAdvanced,
    validate,
    resetForm,
    isFormValid,
    isEmailValid,
    isPasswordValid,
    hasCondominio,
  };
};