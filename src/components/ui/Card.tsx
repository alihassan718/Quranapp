import React from 'react';
import { View, ViewProps, ViewStyle } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';

interface CardProps extends ViewProps {
  elevation?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  padded?: boolean;
  bordered?: boolean;
  surface?: 'surface' | 'surfaceAlt' | 'backgroundElevated';
  radius?: number;
}

export function Card({
  elevation = 'sm',
  padded = true,
  bordered = true,
  surface = 'surface',
  radius,
  style,
  children,
  ...rest
}: CardProps) {
  const theme = useTheme();
  const cardStyle: ViewStyle = {
    backgroundColor: theme.colors[surface],
    borderRadius: radius ?? theme.radii.lg,
    padding: padded ? theme.spacing.base : 0,
    borderWidth: bordered ? 1 : 0,
    borderColor: theme.colors.border,
    ...theme.elevation[elevation],
  };
  return (
    <View style={[cardStyle, style]} {...rest}>
      {children}
    </View>
  );
}
