import { type ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  // Page transitions removed: AnimatePresence with mode="wait" added ~300ms
  // perceived delay on every navigation. Instant navigation feels faster.
  return <>{children}</>;
}