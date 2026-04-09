/**
 * PrivyWalletProvider — Wraps the app with Privy's embedded wallet infrastructure.
 *
 * Configured in whitelabel mode: no Privy UI surfaces. Our AuthPromptModal
 * handles all sign-in UX. Privy only provides the embedded wallet backend.
 *
 * After Supabase auth completes, `useAuth` triggers Privy login via custom
 * access token, which silently creates/retrieves an embedded wallet.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";

// Publishable App ID — safe for client-side code
const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || "cmnryb25k00fk0cl1ry8fosrb";

interface WalletContextValue {
  walletAddress: string | null;
  ready: boolean;
  /** The raw Privy wallet object for signing/sending */
  wallet: ReturnType<typeof useWallets>["wallets"][0] | null;
}

const WalletContext = createContext<WalletContextValue>({
  walletAddress: null,
  ready: false,
  wallet: null,
});

function WalletBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();

  const embeddedWallet = useMemo(
    () => wallets.find((w) => w.walletClientType === "privy") ?? null,
    [wallets],
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      walletAddress: embeddedWallet?.address ?? null,
      ready: ready && authenticated,
      wallet: embeddedWallet,
    }),
    [embeddedWallet, ready, authenticated],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function PrivyWalletProvider({ children }: { children: ReactNode }) {
  // If no Privy App ID configured, render children without Privy
  if (!PRIVY_APP_ID) {
    return (
      <WalletContext.Provider
        value={{ walletAddress: null, ready: false, wallet: null }}
      >
        {children}
      </WalletContext.Provider>
    );
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          // Whitelabel: no Privy login modal — we use our own AuthPromptModal
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "all-users",
          },
        },
        // No login methods — we handle auth ourselves via custom access token
        loginMethods: [],
      }}
    >
      <WalletBridge>{children}</WalletBridge>
    </PrivyProvider>
  );
}

export function useWalletContext() {
  return useContext(WalletContext);
}
