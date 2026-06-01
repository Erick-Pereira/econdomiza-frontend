/* eslint-disable react-refresh/only-export-components -- session context + hook + helpers */
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { clearAllClientSession, SESSION_STORAGE_KEYS } from '../lib/browser-session';
import { EcondomizaApi } from '../services';
import { useAuth } from './AuthContext';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  expiresAt: string;
}

export interface AuthSessionValue {
  profile: UserProfile | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  lastLogin: string | null;
  loginCount: number;
}

export interface AuthSessionActions {
  login: (profile: UserProfile, tokens: AuthTokens) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profile: UserProfile) => void;
  refreshToken: () => Promise<boolean>;
  clearSession: () => void;
}

export interface AuthSessionProviderProps {
  children: ReactNode;
  initialProfile?: UserProfile | null;
  sessionTimeoutMs?: number;
}

export const DEFAULT_SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 horas
export const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutos antes de expirar

export const AuthSessionContext = createContext<(AuthSessionValue & { actions: AuthSessionActions }) | null>(
  null
);

export const AuthSessionProvider: React.FC<AuthSessionProviderProps> = ({
  children,
  initialProfile,
  sessionTimeoutMs: _sessionTimeoutMs = DEFAULT_SESSION_TIMEOUT_MS,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile ?? null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loginCount, setLoginCount] = useState(0);
  /** Último login ou renovação bem-sucedida de tokens (ISO), para contexto sem refs em `useMemo`. */
  const [lastLoginAt, setLastLoginAt] = useState<string | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleRefreshTokenRef = useRef<() => Promise<boolean>>(async () => false);

  const handleLogout = useCallback(async () => {
    try {
      await EcondomizaApi.logout();
    } catch (err) {
      console.error('Erro ao logout no gateway:', err);
    }

    setProfile(null);
    setTokens(null);
    setLoginCount(0);
    setLastLoginAt(null);
    clearAllClientSession();

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  const scheduleRefresh = useCallback((remainingMs: number) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    if (remainingMs <= 0) return;

    if (remainingMs <= REFRESH_THRESHOLD_MS) {
      void handleRefreshTokenRef.current();
      return;
    }

    refreshTimeoutRef.current = setTimeout(() => {
      void handleRefreshTokenRef.current();
    }, remainingMs - REFRESH_THRESHOLD_MS);
  }, []);

  const handleRefreshToken = useCallback(async (): Promise<boolean> => {
    if (!tokens?.refreshToken) return false;

    /** `refreshSession` lê `GATEWAY_TOKEN_KEYS`; estado espelhado em `SESSION_STORAGE_KEYS.tokens`. */
    EcondomizaApi.setTokens(tokens.accessToken, tokens.refreshToken);

    try {
      setIsRefreshing(true);
      const ok = await EcondomizaApi.refreshSession();
      if (!ok) {
        await handleLogout();
        return false;
      }

      const accessToken = EcondomizaApi.getToken();
      if (!accessToken) {
        await handleLogout();
        return false;
      }

      const refreshNext = EcondomizaApi.getRefreshToken() || undefined;
      const expiresIn = 3600;
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
      const next: AuthTokens = {
        accessToken,
        refreshToken: refreshNext ?? tokens.refreshToken,
        expiresIn,
        expiresAt,
      };

      setTokens(next);
      localStorage.setItem(SESSION_STORAGE_KEYS.tokens, JSON.stringify(next));
      setLastLoginAt(new Date().toISOString());
      scheduleRefresh(expiresIn * 1000);

      return true;
    } catch (err) {
      console.error('Erro ao refresh token:', err);
      await handleLogout();
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [tokens, scheduleRefresh, handleLogout]);

  useEffect(() => {
    handleRefreshTokenRef.current = handleRefreshToken;
  }, [handleRefreshToken]);

  // Persistir sessão no localStorage
  useEffect(() => {
    const storedProfile = localStorage.getItem(SESSION_STORAGE_KEYS.profile);
    const storedTokens = localStorage.getItem(SESSION_STORAGE_KEYS.tokens);
    const storedLoginCount = localStorage.getItem(SESSION_STORAGE_KEYS.loginCount);

    if (storedProfile && storedTokens && storedLoginCount) {
      try {
        const parsedProfile = JSON.parse(storedProfile) as UserProfile;
        const parsedTokens = JSON.parse(storedTokens) as AuthTokens;
        const parsedLoginCount = parseInt(storedLoginCount, 10) || 0;

        setProfile(parsedProfile);
        setTokens(parsedTokens);
        setLoginCount(parsedLoginCount);
        EcondomizaApi.setTokens(parsedTokens.accessToken, parsedTokens.refreshToken);
        setIsLoading(false);

        // Verificar se a sessão expirou
        const now = new Date();
        const expiresAt = new Date(parsedTokens.expiresAt);
        const remaining = expiresAt.getTime() - now.getTime();

        if (remaining <= 0) {
          void handleLogout();
        } else {
          // Agendar refresh antes da expiração
          scheduleRefresh(remaining);
        }
      } catch (err) {
        console.error('Erro ao restaurar sessão:', err);
        void handleLogout();
      }
    } else {
      setIsLoading(false);
    }
  }, [handleLogout, scheduleRefresh]);

  const handleLogin = useCallback(
    async (newProfile: UserProfile, newTokens: AuthTokens) => {
      setProfile(newProfile);
      setTokens(newTokens);
      setLoginCount((prev) => {
        const next = prev + 1;
        localStorage.setItem(SESSION_STORAGE_KEYS.loginCount, String(next));
        return next;
      });
      localStorage.setItem(SESSION_STORAGE_KEYS.profile, JSON.stringify(newProfile));
      localStorage.setItem(SESSION_STORAGE_KEYS.tokens, JSON.stringify(newTokens));

      setLastLoginAt(new Date().toISOString());
      const expiresAt = new Date(newTokens.expiresAt);
      scheduleRefresh(expiresAt.getTime() - Date.now());

      setIsLoading(false);
    },
    [scheduleRefresh]
  );

  const handleUpdateProfile = useCallback((updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    localStorage.setItem(SESSION_STORAGE_KEYS.profile, JSON.stringify(updatedProfile));
  }, []);

  const actions = useMemo(
    () => ({
      login: handleLogin,
      logout: handleLogout,
      updateProfile: handleUpdateProfile,
      refreshToken: handleRefreshToken,
      clearSession: handleLogout,
    }),
    [handleLogin, handleLogout, handleUpdateProfile, handleRefreshToken]
  );

  const value = useMemo(
    () => ({
      profile,
      tokens,
      isAuthenticated: !!profile && !!tokens,
      isLoading,
      isRefreshing,
      lastLogin: lastLoginAt,
      loginCount,
      actions,
    }),
    [profile, tokens, isLoading, isRefreshing, lastLoginAt, loginCount, actions]
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
};

/** @deprecated Prefer `useAuth` — alias para compatibilidade com páginas legadas. */
export const useAuthSession = () => useAuth();
