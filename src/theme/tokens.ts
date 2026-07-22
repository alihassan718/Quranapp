import { Platform, TextStyle, ViewStyle } from 'react-native';

/**
 * Design tokens for Bayān.
 *
 * The visual identity is "a fine printed book": warm parchment in light mode,
 * warm charcoal in dark mode, a deep emerald-teal primary, and an antique-gold
 * accent evoking manuscript illumination. Latin text is set in the Spectral
 * serif; Qur'anic Arabic in Amiri Quran (with Scheherazade New as an option).
 *
 * Nothing in the app hard-codes a colour — everything reads from the resolved
 * theme so light/dark and future themes stay consistent.
 */

export type ColorScheme = 'light' | 'dark';

/**
 * Visual theme palettes. Each palette provides a light and a dark variant and
 * composes with the user's light/dark mode. Adding a theme = add an entry to
 * PALETTES below (and a label in SettingsScreen) — nothing else changes.
 */
export type ThemePaletteId = 'bayan' | 'water' | 'forest';

/** Extra motion personality a palette can opt into. */
export type MotionProfile = 'none' | 'float';

/** Keys for user highlight colours. Stored in the DB; resolved per-theme. */
export type HighlightColorKey = 'amber' | 'green' | 'sky' | 'rose' | 'violet';

export interface HighlightSwatch {
  /** Background fill drawn behind the text. */
  bg: string;
  /** Stroke / underline colour used for the animated highlight. */
  stroke: string;
  /** Solid dot used in pickers and legends. */
  dot: string;
}

export interface ThemeColors {
  background: string;
  backgroundElevated: string;
  surface: string;
  surfaceAlt: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  divider: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textOnPrimary: string;

  primary: string;
  primaryDeep: string;
  primarySoft: string;
  primaryText: string;

  gold: string;
  goldSoft: string;
  goldText: string;

  danger: string;
  dangerSoft: string;
  success: string;

  overlay: string;
  scrim: string;
  focusRing: string;

  highlights: Record<HighlightColorKey, HighlightSwatch>;
}

export const lightColors: ThemeColors = {
  background: '#F6F1E7',
  backgroundElevated: '#FBF6EC',
  surface: '#FFFDF8',
  surfaceAlt: '#F0E8D8',
  surfaceSunken: '#ECE3D0',
  border: '#E3D8C2',
  borderStrong: '#D3C3A5',
  divider: '#EADFCB',

  textPrimary: '#211B13',
  textSecondary: '#6A5C46',
  textTertiary: '#998769',
  textOnPrimary: '#FFFFFF',

  primary: '#0E6E5C',
  primaryDeep: '#0A5344',
  primarySoft: '#DCEBE5',
  primaryText: '#0B5F4F',

  gold: '#AF8340',
  goldSoft: '#F1E7D0',
  goldText: '#8A6520',

  danger: '#B24230',
  dangerSoft: '#F5DED8',
  success: '#2E7D5B',

  overlay: 'rgba(33, 27, 19, 0.45)',
  scrim: 'rgba(33, 27, 19, 0.28)',
  focusRing: 'rgba(14, 110, 92, 0.4)',

  highlights: {
    amber: { bg: '#FAE8C2', stroke: '#D69E3B', dot: '#E0A93E' },
    green: { bg: '#D6EFD3', stroke: '#4E9E5F', dot: '#4E9E5F' },
    sky: { bg: '#D3E6F5', stroke: '#3E85C0', dot: '#3E85C0' },
    rose: { bg: '#F6DBE1', stroke: '#C55B76', dot: '#C55B76' },
    violet: { bg: '#E6DDF3', stroke: '#8163B5', dot: '#8163B5' },
  },
};

export const darkColors: ThemeColors = {
  background: '#100E0B',
  backgroundElevated: '#181410',
  surface: '#1E1914',
  surfaceAlt: '#26201A',
  surfaceSunken: '#0B0906',
  border: '#332B22',
  borderStrong: '#473C2F',
  divider: '#2A231C',

  textPrimary: '#F1E9DB',
  textSecondary: '#B4A78F',
  textTertiary: '#89795F',
  textOnPrimary: '#05201A',

  primary: '#33B89C',
  primaryDeep: '#1F8F79',
  primarySoft: '#123029',
  primaryText: '#5BD3B9',

  gold: '#D6B168',
  goldSoft: '#2C2415',
  goldText: '#E2C079',

  danger: '#E4765F',
  dangerSoft: '#3A211B',
  success: '#4FB98C',

  overlay: 'rgba(0, 0, 0, 0.62)',
  scrim: 'rgba(0, 0, 0, 0.5)',
  focusRing: 'rgba(51, 184, 156, 0.5)',

  highlights: {
    amber: { bg: '#4A3814', stroke: '#D6A244', dot: '#D6A244' },
    green: { bg: '#1C3A24', stroke: '#5FB472', dot: '#5FB472' },
    sky: { bg: '#183247', stroke: '#5AA0D6', dot: '#5AA0D6' },
    rose: { bg: '#42212A', stroke: '#D67D95', dot: '#D67D95' },
    violet: { bg: '#2C2545', stroke: '#A588D6', dot: '#A588D6' },
  },
};

/* ------------------------------------------------------------------ *
 * Theme palettes — "Clear Water" and "Forest" reuse the base parchment
 * palettes' highlight swatches and override the surfaces/accents. Palette
 * overrides are partial: anything not overridden inherits the base scheme.
 * ------------------------------------------------------------------ */

const waterLight: ThemeColors = {
  ...lightColors,
  background: '#EAF4F5',
  backgroundElevated: '#F2FAFA',
  surface: '#FBFEFE',
  surfaceAlt: '#DEEDEF',
  surfaceSunken: '#D2E5E8',
  border: '#C9E0E3',
  borderStrong: '#A6CBD2',
  divider: '#DCEBED',

  textPrimary: '#0F2327',
  textSecondary: '#3F626B',
  textTertiary: '#6E939B',

  primary: '#0E7490',
  primaryDeep: '#155E75',
  primarySoft: '#D2ECF2',
  primaryText: '#0B6076',

  gold: '#B9915B',
  goldSoft: '#EFE9DB',
  goldText: '#8E6B33',

  overlay: 'rgba(15, 35, 39, 0.45)',
  scrim: 'rgba(15, 35, 39, 0.28)',
  focusRing: 'rgba(14, 116, 144, 0.4)',
};

const waterDark: ThemeColors = {
  ...darkColors,
  background: '#07161A',
  backgroundElevated: '#0B1E23',
  surface: '#102830',
  surfaceAlt: '#153039',
  surfaceSunken: '#040F12',
  border: '#1E3A42',
  borderStrong: '#2C505A',
  divider: '#163138',

  textPrimary: '#E2F1F2',
  textSecondary: '#9BBCC2',
  textTertiary: '#678A92',
  textOnPrimary: '#032226',

  primary: '#37B6C4',
  primaryDeep: '#1E8C99',
  primarySoft: '#0E2E33',
  primaryText: '#63D3DE',

  gold: '#CBB479',
  goldSoft: '#232D2C',
  goldText: '#DCC488',

  overlay: 'rgba(0, 8, 10, 0.62)',
  scrim: 'rgba(0, 8, 10, 0.5)',
  focusRing: 'rgba(55, 182, 196, 0.5)',
};

const forestLight: ThemeColors = {
  ...lightColors,
  background: '#EFF5EA',
  backgroundElevated: '#F6FAF1',
  surface: '#FCFEF9',
  surfaceAlt: '#E2EDD8',
  surfaceSunken: '#D7E5CB',
  border: '#D2E2C4',
  borderStrong: '#B3CD9E',
  divider: '#E0EBD3',

  textPrimary: '#18220F',
  textSecondary: '#4C6238',
  textTertiary: '#7C9464',

  primary: '#2F7D3B',
  primaryDeep: '#225E2B',
  primarySoft: '#DBEDD8',
  primaryText: '#2A6E34',

  gold: '#B98A3A',
  goldSoft: '#F0E8CF',
  goldText: '#8C6A25',

  overlay: 'rgba(24, 34, 15, 0.45)',
  scrim: 'rgba(24, 34, 15, 0.28)',
  focusRing: 'rgba(47, 125, 59, 0.4)',
};

const forestDark: ThemeColors = {
  ...darkColors,
  background: '#0B120A',
  backgroundElevated: '#101A0E',
  surface: '#152113',
  surfaceAlt: '#1B2A18',
  surfaceSunken: '#070D06',
  border: '#263A22',
  borderStrong: '#36512F',
  divider: '#1F3019',

  textPrimary: '#E8F1DF',
  textSecondary: '#AFC49B',
  textTertiary: '#7C9268',
  textOnPrimary: '#04240E',

  primary: '#54B96A',
  primaryDeep: '#37934F',
  primarySoft: '#16301B',
  primaryText: '#7BD48B',

  gold: '#D2B45E',
  goldSoft: '#2A2913',
  goldText: '#DFC26E',

  overlay: 'rgba(2, 8, 2, 0.62)',
  scrim: 'rgba(2, 8, 2, 0.5)',
  focusRing: 'rgba(84, 185, 106, 0.5)',
};

export interface ThemePalette {
  id: ThemePaletteId;
  /** Shown in Settings. */
  label: string;
  description: string;
  light: ThemeColors;
  dark: ThemeColors;
  motionProfile: MotionProfile;
}

/** Palette registry — add new themes here. */
export const PALETTES: Record<ThemePaletteId, ThemePalette> = {
  bayan: {
    id: 'bayan',
    label: 'Bayān',
    description: 'Warm parchment and manuscript gold — the classic look.',
    light: lightColors,
    dark: darkColors,
    motionProfile: 'none',
  },
  water: {
    id: 'water',
    label: 'Clear Water',
    description: 'Cool aqua surfaces; verses drift gently as you scroll.',
    light: waterLight,
    dark: waterDark,
    motionProfile: 'float',
  },
  forest: {
    id: 'forest',
    label: 'Forest',
    description: 'Deep greens and garden light.',
    light: forestLight,
    dark: forestDark,
    motionProfile: 'none',
  },
};

export const PALETTE_ORDER: ThemePaletteId[] = ['bayan', 'water', 'forest'];

export const HIGHLIGHT_ORDER: HighlightColorKey[] = ['amber', 'green', 'sky', 'rose', 'violet'];

/** 4/8-based spacing scale. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
  giant: 72,
} as const;

export const radii = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
  pill: 999,
} as const;

/**
 * Font family names. These strings must match the keys registered with
 * expo-font's useFonts() in App.tsx.
 */
export const fonts = {
  quran: 'AmiriQuran',
  quranAlt: 'ScheherazadeNew',
  quranAltBold: 'ScheherazadeNew-Bold',
  serif: 'Spectral',
  serifMedium: 'Spectral-Medium',
  serifSemibold: 'Spectral-SemiBold',
  // Functional UI chrome (tab labels, small buttons) uses the platform sans.
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }) as string,
  sansMedium: Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    default: 'System',
  }) as string,
} as const;

/** Latin type scale. Arabic sizing is computed separately (user-adjustable). */
export const type = {
  display: {
    fontFamily: fonts.serifSemibold,
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: -0.6,
  },
  h1: { fontFamily: fonts.serifSemibold, fontSize: 27, lineHeight: 34, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.serifSemibold, fontSize: 22, lineHeight: 29, letterSpacing: -0.3 },
  h3: { fontFamily: fonts.serifMedium, fontSize: 18, lineHeight: 25, letterSpacing: -0.1 },
  title: { fontFamily: fonts.serifMedium, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 26 },
  bodyLg: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 30 },
  callout: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 23 },
  label: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 17, letterSpacing: 0.2 },
  caption: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  overline: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

/** Motion tokens for Reanimated. */
export const motion = {
  duration: {
    instant: 90,
    fast: 160,
    base: 240,
    slow: 360,
    xslow: 520,
  },
  spring: {
    gentle: { damping: 20, stiffness: 170, mass: 1 },
    bouncy: { damping: 13, stiffness: 210, mass: 0.9 },
    stiff: { damping: 28, stiffness: 340, mass: 1 },
    panel: { damping: 24, stiffness: 260, mass: 1 },
    press: { damping: 18, stiffness: 420, mass: 0.7 },
  },
} as const;

export const zIndex = {
  base: 0,
  header: 10,
  sheetBackdrop: 40,
  sheet: 50,
  toast: 90,
} as const;

/** Cross-platform elevation presets. */
export function makeElevation(scheme: ColorScheme) {
  const shadowColor = scheme === 'light' ? '#3A2E1C' : '#000000';
  const build = (opacity: number, radius: number, offsetY: number, elevation: number): ViewStyle => ({
    shadowColor,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height: offsetY },
    elevation,
  });
  return {
    none: build(0, 0, 0, 0),
    sm: build(scheme === 'light' ? 0.08 : 0.32, 6, 2, 2),
    md: build(scheme === 'light' ? 0.1 : 0.4, 14, 6, 6),
    lg: build(scheme === 'light' ? 0.14 : 0.5, 24, 12, 12),
    xl: build(scheme === 'light' ? 0.18 : 0.6, 36, 18, 20),
  } satisfies Record<string, ViewStyle>;
}

export type Elevations = ReturnType<typeof makeElevation>;

export interface Theme {
  scheme: ColorScheme;
  paletteId: ThemePaletteId;
  /** Palette-declared motion personality (water → 'float'). */
  motionProfile: MotionProfile;
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  fonts: typeof fonts;
  type: typeof type;
  motion: typeof motion;
  zIndex: typeof zIndex;
  elevation: Elevations;
}

export function buildTheme(scheme: ColorScheme, paletteId: ThemePaletteId = 'bayan'): Theme {
  const palette = PALETTES[paletteId] ?? PALETTES.bayan;
  return {
    scheme,
    paletteId: palette.id,
    motionProfile: palette.motionProfile,
    colors: scheme === 'light' ? palette.light : palette.dark,
    spacing,
    radii,
    fonts,
    type,
    motion,
    zIndex,
    elevation: makeElevation(scheme),
  };
}
