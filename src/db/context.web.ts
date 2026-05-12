// Web stub — returns a no-op DB so components render without crashing
// SQLite operations simply return empty results on web
type AnyDb = {
  getAllAsync: <T>(...args: unknown[]) => Promise<T[]>;
  getFirstAsync: <T>(...args: unknown[]) => Promise<T | null>;
  runAsync: (...args: unknown[]) => Promise<{ lastInsertRowId: number; changes: number }>;
  execAsync: (...args: unknown[]) => Promise<void>;
};

const noopDb: AnyDb = {
  getAllAsync: async () => [],
  getFirstAsync: async () => null,
  runAsync: async () => ({ lastInsertRowId: 0, changes: 0 }),
  execAsync: async () => {},
};

export function useSQLiteContext() {
  return noopDb as unknown as import('expo-sqlite').SQLiteDatabase;
}
