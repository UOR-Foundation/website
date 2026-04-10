/**
 * useAuth. Reactive authentication state for the whole app.
 *
 * Provides session, user, profile, and loading state.
 * Listens to Supabase auth changes so UI updates instantly on sign-in/sign-out.
 *
 * Ported from ego-guard-forge pattern.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { runFoundingCeremony } from "@/modules/platform/ceremony/founding-forge";

export interface PrivacyRules {
  name?: boolean;
  email?: boolean;
  avatar?: boolean;
  bio?: boolean;
  handle?: boolean;
  canonicalId?: boolean;
  cid?: boolean;
  ipv6?: boolean;
  glyph?: boolean;
  ceremonyCid?: boolean;
  trustNode?: boolean;
  [key: string]: boolean | undefined;
}

interface Profile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  handle: string | null;
  coverImageUrl: string | null;
  threeWordName: string | null;
  ceremonyCid: string | null;
  trustNodeCid: string | null;
  disclosurePolicyCid: string | null;
  pqcAlgorithm: string | null;
  collapseIntact: boolean | null;
  uorCanonicalId: string | null;
  uorGlyph: string | null;
  uorIpv6: string | null;
  uorCid: string | null;
  claimedAt: string | null;
  privacyRules: PrivacyRules | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  walletAddress: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  walletAddress: null,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, bio, handle, cover_image_url, three_word_name, ceremony_cid, trust_node_cid, disclosure_policy_cid, pqc_algorithm, collapse_intact, uor_canonical_id, uor_glyph, uor_ipv6, uor_cid, claimed_at, privacy_rules, wallet_address")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      setProfile({
        id: data.id,
        displayName: data.display_name ?? "User",
        avatarUrl: data.avatar_url,
        bio: data.bio,
        handle: data.handle,
        coverImageUrl: data.cover_image_url,
        threeWordName: data.three_word_name,
        ceremonyCid: data.ceremony_cid,
        trustNodeCid: data.trust_node_cid,
        disclosurePolicyCid: data.disclosure_policy_cid,
        pqcAlgorithm: data.pqc_algorithm,
        collapseIntact: data.collapse_intact,
        uorCanonicalId: data.uor_canonical_id,
        uorGlyph: data.uor_glyph,
        uorIpv6: data.uor_ipv6,
        uorCid: data.uor_cid,
        claimedAt: data.claimed_at,
        privacyRules: data.privacy_rules as PrivacyRules | null,
      });
      setWalletAddress(data.wallet_address ?? null);
    } else {
      setProfile(null);
      setWalletAddress(null);
    }
  }, []);

  useEffect(() => {
    // If Supabase isn't configured, skip all auth setup and just mark as loaded
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }

    // Set up listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(async () => {
            await fetchProfile(newSession.user.id);
            // Run founding ceremony in parallel (fire-and-forget)
            if (event === "SIGNED_IN") {
              runFoundingCeremony(newSession.user.id).then((result) => {
                if (result) fetchProfile(newSession.user.id); // refresh to pick up ceremony_cid
              });
            }
          }, 0);
          // Handle post-OAuth redirect: if we stored a return path, navigate there
          if (event === "SIGNED_IN") {
            const returnTo = sessionStorage.getItem("auth_return_to");
            if (returnTo) {
              sessionStorage.removeItem("auth_return_to");
              // Only redirect if we're on root (came back from OAuth redirect)
              if (window.location.pathname === "/") {
                window.location.href = returnTo;
              }
            }
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        fetchProfile(s.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setWalletAddress(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  }, [session, fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        walletAddress,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
