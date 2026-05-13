import React, { createContext, useCallback, useMemo, useState, useEffect, useRef, type ReactNode } from 'react';
import { clearAllClientSession } from '../lib/browser-session';
import { EcondomizaApi } from '../services/api';

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

export const AuthSessionContext = createContext<AuthSessionValue & { actions: AuthSessionActions } | null>(null);

let refreshTimeoutId: ReturnType<typeof setTimeout> | null = null;

export const AuthSessionProvider: React.FC<AuthSessionProviderProps> = ({
  children,
  initialProfile,
  sessionTimeoutMs = DEFAULT_SESSION_TIMEOUT_MS,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile ?? null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loginCount, setLoginCount] = useState(0);
  const lastRefreshTime = useRef<Date | null>(null);

  // Persistir sessão no localStorage
  useEffect(() => {
    const storedProfile = localStorage.getItem('econdomiza_profile');
    const storedTokens = localStorage.getItem('econdomiza_tokens');
    const storedLoginCount = localStorage.getItem('econdomiza_login_count');

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
          handleLogout();
        } else {
          // Agendar refresh antes da expiração
          scheduleRefresh(remaining);
        }
      } catch (err) {
        console.error('Erro ao restaurar sessão:', err);
        handleLogout();
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const scheduleRefresh = useCallback(
    (remainingMs: number) => {
      if (refreshTimeoutId) {
        clearTimeout(refreshTimeoutId);
      }

      const thresholdMs = sessionTimeoutMs - REFRESH_THRESHOLD_MS;
      if (remainingMs > thresholdMs) {
        refreshTimeoutId = setTimeout(async () => {
          await handleRefreshToken();
        }, REFRESH_THRESHOLD_MS - remainingMs);
      }
    },
    [sessionTimeoutMs]
  );

  const handleRefreshToken = useCallback(async (): Promise<boolean> => {
    if (!tokens?.refreshToken) return false;

    try {
      setIsRefreshing(true);
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.refreshToken}`,
        },
      });

      if (response.ok) {
        const newTokensData = await response.json();
        const { accessToken, refreshToken: newRefreshToken, expiresIn, expiresAt, ...rest } = newTokensData;
        const expiresAtDate = new Date(Date.now() + expiresIn * 1000).toISOString();

        const nextRefresh = newRefreshToken || tokens.refreshToken;
        EcondomizaApi.setTokens(String(accessToken), nextRefresh != null ? String(nextRefresh) : undefined);

        setTokens({ accessToken, refreshToken: newRefreshToken || tokens.refreshToken, expiresIn, expiresAt: expiresAtDate });
        localStorage.setItem('econdomiza_tokens', JSON.stringify({ accessToken, refreshToken: newRefreshToken || tokens.refreshToken, expiresIn, expiresAt: expiresAtDate, ...rest }));

        lastRefreshTime.current = new Date();
        scheduleRefresh(expiresIn * 1000);

        return true;
      } else {
        // Refresh falhou, faça logout
        handleLogout();
        return false;
      }
    } catch (err) {
      console.error('Erro ao refresh token:', err);
      handleLogout();
      return false;
    } finally {
      setIsRefreshing(false);
      if (refreshTimeoutId) {
        clearTimeout(refreshTimeoutId);
        refreshTimeoutId = null;
      }
    }
  }, [tokens?.refreshToken, sessionTimeoutMs]);

  const handleLogout = useCallback(async () => {
    try {
      await EcondomizaApi.logout();
    } catch (err) {
      console.error('Erro ao logout no gateway:', err);
    }

    setProfile(null);
    setTokens(null);
    setLoginCount(0);
    clearAllClientSession();
    lastRefreshTime.current = null;

    if (refreshTimeoutId) {
      clearTimeout(refreshTimeoutId);
      refreshTimeoutId = null;
    }
  }, []);

  const handleLogin = useCallback(async (newProfile: UserProfile, newTokens: AuthTokens) => {
    setProfile(newProfile);
    setTokens(newTokens);
    setLoginCount((prev) => {
      const next = prev + 1;
      localStorage.setItem('econdomiza_login_count', String(next));
      return next;
    });
    localStorage.setItem('econdomiza_profile', JSON.stringify(newProfile));
    localStorage.setItem('econdomiza_tokens', JSON.stringify(newTokens));

    lastRefreshTime.current = new Date();
    const expiresAt = new Date(newTokens.expiresAt);
    scheduleRefresh(expiresAt.getTime() - Date.now());

    setIsLoading(false);
  }, [scheduleRefresh]);

  const handleUpdateProfile = useCallback((updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    localStorage.setItem('econdomiza_profile', JSON.stringify(updatedProfile));
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
      lastLogin: lastRefreshTime.current ? lastRefreshTime.current.toISOString() : null,
      loginCount,
      actions,
    }),
    [profile, tokens, isLoading, isRefreshing, lastRefreshTime.current, loginCount, actions]
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
};

export const useAuthSession = () => {
  const context = React.useContext(AuthSessionContext);

  if (!context) {
    throw new Error('useAuthSession must be used within an AuthSessionProvider');
  }

  return context;
};