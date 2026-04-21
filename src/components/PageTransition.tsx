import { type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export function PageTransition({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const reduce = useReducedMotion();

  if (reduce) return <>{children}</>;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={loc.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        style={{ minHeight: "100%" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}