import { Ionicons } from '@expo/vector-icons';
import React from 'react';

import { useTheme } from '../../theme/ThemeProvider';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  tone?: 'primary' | 'secondary' | 'tertiary' | 'accent' | 'onPrimary';
}

export function Icon({ name, size = 20, color, tone = 'secondary' }: IconProps) {
  const theme = useTheme();
  const resolved =
    color ??
    (tone === 'primary'
      ? theme.colors.textPrimary
      : tone === 'tertiary'
        ? theme.colors.textTertiary
        : tone === 'accent'
          ? theme.colors.primary
          : tone === 'onPrimary'
            ? theme.colors.textOnPrimary
            : theme.colors.textSecondary);
  return <Ionicons name={name} size={size} color={resolved} />;
}
