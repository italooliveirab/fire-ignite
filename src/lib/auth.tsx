import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "affiliate" | null;

interface AuthCtx {
  user: User | null;
  session: Session | null;
  role: Role;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null, session: null, role: null, loading: true, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // defer to avoid deadlock
        setTimeout(() => fetchRole(sess.user.id), 0);
      } else {
        setRole(null);
      }
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) fetchRole(data.session.user.id);
      setLoading(false);
    });

    // Refresh session when tab regains focus (avoids silent expiry on long sessions)
    const refreshIfStale = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const expiresAt = (data.session.expires_at ?? 0) * 1000;
      // Refresh if expiring within 5 minutes
      if (expiresAt - Date.now() < 5 * 60 * 1000) {
        await supabase.auth.refreshSession().catch(() => {});
      }
    };
    const onVisible = () => { if (document.visibilityState === "visible") refreshIfStale(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refreshIfStale);
    // Periodic safety net every 4 minutes
    const interval = window.setInterval(refreshIfStale, 4 * 60 * 1000);

    return () => {
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refreshIfStale);
      window.clearInterval(interval);
    };
  }, []);

  const fetchRole = async (uid: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    if (data && data.length) {
      // priorizar admin
      const roles = data.map((r) => r.role);
      setRole(roles.includes("admin" as never) ? "admin" : "affiliate");
    } else {
      setRole(null);
    }
    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return <Ctx.Provider value={{ user, session, role, loading, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
