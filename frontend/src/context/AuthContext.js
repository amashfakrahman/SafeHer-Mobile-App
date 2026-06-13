import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as authApi from '../api/authApi';
import { clearStoredSession, getStoredSession, setStoredSession } from '../services/authStorage';
import { isOfflineError } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionWarning, setSessionWarning] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const session = await getStoredSession();
        if (!session?.token) {
          return;
        }

        if (mounted) {
          setToken(session.token);
          if (session.user) {
            setUser(session.user);
          }
        }

        try {
          const profileResponse = await authApi.getProfile();
          if (mounted) {
            const nextUser = profileResponse.user;
            setUser(nextUser);
            setSessionWarning(null);
            await setStoredSession({ token: session.token, user: nextUser });
          }
        } catch (profileError) {
          if (session.user && isOfflineError(profileError)) {
            if (mounted) {
              setSessionWarning('You are using cached account data until the backend is reachable.');
            }
            return;
          }
          throw profileError;
        }
      } catch (_error) {
        await clearStoredSession();
        if (mounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (mounted) {
          setIsBootstrapping(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    setIsSubmitting(true);
    try {
      const response = await authApi.login(credentials);
      setUser(response.user);
      setToken(response.token);
      setSessionWarning(null);
      await setStoredSession(response);
      return response;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const register = useCallback(async (payload) => {
    setIsSubmitting(true);
    try {
      const response = await authApi.register(payload);
      setUser(response.user);
      setToken(response.token);
      setSessionWarning(null);
      await setStoredSession(response);
      return response;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const response = await authApi.getProfile();
    setUser(response.user);
    setSessionWarning(null);
    await setStoredSession({ token, user: response.user });
    return response.user;
  }, [token]);

  const updateProfile = useCallback(async (payload) => {
    setIsSubmitting(true);
    try {
      const updatedUser = await authApi.updateProfile(payload);
      setUser(updatedUser);
      await setStoredSession({ token, user: updatedUser });
      return updatedUser;
    } finally {
      setIsSubmitting(false);
    }
  }, [token]);

  const updateSettings = useCallback(async (payload) => {
    setIsSubmitting(true);
    try {
      const updatedUser = await authApi.updateSettings(payload);
      setUser(updatedUser);
      await setStoredSession({ token, user: updatedUser });
      return updatedUser;
    } finally {
      setIsSubmitting(false);
    }
  }, [token]);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    setSessionWarning(null);
    await clearStoredSession();
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isBootstrapping,
    isSubmitting,
    sessionWarning,
    login,
    register,
    logout,
    refreshProfile,
    updateProfile,
    updateSettings,
    setUser,
  }), [isBootstrapping, isSubmitting, login, logout, refreshProfile, register, sessionWarning, token, updateProfile, updateSettings, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
