import bcrypt from "bcrypt";
import { SessionModel } from "../models/Session.js";
import { issueTokens, type TokenPair } from "../utils/tokens.js";

export async function startSession(params: { sellerId: string; userAgent?: string }) {
  const tokens = issueTokens({ sub: params.sellerId });
  const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 12);
  await SessionModel.create({
    sellerId: params.sellerId,
    refreshTokenHash,
    userAgent: params.userAgent,
    expiresAt: tokens.refreshExpiresAt,
  });
  return tokens;
}

export async function rotateSession(refreshToken: string): Promise<TokenPair | null> {
  const sessions = await SessionModel.find().exec();
  for (const session of sessions) {
    const matches = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (!matches) continue;
    if (session.expiresAt.getTime() < Date.now()) {
      await session.deleteOne();
      return null;
    }
    await session.deleteOne();
    return startSession({
      sellerId: session.sellerId.toString(),
      userAgent: session.userAgent ?? undefined,
    });
  }
  return null;
}

export async function revokeSession(refreshToken: string) {
  const sessions = await SessionModel.find().exec();
  for (const session of sessions) {
    const matches = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (matches) {
      await session.deleteOne();
      break;
    }
  }
}
