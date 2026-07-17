import React from 'react';
import { View, ViewStyle } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';

export function Divider({ style, inset = 0 }: { style?: ViewStyle; inset?: number }) {
  const theme = useTheme();
  return (
    <View
      style={[
        { height: 1, backgroundColor: theme.colors.divider, marginHorizontal: inset },
        style,
      ]}
    />
  );
}
