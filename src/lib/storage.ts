const PREFIX = 'reading_app_v1_';

export const storage = {
  set: (key: string, value: unknown) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
  },
  get: <T>(key: string): T | null => {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(`${PREFIX}${key}`);
    return data ? JSON.parse(data) : null;
  },
  remove: (key: string) => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`${PREFIX}${key}`);
  },
  clearAppOnly: () => {
    if (typeof window === 'undefined') return;
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  },
};
