import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { SellerModel, type SellerDocument } from "../models/Seller.js";

export interface AuthenticatedRequest extends Request {
  seller?: SellerDocument;
  accessToken?: string;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string };
    const seller = await SellerModel.findById(payload.sub);
    if (!seller) return res.status(401).json({ error: "Unauthorized" });
    req.seller = seller;
    req.accessToken = token;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

function extractToken(req: Request) {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}
