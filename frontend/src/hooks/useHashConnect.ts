import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LedgerId } from "@hashgraph/sdk";
import {
  DAppConnector,
  HederaChainId,
  HederaJsonRpcMethod,
  HederaSessionEvent,
  type DAppSigner,
} from "@hashgraph/hedera-wallet-connect";

const NETWORK = (import.meta.env.VITE_HEDERA_NETWORK ?? "testnet").toLowerCase();
const PROJECT_ID = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID ?? "";
const APP_URL =
  import.meta.env.VITE_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "https://linkup.app");

const CHAIN_BY_NETWORK: Record<string, HederaChainId> = {
  mainnet: HederaChainId.Mainnet,
  previewnet: HederaChainId.Previewnet,
  devnet: HederaChainId.Devnet,
  testnet: HederaChainId.Testnet,
};

type WalletStatus = "idle" | "connecting" | "ready";

type HashConnectState = {
  accountId: string | null;
  status: WalletStatus;
  pairingUri: string | null;
  connect: () => Promise<void>;
  connectWithQr: () => Promise<void>;
  clearPairingUri: () => void;
  disconnect: () => Promise<void>;
  submitTransaction: (payload: string, signerAccountId: string) => Promise<unknown>;
};

export function useHashConnect(): HashConnectState {
  const connectorRef = useRef<DAppConnector | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletStatus>("idle");
  const [pairingUri, setPairingUri] = useState<string | null>(null);

  const networkChain = CHAIN_BY_NETWORK[NETWORK] ?? HederaChainId.Testnet;
  const ledgerId = LedgerId.fromString(NETWORK);

  const refreshSigner = useCallback((): DAppSigner | null => {
    const connector = connectorRef.current;
    if (!connector) return null;
    const signer = connector.signers.at(-1) ?? null;
    setAccountId(signer ? signer.getAccountId().toString() : null);
    setStatus(signer ? "ready" : "idle");
    return signer ?? null;
  }, []);

  useEffect(() => {
    if (!PROJECT_ID) {
      console.warn("VITE_WALLET_CONNECT_PROJECT_ID is not configured");
      setAccountId(null);
      setStatus("idle");
      return;
    }

    const metadata = {
      name: "LinkUp",
      description: "LinkUp Hedera checkout",
      url: APP_URL,
      icons: [`${APP_URL.replace(/\/$/, "")}/icons/icon-192.png`],
    };

    const connector = new DAppConnector(
      metadata,
      ledgerId,
      PROJECT_ID,
      Object.values(HederaJsonRpcMethod),
      [HederaSessionEvent.AccountsChanged, HederaSessionEvent.ChainChanged],
      [networkChain]
    );

    connectorRef.current = connector;
    let cancelled = false;

    (async () => {
      try {
        await connector.init({ logger: "error" });
        if (!cancelled) {
          refreshSigner();
        }
      } catch (err) {
        console.error("Unable to initialize Hedera WalletConnect", err);
      }
    })();

    return () => {
      cancelled = true;
      connector.disconnectAll().catch(() => undefined);
      connectorRef.current = null;
      setAccountId(null);
      setStatus("idle");
      setPairingUri(null);
    };
  }, [ledgerId, networkChain, refreshSigner]);

  const connect = useCallback(async () => {
    if (!connectorRef.current || status === "connecting") return;
    setStatus("connecting");
    try {
      await connectorRef.current.openModal();
      refreshSigner();
    } catch (err) {
      console.error("Wallet connect failed", err);
      setStatus(accountId ? "ready" : "idle");
      throw err;
    }
  }, [accountId, refreshSigner, status]);

  const connectWithQr = useCallback(async () => {
    if (!connectorRef.current || status === "connecting") return;
    setStatus("connecting");
    setPairingUri(null);
    try {
      await connectorRef.current.connect((uri) => setPairingUri(uri));
      refreshSigner();
      setPairingUri(null);
    } catch (err) {
      console.error("Wallet connect via QR failed", err);
      setStatus(accountId ? "ready" : "idle");
      setPairingUri(null);
      throw err;
    }
  }, [accountId, refreshSigner, status]);

  const disconnect = useCallback(async () => {
    if (!connectorRef.current) return;
    await connectorRef.current.disconnectAll().catch(() => undefined);
    setAccountId(null);
    setStatus("idle");
    setPairingUri(null);
  }, []);

  const submitTransaction = useCallback(
    async (payload: string, signerAccountId: string) => {
      if (!connectorRef.current) {
        throw new Error("Wallet connector is not ready");
      }
      if (!signerAccountId) {
        throw new Error("No connected Hedera account");
      }
      return connectorRef.current.signAndExecuteTransaction({
        signerAccountId,
        transactionList: payload,
      });
    },
    []
  );

  const clearPairingUri = useCallback(() => setPairingUri(null), []);

  return useMemo(
    () => ({
      accountId,
      status,
      pairingUri,
      connect,
      connectWithQr,
      clearPairingUri,
      disconnect,
      submitTransaction,
    }),
    [accountId, status, pairingUri, connect, connectWithQr, clearPairingUri, disconnect, submitTransaction]
  );
}
