import type { SQLiteDatabase } from 'expo-sqlite';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { openReadDatabase } from '../data/database';
import { openUserDatabase } from '../data/userStore';
import { useTheme } from '../theme/ThemeProvider';

interface DatabaseContextValue {
  readDb: SQLiteDatabase;
  userDb: SQLiteDatabase;
}

const DatabaseContext = createContext<DatabaseContextValue | undefined>(undefined);

type Status =
  | { phase: 'loading' }
  | { phase: 'ready'; readDb: SQLiteDatabase; userDb: SQLiteDatabase }
  | { phase: 'error'; message: string };

/**
 * Opens the read-only reference DB (building it from bundled data on first run
 * or after a data-version bump) and the separate user DB, then gates the app
 * on both being ready.
 */
export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>({ phase: 'loading' });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [readDb, userDb] = await Promise.all([openReadDatabase(), openUserDatabase()]);
        if (alive) setStatus({ phase: 'ready', readDb, userDb });
      } catch (e) {
        if (alive)
          setStatus({ phase: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (status.phase === 'loading') return <BootScreen />;
  if (status.phase === 'error') return <BootScreen error={status.message} />;

  return (
    <DatabaseContext.Provider value={{ readDb: status.readDb, userDb: status.userDb }}>
      {children}
    </DatabaseContext.Provider>
  );
}

function BootScreen({ error }: { error?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.boot, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.mark, { color: theme.colors.primary, fontFamily: theme.fonts.serifSemibold }]}>
        بيان
      </Text>
      <Text style={[styles.name, { color: theme.colors.textPrimary, fontFamily: theme.fonts.serifMedium }]}>
        Bayān
      </Text>
      {error ? (
        <Text style={[styles.error, { color: theme.colors.danger, fontFamily: theme.fonts.sans }]}>
          {error}
        </Text>
      ) : (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
      )}
    </View>
  );
}

export function useDatabases(): DatabaseContextValue {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error('useDatabases must be used within a DatabaseProvider');
  return ctx;
}

export function useReadDb(): SQLiteDatabase {
  return useDatabases().readDb;
}

export function useUserDb(): SQLiteDatabase {
  return useDatabases().userDb;
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  mark: { fontSize: 52, marginBottom: 8 },
  name: { fontSize: 22, letterSpacing: 1 },
  error: { fontSize: 13, marginTop: 20, textAlign: 'center', maxWidth: 300 },
});
