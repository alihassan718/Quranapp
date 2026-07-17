import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

import { useSettings } from '../../state/SettingsContext';
import { useTheme } from '../../theme/ThemeProvider';
import { TypeVariant } from '../../theme/tokens';

interface TranslationTextProps {
  children: React.ReactNode;
  variant?: TypeVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

/** Translation body text that respects the user's translation font-size scale. */
export function TranslationText({
  children,
  variant = 'bodyLg',
  color,
  style,
  numberOfLines,
}: TranslationTextProps) {
  const theme = useTheme();
  const { settings } = useSettings();
  const base = theme.type[variant];
  const scale = settings.translationFontScale;
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        base,
        {
          fontSize: base.fontSize * scale,
          lineHeight: base.lineHeight * scale,
          color: color ?? theme.colors.textPrimary,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
