import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from './Text';

interface ChipProps {
  label: string;
  bg?: string;
  fg?: string;
  outline?: boolean;
  dot?: string;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}

/** A small pill label (POS tags, Meccan/Medinan, counts, license status). */
export function Chip({ label, bg, fg, outline, dot, style, small }: ChipProps) {
  const theme = useTheme();
  const background = outline ? 'transparent' : (bg ?? theme.colors.surfaceAlt);
  const foreground = fg ?? theme.colors.textSecondary;
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          backgroundColor: background,
          borderRadius: theme.radii.pill,
          paddingHorizontal: small ? theme.spacing.sm : theme.spacing.md,
          paddingVertical: small ? 3 : 5,
          borderWidth: outline ? 1 : 0,
          borderColor: fg ?? theme.colors.border,
          gap: 6,
        },
        style,
      ]}
    >
      {dot ? (
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: dot }} />
      ) : null}
      <AppText variant={small ? 'caption' : 'label'} tone={foreground}>
        {label}
      </AppText>
    </View>
  );
}
