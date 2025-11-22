import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AuthSuccessResponse,
  AuthTokens,
  LoginStartResponse,
  OtpResponse,
  SellerProfile,
  SignupPayload,
  SignupResponse,
  VerifySignupPayload,
} from "../api/auth";
import {
  login as apiLogin,
  logout as apiLogout,
  refresh as apiRefresh,
  requestLoginOtp as apiRequestLoginOtp,
  requestPasswordReset as apiRequestPasswordReset,
  resendOtp as apiResendOtp,
  resetPassword as apiResetPassword,
  signup as apiSignup,
  verifyLoginOtp as apiVerifyLoginOtp,
  verifySignup as apiVerifySignup,
} from "../api/auth";
import { updateProfile as apiUpdateProfile } from "../api/profile";
import { configureAuth, clearTokens } from "../api/client";
import { clearAuth, loadAuth, saveAuth, toStoredAuth } from "../utils/authStorage";

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

type AuthContextValue = {
  seller: SellerProfile | null;
  tokens: AuthTokens | null;
  loading: boolean;
  seedPhrase: string | null;
  acknowledgeSeedPhrase: () => void;
  loginWithPassword: (email: string, password: string) => Promise<LoginStartResponse>;
  logout: () => void;
  refreshTokens: () => Promise<AuthTokens | null>;
  setAuth: (auth: AuthSuccessResponse) => void;
  patchSeller: (partial: Partial<SellerProfile>) => void;
  updateProfile: (payload: { businessName?: string; country?: string }) => Promise<SellerProfile>;
  signup: (payload: SignupPayload) => Promise<SignupResponse>;
  verifySignup: (payload: VerifySignupPayload) => Promise<AuthSuccessResponse>;
  resendSignupOtp: (email: string) => Promise<OtpResponse>;
  requestLoginOtp: (email: string) => Promise<OtpResponse>;
  verifyLoginOtp: (email: string, code: string) => Promise<AuthSuccessResponse>;
  requestPasswordReset: (email: string) => Promise<OtpResponse>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<AuthSuccessResponse | { message: string }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [loading, setLoading] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const initialRefreshAttempted = useRef(false);

  useEffect(() => {
    const { seller: storedSeller, tokens: storedTokens } = loadAuth();
    setSeller(storedSeller ?? null);
    setTokens(storedTokens ?? null);
    setHydrated(true);
  }, []);

  const persistAuth = useCallback((nextSeller: SellerProfile | null, nextTokens: AuthTokens | null) => {
    setSeller(nextSeller);
    setTokens(nextTokens);
    try {
      saveAuth({ seller: nextSeller, tokens: nextTokens });
    } catch {
      /* ignore storage issues */
    }
  }, []);

  const acknowledgeSeedPhrase = useCallback(() => setSeedPhrase(null), []);

  const setAuth = useCallback(
    (response: AuthSuccessResponse) => {
      const stored = toStoredAuth(response);
      persistAuth(stored.seller, stored.tokens);
      if (response.walletSeedPhrase) {
        setSeedPhrase(response.walletSeedPhrase);
      }
    },
    [persistAuth]
  );

  const patchSeller = useCallback(
    (partial: Partial<SellerProfile>) => {
      setSeller((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...partial };
        try {
          saveAuth({ seller: next, tokens });
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [tokens]
  );

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      return await apiLogin(email, password);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    const refreshToken = tokens?.refreshToken;
    persistAuth(null, null);
    try {
      clearAuth();
    } catch {
      /* ignore */
    }
    clearTokens();
    if (refreshToken) {
      apiLogout(refreshToken).catch(() => undefined);
    }
  }, [persistAuth, tokens]);

  const refreshTokens = useCallback(async (): Promise<AuthTokens | null> => {
    const refreshToken = tokens?.refreshToken ?? loadAuth().tokens?.refreshToken ?? null;
    if (!refreshToken) return null;
    try {
      const res = await apiRefresh(refreshToken);
      const nextTokens = res.tokens;
      persistAuth(seller, nextTokens);
      return nextTokens;
    } catch {
      return null;
    }
  }, [tokens, seller, persistAuth]);

  const refreshProxy = useCallback(async () => {
    const refreshed = await refreshTokens();
    if (!refreshed) return null;
    return {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
    };
  }, [refreshTokens]);

  useEffect(() => {
    configureAuth(
      { accessToken: tokens?.accessToken ?? null, refreshToken: tokens?.refreshToken ?? null },
      { refresh: refreshProxy, onAuthFailure: logout }
    );
  }, [tokens?.accessToken, tokens?.refreshToken, refreshProxy, logout]);

  useEffect(() => {
    if (!hydrated || initialRefreshAttempted.current) return;
    initialRefreshAttempted.current = true;
    if (!tokens?.refreshToken) return;
    refreshTokens();
  }, [hydrated, tokens?.refreshToken, refreshTokens]);

  const updateProfile = useCallback(
    async (payload: { businessName?: string; country?: string }) => {
      const profile = await apiUpdateProfile(payload);
      persistAuth(profile, tokens);
      return profile;
    },
    [tokens, persistAuth]
  );

  const signup = useCallback(async (payload: SignupPayload) => {
    setLoading(true);
    try {
      return await apiSignup(payload);
    } finally {
      setLoading(false);
    }
  }, []);

  const verifySignup = useCallback(
    async (payload: VerifySignupPayload) => {
      setLoading(true);
      try {
        const response = await apiVerifySignup(payload);
        setAuth(response);
        return response;
      } finally {
        setLoading(false);
      }
    },
    [setAuth]
  );

  const resendSignupOtp = useCallback(async (email: string) => {
    setLoading(true);
    try {
      return await apiResendOtp(email, "signup");
    } finally {
      setLoading(false);
    }
  }, []);

  const requestLoginOtp = useCallback(async (email: string) => {
    setLoading(true);
    try {
      return await apiRequestLoginOtp(email);
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyLoginOtp = useCallback(
    async (email: string, code: string) => {
      setLoading(true);
      try {
        const response = await apiVerifyLoginOtp(email, code);
        setAuth(response);
        return response;
      } finally {
        setLoading(false);
      }
    },
    [setAuth]
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    setLoading(true);
    try {
      return await apiRequestPasswordReset(email);
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      setLoading(true);
      try {
        const response = await apiResetPassword(email, code, newPassword);
        if ("tokens" in response && response.tokens) {
          setAuth(response as AuthSuccessResponse);
        }
        return response;
      } finally {
        setLoading(false);
      }
    },
    [setAuth]
  );

  const value = useMemo(
    () => ({
      seller,
      tokens,
      loading,
      seedPhrase,
      acknowledgeSeedPhrase,
      loginWithPassword,
      logout,
      refreshTokens,
      setAuth,
      patchSeller,
      updateProfile,
      signup,
      verifySignup,
      resendSignupOtp,
      requestLoginOtp,
      verifyLoginOtp,
      requestPasswordReset,
      resetPassword,
    }),
    [
      seller,
      tokens,
      loading,
      seedPhrase,
      acknowledgeSeedPhrase,
      loginWithPassword,
      logout,
      refreshTokens,
      setAuth,
      patchSeller,
      updateProfile,
      signup,
      verifySignup,
      resendSignupOtp,
      requestLoginOtp,
      verifyLoginOtp,
      requestPasswordReset,
      resetPassword,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
