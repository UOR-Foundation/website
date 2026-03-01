/**
 * useAuth — Reactive authentication state for the whole app.
 *
 * Provides session, user, profile, and loading state.
 * Listens to Supabase auth changes so UI updates instantly on sign-in/sign-out.
 *
 * Ported from ego-guard-forge pattern.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

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
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, bio, handle, cover_image_url, three_word_name, ceremony_cid, trust_node_cid, disclosure_policy_cid, pqc_algorithm, collapse_intact, uor_canonical_id, uor_glyph, uor_ipv6, uor_cid")
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
      });
    } else {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    // Set up listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => fetchProfile(newSession.user.id), 0);
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
