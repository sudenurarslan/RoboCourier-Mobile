import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

type ThemeContextValue = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  effectiveColorScheme: ColorScheme;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  const effectiveColorScheme: ColorScheme = useMemo(() => {
    if (themeMode === 'system') return systemColorScheme ?? 'light';
    return themeMode;
  }, [themeMode, systemColorScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ themeMode, setThemeMode, effectiveColorScheme }),
    [themeMode, effectiveColorScheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within AppThemeProvider');
  return ctx;
}
