import React from 'react';
import { View } from 'react-native';

import { LicenseStatus } from '../domain/models';
import { useTheme } from '../theme/ThemeProvider';
import { Chip } from './ui/Chip';
import { Icon } from './ui/Icon';
import { AppText } from './ui/Text';

interface AttributionBadgeProps {
  /** Person or work being credited, e.g. "Abdullah Yusuf Ali". */
  name: string;
  year?: string | null;
  licenseStatus?: LicenseStatus;
  /** Extra line, e.g. the work title or source. */
  detail?: string | null;
  compact?: boolean;
}

const STATUS_LABEL: Record<LicenseStatus, string> = {
  'public-domain': 'Public domain',
  contested: 'Rights contested',
  licensed: 'Licensed',
};

/**
 * A clearly-visible attribution block. The app never presents a rendering
 * anonymously — every named translation/source is credited with this.
 */
export function AttributionBadge({
  name,
  year,
  licenseStatus,
  detail,
  compact,
}: AttributionBadgeProps) {
  const theme = useTheme();
  const statusColor =
    licenseStatus === 'contested'
      ? { bg: theme.colors.dangerSoft, fg: theme.colors.danger }
      : licenseStatus === 'licensed'
        ? { bg: theme.colors.goldSoft, fg: theme.colors.goldText }
        : { bg: theme.colors.primarySoft, fg: theme.colors.primaryText };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
      <Icon name="ribbon-outline" size={15} tone="accent" />
      <AppText variant={compact ? 'label' : 'title'} tone="primary">
        {name}
        {year ? <AppText variant="label" tone="tertiary">{`  ·  ${year}`}</AppText> : null}
      </AppText>
      {licenseStatus ? (
        <Chip label={STATUS_LABEL[licenseStatus]} bg={statusColor.bg} fg={statusColor.fg} small />
      ) : null}
      {detail ? (
        <AppText variant="caption" tone="tertiary" style={{ width: '100%' }}>
          {detail}
        </AppText>
      ) : null}
    </View>
  );
}
