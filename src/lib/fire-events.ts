/**
 * Tiny pub/sub for visual sync between audio crackles and the EmberCanvas.
 * Decoupled so neither component imports the other.
 */
type Listener = (x?: number, y?: number) => void;

const listeners = new Set<Listener>();

export const fireEvents = {
  on(fn: Listener) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  emitCrackle(x?: number, y?: number) {
    listeners.forEach((fn) => fn(x, y));
  },
};