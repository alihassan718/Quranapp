import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { TypeVariant } from '../../theme/tokens';

export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'onPrimary' | string;

interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  tone?: TextTone;
  center?: boolean;
}

/**
 * Themed text. `variant` selects a type-scale entry; `tone` selects a semantic
 * text colour (or accepts a raw colour string).
 */
export function AppText({
  variant = 'body',
  tone = 'primary',
  center,
  style,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  const color =
    tone === 'primary'
      ? theme.colors.textPrimary
      : tone === 'secondary'
        ? theme.colors.textSecondary
        : tone === 'tertiary'
          ? theme.colors.textTertiary
          : tone === 'onPrimary'
            ? theme.colors.textOnPrimary
            : tone;
  return (
    <Text
      style={[theme.type[variant], { color }, center && styles.center, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({ center: { textAlign: 'center' } });
