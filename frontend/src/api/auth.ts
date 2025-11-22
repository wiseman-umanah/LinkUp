import { api } from "./client";

export type SignupPayload = {
  email: string;
  password: string;
  businessName: string;
  country?: string;
  address?: string | null;
};

export type SignupResponse = {
  message: string;
  otpExpiresAt: string;
};

export type VerifySignupPayload = {
  email: string;
  code: string;
};

export type AuthTokens = {
  accessToken: string;
  accessExpiresAt: string;
  refreshToken: string;
  refreshExpiresAt: string;
};

export type SellerProfile = {
  id: string;
  email: string;
  businessName: string;
  country: string;
  walletAccountId: string | null;
  walletNetwork: string | null;
  address?: string | null;
  joinedAt: string;
  verifiedAt?: string | null;
};

export type AuthSuccessResponse = {
  message: string;
  seller: SellerProfile;
  tokens: AuthTokens;
  walletSeedPhrase?: string | null;
};

export type LoginStartResponse = {
  message: string;
  otpExpiresAt: string;
};

export type OtpResponse = {
  message: string;
  otpExpiresAt: string;
};

export async function signup(payload: SignupPayload) {
  const { data } = await api.post<SignupResponse>("/auth/signup", payload);
  return data;
}

export async function verifySignup(payload: VerifySignupPayload) {
  const { data } = await api.post<AuthSuccessResponse>("/auth/signup/verify", payload);
  return data;
}

export async function resendOtp(email: string, purpose: "signup" | "login" | "reset") {
  const { data } = await api.post<{ message: string; otpExpiresAt: string }>("/auth/otp/resend", {
    email,
    purpose,
  });
  return data;
}

export async function login(email: string, password: string) {
  const { data } = await api.post<LoginStartResponse>("/auth/login", { email, password });
  return data;
}

export async function requestLoginOtp(email: string) {
  const { data } = await api.post<OtpResponse>("/auth/login/otp/request", { email });
  return data;
}

export async function verifyLoginOtp(email: string, code: string) {
  const { data } = await api.post<AuthSuccessResponse>("/auth/login/otp/verify", { email, code });
  return data;
}

export async function requestPasswordReset(email: string) {
  const { data } = await api.post<OtpResponse>("/auth/password/request", { email });
  return data;
}

export async function resetPassword(email: string, code: string, newPassword: string) {
  const { data } = await api.post<AuthSuccessResponse>("/auth/password/reset", {
    email,
    code,
    newPassword,
  });
  return data;
}

export async function logout(refreshToken: string) {
  const { data } = await api.post<{ message: string }>("/auth/logout", { refreshToken });
  return data;
}

export async function refresh(refreshToken: string) {
  const { data } = await api.post<{ tokens: AuthTokens }>("/auth/refresh", { refreshToken });
  return data;
}
