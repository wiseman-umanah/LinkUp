import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
};

const ACCESS_TTL_SECONDS = 60 * 15;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;

export function issueTokens(payload: Record<string, unknown>): TokenPair {
  const accessExpiresAt = new Date(Date.now() + ACCESS_TTL_SECONDS * 1000);
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);

  const accessToken = jwt.sign(
    { ...payload, exp: Math.floor(accessExpiresAt.getTime() / 1000) },
    env.JWT_ACCESS_SECRET
  );
  const refreshToken = jwt.sign(
    { ...payload, exp: Math.floor(refreshExpiresAt.getTime() / 1000) },
    env.JWT_REFRESH_SECRET
  );

  return { accessToken, refreshToken, accessExpiresAt, refreshExpiresAt };
}
