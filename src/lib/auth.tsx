import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "affiliate" | null;

const roleCache = new Map<string, Role>();
const roleInflight = new Map<string, Promise<Role>>();

const ROLE_STORAGE_PREFIX = "fire:role:";

function readPersistedRole(uid: string): Role | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(ROLE_STORAGE_PREFIX + uid);
    if (raw === "admin" || raw === "affiliate") return raw;
    if (raw === "null") return null;
    return undefined;
  } catch {
    return undefined;
  }
}

function persistRole(uid: string, role: Role) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ROLE_STORAGE_PREFIX + uid, role === null ? "null" : role);
  } catch {
    /* ignore quota errors */
  }
}

export async function resolveRoleForUser(uid: string): Promise<Role> {
  if (roleCache.has(uid)) return roleCache.get(uid) ?? null;

  const persisted = readPersistedRole(uid);
  if (persisted !== undefined) {
    roleCache.set(uid, persisted);
    // refresh in background so a stale role is corrected on next call
    if (!roleInflight.has(uid)) void fetchAndStoreRole(uid);
    return persisted;
  }

  const inflight = roleInflight.get(uid);
  if (inflight) return inflight;

  return fetchAndStoreRole(uid);
}

function fetchAndStoreRole(uid: string): Promise<Role> {
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const request = (async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);
    if (error) throw error;
    const roles = data?.map((row) => row.role) ?? [];
    const nextRole: Role = roles.includes("admin" as never)
      ? "admin"
      : roles.includes("affiliate" as never)
        ? "affiliate"
        : null;
    roleCache.set(uid, nextRole);
    persistRole(uid, nextRole);
    if (typeof performance !== "undefined") {
      console.log(`[auth] resolveRoleForUser fetched in ${(performance.now() - t0).toFixed(0)}ms (role=${nextRole})`);
    }
    return nextRole;
  })()
    .catch(() => null)
    .finally(() => {
      roleInflight.delete(uid);
    });

  roleInflight.set(uid, request);
  return request;
}

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
  const mountedRef = useRef(true);
  const lastUserIdRef = useRef<string | null>(null);

  const syncSessionState = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    const nextUserId = nextSession?.user?.id ?? null;
    if (!nextUserId) {
      lastUserIdRef.current = null;
      setRole(null);
      setLoading(false);
      return;
    }

    if (lastUserIdRef.current === nextUserId && roleCache.has(nextUserId)) {
      setRole(roleCache.get(nextUserId) ?? null);
      setLoading(false);
      return;
    }

    lastUserIdRef.current = nextUserId;

    if (roleCache.has(nextUserId)) {
      setRole(roleCache.get(nextUserId) ?? null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const nextRole = await resolveRoleForUser(nextUserId);
    if (!mountedRef.current) return;
    setRole(nextRole);
    setLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncSessionState(nextSession);
    });

    void supabase.auth.getSession().then(({ data }) => syncSessionState(data.session));

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
      mountedRef.current = false;
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refreshIfStale);
      window.clearInterval(interval);
    };
  }, [syncSessionState]);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return <Ctx.Provider value={{ user, session, role, loading, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
