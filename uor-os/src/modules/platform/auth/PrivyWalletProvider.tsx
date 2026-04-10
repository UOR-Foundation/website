/**
 * PrivyWalletProvider — Wraps the app with Privy's embedded wallet infrastructure.
 *
 * Configured in whitelabel mode: no Privy UI surfaces. Our AuthPromptModal
 * handles all sign-in UX. Privy only provides the embedded wallet backend.
 *
 * After Supabase auth completes, the customAuth integration automatically
 * syncs the Supabase JWT to Privy, which creates/retrieves an embedded wallet.
 */

import { createContext, useContext, useMemo, useCallback, useState, useEffect, type ReactNode } from "react";
import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";
import { supabase } from "@/integrations/supabase/client";

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

/**
 * Inner component that provides the Supabase JWT to Privy's customAuth.
 * Must be a child of PrivyProvider to use hooks, but manages auth state separately.
 */
function PrivyAuthBridge({ children }: { children: ReactNode }) {
  return <WalletBridge>{children}</WalletBridge>;
}

export function PrivyWalletProvider({ children }: { children: ReactNode }) {
  const [authLoading, setAuthLoading] = useState(true);

  // Track Supabase session for Privy custom auth
  const getCustomAccessToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? "";
  }, []);

  useEffect(() => {
    // Once we've set up the callback, mark as not loading
    supabase.auth.getSession().then(() => setAuthLoading(false));
  }, []);

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
        // Need at least one login method to satisfy SDK validation;
        // we use our own AuthPromptModal so Privy's email UI is never shown
        loginMethods: ['email'],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "all-users",
          },
        },
        // Custom auth: we handle sign-in via Supabase, then sync JWT to Privy
        customAuth: {
          enabled: true,
          getCustomAccessToken,
          isLoading: authLoading,
        },
      }}
    >
      <PrivyAuthBridge>{children}</PrivyAuthBridge>
    </PrivyProvider>
  );
}

export function useWalletContext() {
  return useContext(WalletContext);
}
