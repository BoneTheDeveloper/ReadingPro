const PREFIX = 'reading_app_v1_';

// Event emitter for storage changes (required for useSyncExternalStore)
type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

const emitChange = (key: string) => {
  const keyListeners = listeners.get(key);
  if (keyListeners) {
    keyListeners.forEach((listener) => listener());
  }
};

export const storage = {
  set: (key: string, value: unknown) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
    emitChange(key);
  },
  get: <T>(key: string): T | null => {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(`${PREFIX}${key}`);
    return data ? JSON.parse(data) : null;
  },
  remove: (key: string) => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`${PREFIX}${key}`);
    emitChange(key);
  },
  clearAppOnly: () => {
    if (typeof window === 'undefined') return;
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(PREFIX)) {
        localStorage.removeItem(key);
        // Extract the original key and emit
        const originalKey = key.replace(PREFIX, '');
        emitChange(originalKey);
      }
    });
  },
  // Subscribe to changes for a specific key (for useSyncExternalStore)
  subscribe: (key: string, listener: Listener) => {
    if (!listeners.has(key)) {
      listeners.set(key, new Set());
    }
    listeners.get(key)!.add(listener);
    return () => {
      listeners.get(key)?.delete(listener);
    };
  },
};
