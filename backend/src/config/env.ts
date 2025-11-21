import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  OTP_EXP_MINUTES: z.coerce.number().default(10),
  OTP_LENGTH: z.coerce.number().default(6),
  PLATFORM_FEE_BPS: z.coerce.number().min(0).default(200),
  HEDERA_LINKUP_CONTRACT_ID: z.string().optional(),
  ENCRYPTION_KEY: z.string().min(32, "ENCRYPTION_KEY must be at least 32 characters"),
  HEDERA_NETWORK: z.enum(["mainnet", "testnet", "previewnet"]).default("testnet"),
  HEDERA_KEY_TYPE: z.enum(["ED25519", "ECDSA"]).default("ECDSA"),
  HEDERA_OPERATOR_ID: z.string().optional(),
  HEDERA_OPERATOR_KEY: z.string().optional(),
  HEDERA_INITIAL_BALANCE_HBAR: z.coerce.number().default(1),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
});

export const env = envSchema.parse(process.env);
export const isProduction = env.NODE_ENV === "production";
