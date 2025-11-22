## LinkUp Hardhat Package

This folder contains the Solidity LinkUp contract used on Hedera along with Hardhat scripts. (Legacy Flow Cadence files are preserved for reference.)

## Project structure
```
smart-contract/
├── contracts/LinkUp.sol
├── scripts/deploy.ts                  # Deploys LinkUp + ReceiptNFT to Hedera JSON-RPC
├── scripts/testCreatePayment.ts       # Tests createPayment on local Hardhat network
├── hardhat.config.ts
└── ...
```

## Prerequisites
- Node.js 20+
- pnpm 8+
- Hardhat (`pnpm dlx hardhat --help`)

## Configure accounts
Update `flow.json` with your deployment and account keys:
```json
{
  "accounts": {
    "emulator-account": {
      "address": "f8d6e0586b0a20c7",
      "key": "..."
    },
    "platform-treasury": {
      "address": "01cf0e2f2f715450",
      "key": "..."
    }
  },
  "deployments": {
    "emulator": {
      "emulator-account": ["WalPay"]
    }
  }
}
```

The contract initializer takes two arguments:
1. `platformTreasury (Address)` – receives platform fees (FlowToken receiver capability must exist).
2. `platformFeeBps (UFix64)` – percentage fee (e.g. `2.0` for 2%). Keep this aligned with `PLATFORM_FEE_PERCENT`.

## Local Hardhat test
Start a local Hardhat node:
```bash
pnpm dlx hardhat node
```
In another terminal, run the scripted test:
```bash
pnpm --filter hedera-contract hardhat run scripts/testCreatePayment.ts --network localhost
```
This deploys LinkUp to the in-memory Hardhat network and calls `createPayment(...)` with a random slug so you can exercise contract logic without touching Hedera.

## Useful commands
Create a payment (seller-signed):
```bash
flow transactions send cadence/transactions/create_payment.cdc \
  --args-json '[{"type":"String","value":"payment-123"},{"type":"UFix64","value":"10.0"}]' \
  --signer seller-account
```

Pay for a link:
```bash
flow transactions send cadence/transactions/pay.cdc \
  --args-json '[
    {"type":"String","value":"payment-123"},
    {"type":"UFix64","value":"10.2"},
    {"type":"Optional","value":{"type":"String","value":"order-456"}}
  ]' \
  --signer buyer-account
```

Deactivate a link:
```bash
flow transactions send cadence/transactions/deactivate_payment.cdc \
  --args-json '[{"type":"String","value":"payment-123"}]' \
  --signer seller-account
```

Read seller earnings:
```bash
flow scripts execute cadence/scripts/get_seller_earnings.cdc \
  --args-json '[{"type":"Address","value":"0xSellerAddress"}]'
```

## Integration notes
- The frontend wraps the transactions in `frontend/src/flow/walpay.ts`. Keep argument order/types consistent if you edit the contract.
- When redeploying to testnet or mainnet, update the addresses in the frontend `.env` (`VITE_WALPAY_ADDRESS`, `VITE_FLOW_TOKEN_ADDRESS`, etc.) and the backend configuration so fee calculations stay aligned.
- Emitted events: `PaymentCreated`, `PaymentPaid`, `PaymentDeactivated`. Hook listeners or indexers here for analytics/webhooks.

## Further reading
- [Flow documentation](https://developers.flow.com/)
- [Cadence language reference](https://cadence-lang.org/docs/language)
- [WalPay architecture overview](../docs/architecture.md)


Legacy Flow resources remain below for historical reference.
