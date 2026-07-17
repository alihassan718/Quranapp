import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { resolveScheme, useSettings } from '../state/SettingsContext';
import { buildTheme, Theme } from './tokens';

const ThemeContext = createContext<Theme | undefined>(undefined);

/**
 * Derives the active theme from the user's themeMode setting and the OS colour
 * scheme, then exposes it to the tree. Must sit inside SettingsProvider.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { settings } = useSettings();

  const theme = useMemo(
    () => buildTheme(resolveScheme(settings.themeMode, system)),
    [settings.themeMode, system],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
