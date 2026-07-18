import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

import { useSettings } from '../state/SettingsContext';
import { useTheme } from '../theme/ThemeProvider';

interface ArabicTextProps {
  text: string;
  /** Base font size before the user's Arabic scale is applied. */
  size?: number;
  /** Apply the user's arabicFontScale setting (default true). */
  scaled?: boolean;
  color?: string;
  /**
   * Optional explicit line height (× font size). Leave unset to use the font's
   * own metrics — Amiri Quran / Scheherazade metrics reserve room for stacked
   * diacritics, and Android hard-clips glyphs that overflow a forced lineHeight,
   * so only pass a value when extra inter-line spacing is deliberately wanted
   * (use ≥ 2 for Qur'anic text with marks).
   */
  lineHeightMultiplier?: number;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  /** Force a specific font regardless of user setting. */
  font?: 'amiri' | 'scheherazade';
}

/**
 * Renders Qur'anic Arabic with the correct font, RTL direction, and the user's
 * chosen Arabic font-size scale.
 */
export function ArabicText({
  text,
  size = 30,
  scaled = true,
  color,
  lineHeightMultiplier,
  align = 'right',
  style,
  numberOfLines,
  font,
}: ArabicTextProps) {
  const theme = useTheme();
  const { settings } = useSettings();
  const which = font ?? settings.arabicFont;
  const fontFamily = which === 'scheherazade' ? theme.fonts.quranAlt : theme.fonts.quran;
  const finalSize = scaled ? size * settings.arabicFontScale : size;

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily,
          fontSize: finalSize,
          lineHeight: lineHeightMultiplier ? finalSize * lineHeightMultiplier : undefined,
          color: color ?? theme.colors.textPrimary,
          textAlign: align,
          writingDirection: 'rtl',
        },
        style,
      ]}
    >
      {text}
    </Text>
  );
}
