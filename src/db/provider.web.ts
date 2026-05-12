import type { ReactNode } from 'react';

// Web stub — SQLite is native-only; provider just passes children through
export function SQLiteProvider({ children }: { children: ReactNode }) {
  const React = require('react');
  return React.createElement(React.Fragment, null, children);
}

export const DB_NAME = '';
export async function initDatabase() {}
