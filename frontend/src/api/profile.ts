import { api } from "./client";
import type { SellerProfile } from "./auth";

export async function getProfile() {
  const { data } = await api.get<{ profile: SellerProfile }>("/profile");
  return data.profile;
}

export async function updateProfile(payload: { businessName?: string; country?: string }) {
  const { data } = await api.patch<{ profile: SellerProfile }>("/profile", payload);
  return data.profile;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const { data } = await api.patch<{ message: string }>("/profile/password", {
    currentPassword,
    newPassword,
  });
  return data;
}
