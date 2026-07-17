import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { Icon, IconName } from './Icon';
import { AppText } from './Text';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = 'sparkles-outline', title, subtitle }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xxl, gap: theme.spacing.sm }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.surfaceAlt,
          marginBottom: theme.spacing.xs,
        }}
      >
        <Icon name={icon} size={28} tone="tertiary" />
      </View>
      <AppText variant="h3" center>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="callout" tone="secondary" center style={{ maxWidth: 300 }}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}
