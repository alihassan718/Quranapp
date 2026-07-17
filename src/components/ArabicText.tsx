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
  lineHeightMultiplier = 1.7,
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
          lineHeight: finalSize * lineHeightMultiplier,
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
