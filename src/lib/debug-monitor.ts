import { supabase } from "@/integrations/supabase/client";

type Severity = "info" | "warn" | "error";
type Category = "auth" | "performance" | "navigation" | "network" | "query" | "error" | "vital";

interface DebugEvent {
  category: Category;
  severity?: Severity;
  message: string;
  duration_ms?: number;
  route?: string;
  context?: Record<string, unknown>;
}

interface BufferedEvent extends DebugEvent {
  ts: number;
}

const BUFFER: BufferedEvent[] = [];
const MAX_BUFFER = 200;
let flushTimer: number | null = null;
let currentUserId: string | null = null;
let currentUserEmail: string | null = null;
let installed = false;

const SLOW_QUERY_MS = 500;
const SLOW_NAV_MS = 800;

export function setDebugUser(userId: string | null, email: string | null) {
  currentUserId = userId;
  currentUserEmail = email;
}

export function logDebug(ev: DebugEvent) {
  const buffered: BufferedEvent = { ...ev, ts: Date.now(), severity: ev.severity ?? "info" };
  BUFFER.push(buffered);
  if (BUFFER.length > MAX_BUFFER) BUFFER.shift();
  scheduleFlush();
  // Mirror to console for immediate visibility
  const tag = `[debug:${ev.category}]`;
  if (ev.severity === "error") console.error(tag, ev.message, ev.context ?? "");
  else if (ev.severity === "warn") console.warn(tag, ev.message, ev.context ?? "");
}

function scheduleFlush() {
  if (typeof window === "undefined") return;
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushDebug();
  }, 4000);
}

export async function flushDebug() {
  if (BUFFER.length === 0) return;
  const batch = BUFFER.splice(0, BUFFER.length);
  const route = typeof window !== "undefined" ? window.location.pathname : null;
  const rows = batch.map((e) => ({
    category: e.category,
    severity: e.severity ?? "info",
    message: e.message.slice(0, 1000),
    duration_ms: e.duration_ms ?? null,
    route: e.route ?? route,
    user_id: currentUserId,
    user_email: currentUserEmail,
    context: (e.context ?? null) as never,
  }));
  try {
    await supabase.from("debug_events").insert(rows);
  } catch {
    // re-buffer a small slice if insert fails
    BUFFER.unshift(...batch.slice(-20));
  }
}

export function getRecentDebug(): BufferedEvent[] {
  return [...BUFFER];
}

export function installDebugMonitor() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // Global JS errors
  window.addEventListener("error", (e) => {
    logDebug({
      category: "error",
      severity: "error",
      message: e.message || "Erro JS",
      context: { filename: e.filename, lineno: e.lineno, colno: e.colno },
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = (e.reason && (e.reason.message || String(e.reason))) || "Promise rejeitada";
    logDebug({ category: "error", severity: "error", message: String(reason).slice(0, 500) });
  });

  // Patch fetch to monitor network + supabase queries
  const origFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const t0 = performance.now();
    const url = typeof args[0] === "string" ? args[0] : args[0] instanceof Request ? args[0].url : String(args[0]);
    const method = (args[1]?.method ?? (args[0] instanceof Request ? args[0].method : "GET")).toUpperCase();
    try {
      const res = await origFetch(...args);
      const dur = performance.now() - t0;
      const isSupabase = url.includes("/rest/v1/") || url.includes("/auth/v1/");
      const category: Category = isSupabase ? "query" : "network";
      const severity: Severity = !res.ok ? "error" : dur > SLOW_QUERY_MS ? "warn" : "info";
      // Skip logging the debug_events insert itself to avoid recursion noise
      if (!url.includes("debug_events")) {
        if (severity !== "info" || isSupabase) {
          logDebug({
            category,
            severity,
            message: `${method} ${shortUrl(url)} → ${res.status}`,
            duration_ms: Math.round(dur),
            context: { status: res.status },
          });
        }
      }
      return res;
    } catch (err) {
      const dur = performance.now() - t0;
      logDebug({
        category: "network",
        severity: "error",
        message: `${method} ${shortUrl(url)} falhou`,
        duration_ms: Math.round(dur),
        context: { error: (err as Error)?.message },
      });
      throw err;
    }
  };

  // Web vitals via PerformanceObserver
  try {
    const navObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const nav = entry as PerformanceNavigationTiming;
        const dur = Math.round(nav.loadEventEnd - nav.startTime);
        logDebug({
          category: "vital",
          severity: dur > 3000 ? "warn" : "info",
          message: `Page load: ${dur}ms`,
          duration_ms: dur,
          context: {
            dom_interactive: Math.round(nav.domInteractive - nav.startTime),
            ttfb: Math.round(nav.responseStart - nav.startTime),
          },
        });
      }
    });
    navObs.observe({ type: "navigation", buffered: true });

    const lcpObs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number; loadTime?: number };
      const t = Math.round(last.renderTime ?? last.loadTime ?? last.startTime);
      logDebug({
        category: "vital",
        severity: t > 2500 ? "warn" : "info",
        message: `LCP: ${t}ms`,
        duration_ms: t,
      });
    });
    lcpObs.observe({ type: "largest-contentful-paint", buffered: true });

    const longObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 200) {
          logDebug({
            category: "performance",
            severity: "warn",
            message: `Long task: ${Math.round(entry.duration)}ms`,
            duration_ms: Math.round(entry.duration),
          });
        }
      }
    });
    longObs.observe({ type: "longtask", buffered: true });
  } catch {
    /* PerformanceObserver indisponível */
  }

  // Track navigation duration
  let navStart = performance.now();
  let lastPath = window.location.pathname;
  const checkRoute = () => {
    if (window.location.pathname !== lastPath) {
      const dur = Math.round(performance.now() - navStart);
      logDebug({
        category: "navigation",
        severity: dur > SLOW_NAV_MS ? "warn" : "info",
        message: `${lastPath} → ${window.location.pathname}`,
        duration_ms: dur,
      });
      lastPath = window.location.pathname;
      navStart = performance.now();
    }
  };
  const origPush = history.pushState;
  const origReplace = history.replaceState;
  history.pushState = function (...a) {
    navStart = performance.now();
    const r = origPush.apply(this, a);
    setTimeout(checkRoute, 0);
    return r;
  };
  history.replaceState = function (...a) {
    const r = origReplace.apply(this, a);
    setTimeout(checkRoute, 0);
    return r;
  };
  window.addEventListener("popstate", () => {
    navStart = performance.now();
    setTimeout(checkRoute, 0);
  });

  // Flush before unload
  window.addEventListener("beforeunload", () => {
    void flushDebug();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flushDebug();
  });
}

function shortUrl(u: string): string {
  try {
    const url = new URL(u, window.location.origin);
    return url.pathname + (url.search ? "?" + url.searchParams.toString().slice(0, 60) : "");
  } catch {
    return u.slice(0, 120);
  }
}