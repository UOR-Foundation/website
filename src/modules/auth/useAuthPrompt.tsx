/**
 * useAuthPrompt — Shared state for the contextual sign-in modal.
 * Any component can trigger the modal by calling `prompt("context")`.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import AuthPromptModal, { type AuthContext } from "@/modules/auth/AuthPromptModal";

interface AuthPromptState {
  prompt: (ctx: AuthContext) => void;
}

const AuthPromptContext = createContext<AuthPromptState>({ prompt: () => {} });

export function AuthPromptProvider({ children }: { children: ReactNode }) {
  const [ctx, setCtx] = useState<AuthContext | null>(null);

  const prompt = useCallback((c: AuthContext) => setCtx(c), []);
  const close = useCallback(() => setCtx(null), []);

  return (
    <AuthPromptContext.Provider value={{ prompt }}>
      {children}
      <AuthPromptModal open={ctx !== null} onClose={close} context={ctx ?? "default"} />
    </AuthPromptContext.Provider>
  );
}

export function useAuthPrompt() {
  return useContext(AuthPromptContext);
}
