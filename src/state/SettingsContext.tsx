import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ColorScheme } from '../theme/tokens';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ArabicFont = 'amiri' | 'scheherazade';
export type ComparisonLayout = 'stacked' | 'switcher';
export type DefinitionLang = 'en' | 'ar';

/**
 * User-controlled preferences. Persisted to AsyncStorage (survives app updates,
 * kept entirely separate from the read-only reference database).
 */
export interface AppSettings {
  themeMode: ThemeMode;
  arabicFont: ArabicFont;
  /** Multiplier applied to the base Qur'an verse size (0.8–1.7). */
  arabicFontScale: number;
  /** Multiplier applied to translation/definition text (0.85–1.4). */
  translationFontScale: number;
  /** Preferred reference translation id (e.g. "yusufali"). */
  defaultTranslationId: string;
  /** Preferred lexicon source id (e.g. "lane"). */
  lexiconSourceId: string;
  /** Language of the lexicon definitions shown first. */
  definitionLang: DefinitionLang;
  /** Comparison screen layout preference. */
  comparisonLayout: ComparisonLayout;
  /** Show the default reference translation under each ayah in the Reader. */
  showInlineTranslation: boolean;
  showTransliteration: boolean;
  hapticsEnabled: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'system',
  arabicFont: 'amiri',
  arabicFontScale: 1,
  translationFontScale: 1,
  defaultTranslationId: 'yusufali',
  lexiconSourceId: 'lane',
  definitionLang: 'en',
  comparisonLayout: 'stacked',
  showInlineTranslation: true,
  showTransliteration: true,
  hapticsEnabled: true,
};

const STORAGE_KEY = 'bayan.settings.v1';

export const ARABIC_SCALE_RANGE = { min: 0.8, max: 1.7, step: 0.05 } as const;
export const TRANSLATION_SCALE_RANGE = { min: 0.85, max: 1.4, step: 0.05 } as const;

interface SettingsContextValue {
  settings: AppSettings;
  ready: boolean;
  update: (patch: Partial<AppSettings>) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

function sanitize(raw: Partial<AppSettings> | null | undefined): AppSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  const merged = { ...DEFAULT_SETTINGS, ...raw };
  // Clamp numeric ranges defensively.
  merged.arabicFontScale = clamp(merged.arabicFontScale, ARABIC_SCALE_RANGE.min, ARABIC_SCALE_RANGE.max);
  merged.translationFontScale = clamp(
    merged.translationFontScale,
    TRANSLATION_SCALE_RANGE.min,
    TRANSLATION_SCALE_RANGE.max,
  );
  return merged;
}

function clamp(v: number, min: number, max: number): number {
  if (typeof v !== 'number' || Number.isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (alive && stored) setSettings(sanitize(JSON.parse(stored)));
      } catch {
        // Corrupt/unavailable storage → fall back to defaults.
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback((next: AppSettings) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
    }, 250);
  }, []);

  const update = useCallback(
    (patch: Partial<AppSettings>) => {
      setSettings((prev) => {
        const next = sanitize({ ...prev, ...patch });
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    persist(DEFAULT_SETTINGS);
  }, [persist]);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, ready, update, reset }),
    [settings, ready, update, reset],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}

/** Resolve the active colour scheme from the user's themeMode + the system value. */
export function resolveScheme(mode: ThemeMode, system: ColorScheme): ColorScheme {
  return mode === 'system' ? system : mode;
}
