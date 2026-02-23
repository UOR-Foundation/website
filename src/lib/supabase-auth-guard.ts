/**
 * Authentication guard for client-side database writes.
 *
 * All client-side write operations must verify the user is authenticated
 * before attempting database mutations. RLS blocks unauthenticated writes
 * at the database level, but this guard provides a clear error message
 * and prevents unnecessary network requests.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Throws if the current Supabase session is unauthenticated.
 * Call before any client-side insert/upsert/update/delete operation.
 */
export async function requireAuth(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error(
      "Authentication required: client-side database writes require an authenticated session. " +
      "Use edge functions for unauthenticated operations."
    );
  }
}
