import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User, AuthChangeEvent } from "@supabase/supabase-js";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const qc = useQueryClient();

  // Track whether the user explicitly signed out so we can distinguish
  // intentional sign-outs from expired-session SIGNED_OUT events.
  const intentionalSignOutRef = useRef(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, nextSession: Session | null) => {
      setSession(nextSession);

      if (event === "SIGNED_OUT") {
        // Clear all cached data immediately to prevent stale UI flashes.
        qc.clear();

        if (!intentionalSignOutRef.current) {
          // Session expired or was invalidated server-side.
          toast.error("Session expired", {
            description: "Please sign in again to continue.",
          });
        }
        intentionalSignOutRef.current = false;
      } else if (event === "TOKEN_REFRESHED") {
        // Silently reconnect realtime / refetch open queries.
        void qc.invalidateQueries();
      } else if (event === "SIGNED_IN") {
        void qc.invalidateQueries();
      }

      // Defer router invalidation to avoid re-entrant updates.
      queueMicrotask(() => router.invalidate());
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.warn("[auth] getSession failed", error);
        }
      })
      .finally(() => setLoading(false));

    return () => subscription.unsubscribe();
  }, [router, qc]);

  const signOut = async () => {
    intentionalSignOutRef.current = true;
    try {
      await supabase.auth.signOut();
    } catch (error) {
      intentionalSignOutRef.current = false;
      if (import.meta.env.DEV) console.warn("[auth] signOut failed", error);
      throw error;
    }
  };

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
