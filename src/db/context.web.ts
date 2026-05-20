// Web stub — uses in-memory mock DB with seed data for local UI verification
import { getMockDb } from './sqlMock.web';

export function useSQLiteContext() {
  return getMockDb() as unknown as import('expo-sqlite').SQLiteDatabase;
}
