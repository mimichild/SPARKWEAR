// Web stub for expo-sqlite — allows web dev/testing without native SQLite
// This is only used on web platform (Platform.OS === 'web')

export const WebSQLiteProvider = ({ children }: { children: React.ReactNode }) => {
  const React = require('react');
  return React.createElement(React.Fragment, null, children);
};
