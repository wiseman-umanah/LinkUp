## WalPay Cadence package

This folder contains the `WalPay` Cadence contract and supporting transactions/scripts used by the frontend and backend to create, pay, and deactivate payment links on the Flow blockchain.

## Project structure
```
smart_contract/
├── cadence/
│   ├── contracts/WalPay.cdc            # Main contract (fee logic + earnings tracking)
│   ├── scripts/get_payment.cdc         # Reads a payment by id
│   ├── scripts/get_seller_earnings.cdc # Returns total seller earnings
│   ├── transactions/create_payment.cdc # Seller creates a payment (id + price)
│   ├── transactions/pay.cdc            # Buyer pays for a link
│   ├── transactions/deactivate_payment.cdc
│   └── tests/WalPay_test.cdc
├── flow.json                           # Flow CLI configuration
└── emulator-account.pkey               # Local dev account keys (example)
```

## Prerequisites
- Flow CLI (`brew install flow-cli` or see Flow docs)
- Access to the platform treasury account that will receive fees (must expose `/public/flowTokenReceiver`)
- The same platform fee percentage used by the backend (`PLATFORM_FEE_PERCENT`)

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

## Running locally
```bash
# Start emulator and deploy
flow emulator start --http-port 8888 --rest-port 8889
flow project deploy --network emulator

# Run tests
flow test
```

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


Contract Details
- Name: WalPay
- Address (Deployed to): 0x7bcb95a415452d7d
- Identifier: A.7bcb95a415452d7d.WalPay
- TxHash - 84da5745b2d375bcd7ffe61d65d3df4915ec1b4cd20951984ec3ea20063a67cb

- Link to contract deployed: https://testnet.flowscan.io/contract/A.7bcb95a415452d7d.WalPay
