# LinkUp Backend

The LinkUp backend is a TypeScript/Express API that powers merchant onboarding, wallet management, OTP-based auth, and Hedera account provisioning. It stores merchant data in MongoDB via Mongoose, encrypts custodial secrets, emits OTP emails, and exposes the REST routes consumed by the frontend dashboard and later webhook integrations.

## Prerequisites
- Node.js 20+
- pnpm 8+
- MongoDB 6+ (local or Atlas)
- Hedera operator credentials (testnet/mainnet) if you want real on-chain wallets
- SMTP credentials for OTP delivery (or rely on console logs in development)
- Optional: Cloudinary & Pinata keys (receipts/metadata hooks will use them later)

## Installation
```bash
pnpm install
```

## Scripts
| Command        | Purpose                                                         |
|----------------|-----------------------------------------------------------------|
| `pnpm dev`     | Run the server with `ts-node-dev` (auto-reload, TypeScript)     |
| `pnpm build`   | Compile TypeScript to `dist/`                                   |
| `pnpm start`   | Run the compiled server (`node dist/index.js`)                  |

The HTTP server listens on `PORT` (default `4000`). Entry file: `src/index.ts`.

## Environment variables
Create `backend/.env` with the following keys (all strings unless noted):

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development` \| `production` |
| `PORT` | HTTP port (default `4000`) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | 32+ char secret for short-lived access tokens |
| `JWT_REFRESH_SECRET` | 32+ char secret for refresh tokens |
| `ENCRYPTION_KEY` | 32+ char key used to AES-encrypt private keys/mnemonics |
| `OTP_LENGTH` | Digits per OTP (default 6) |
| `OTP_EXP_MINUTES` | OTP expiry window (default 10) |
| `HEDERA_NETWORK` | `testnet` \| `previewnet` \| `mainnet` |
| `HEDERA_KEY_TYPE` | `ECDSA` (default) or `ED25519` for generated wallets |
| `HEDERA_OPERATOR_ID` | Operator account ID (numeric format e.g. `0.0.1234`) |
| `HEDERA_OPERATOR_KEY` | Operator private key (DER string – typically `302e...`) |
| `HEDERA_INITIAL_BALANCE_HBAR` | Initial balance for merchant accounts (number, default `1`) |
| `HEDERA_LINKUP_CONTRACT_ID` | Deployed LinkUp contract ID (e.g., `0.0.123456`) |
| `PLATFORM_FEE_BPS` | Platform fee in basis points for payment links (default `200`, i.e. 2%) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | SMTP settings (optional; when omitted OTP codes are logged to the console) |

Optional future integrations (Cloudinary, Pinata, etc.) can add their own env keys; the config module (`src/config/env.ts`) will validate everything required at boot.

## What the backend does
1. **Seller onboarding** (`POST /auth/signup`)  
   - Validates business name/email uniqueness.  
   - Generates a Hedera custodial wallet (ECDSA by default) and stores the encrypted private key + mnemonic.  
   - Sends an OTP to the seller’s email.

2. **OTP verification** (`POST /auth/signup/verify`)  
   - Confirms the code, marks the seller as verified, issues JWT access/refresh tokens, and returns the wallet seed phrase (mnemonic only; private key is never returned).

3. **Login flows**  
   - Password + OTP, or OTP-only. Tokens are issued only after OTP verification. Refresh tokens are persisted in Mongo for revocation/rotation.

4. **Password reset**  
   - OTP-driven; setting a new password also logs the seller in (new token pair).

5. **Wallet management**  
   - Wallets are created on Hedera using the provided operator credentials. If `HEDERA_OPERATOR_ID/KEY` are missing, creation falls back to stub mode (useful for local dev).

## Project structure
```
backend/
├── src/
│   ├── index.ts          # entry point: connect Mongo + start Express
│   ├── app.ts            # Express app, middleware, routes
│   ├── config/env.ts     # zod-powered env parsing/validation
│   ├── lib/              # Hedera client helper, Mongo connector, logger
│   ├── models/           # Mongoose schemas (Seller, OtpCode, Session)
│   ├── services/         # Auth, seller, wallet, OTP, email logic
│   ├── routes/           # Express routers (auth, health)
│   ├── middleware/       # Auth guard, etc.
│   └── utils/            # Encryption, OTP, token helpers
└── package.json
```

## Key routes
### Auth
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/signup` | Start onboarding, create Hedera wallet, send OTP |
| `POST` | `/auth/signup/verify` | Verify OTP, issue tokens, return seed phrase |
| `POST` | `/auth/login` | Password login (always requires OTP) |
| `POST` | `/auth/login/otp/request` | OTP-only login request |
| `POST` | `/auth/login/otp/verify` | Verify login OTP, issue tokens |
| `POST` | `/auth/password/request` | Send reset OTP |
| `POST` | `/auth/password/reset` | Validate OTP, set new password, issue tokens |
| `POST` | `/auth/refresh` | Rotate tokens with a refresh token |
| `POST` | `/auth/logout` | Revoke a refresh token |

### Payments & Transactions
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/payments` | List the authenticated seller’s payment links |
| `POST` | `/payments` | Create a payment link (name, slug, price, custom message, base64 image) |
| `DELETE` | `/payments/:id` | Deactivate a payment link (store optional blockchain tx id) |
| `GET` | `/public/payments/:slug` | Public lookup for checkout pages |
| `POST` | `/public/payments/:id/transactions` | Record a payment transaction (used by the checkout) |
| `GET` | `/transactions` | List recorded transactions for the seller |
| `GET` | `/health` | Basic status endpoint |

### Wallet
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/wallet/import` | Replace the custodial wallet by importing a mnemonic + account ID |

Authenticated routes require `Authorization: Bearer <accessToken>`. Refresh/Logout take the refresh token in the JSON body.

## Running locally
1. Start MongoDB (e.g., `mongod` or Docker).
2. Copy `.env.example` → `.env` (or create one) and fill in secrets. For testnet wallets:  
   ```ini
   HEDERA_NETWORK=testnet
   HEDERA_OPERATOR_ID=0.0.xxxxx   # no checksum suffix
   HEDERA_OPERATOR_KEY=302e020100...
   ```
3. Install dependencies: `pnpm install`
4. Start in dev mode: `pnpm dev`
5. Use Postman or Thunder Client to exercise the `/auth/*` endpoints. OTPs are logged if SMTP isn’t configured.

## Production tips
- Use MongoDB Atlas with TLS and strong credentials.
- Store JWT/Encryption secrets in your secrets manager.
- Run `pnpm build && pnpm start` behind a process manager (PM2, systemd) or deploy the compiled `dist/` folder to your hosting provider.
- Monitor Hedera operator balance; account creation fees are paid from the operator account.

That’s it—this service gives the frontend everything it needs to onboard merchants, provision Hedera accounts, and manage OTP-based access securely. Add additional routes (payments, receipts, etc.) on top of this foundation as the Hedera migration progresses.
