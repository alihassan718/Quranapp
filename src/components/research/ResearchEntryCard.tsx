import React from 'react';
import { View } from 'react-native';

import { ResearchEntry } from '../../data/researchSchema';
import { useTheme } from '../../theme/ThemeProvider';
import { Theme } from '../../theme/tokens';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { Icon, IconName } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import { AppText } from '../ui/Text';

export const FIELD_ICONS: Record<string, IconName> = {
  science: 'flask-outline',
  maths: 'calculator-outline',
  philosophy: 'bulb-outline',
  psychology: 'extension-puzzle-outline',
  medicine: 'medkit-outline',
};

export const FIELD_LABELS: Record<string, string> = {
  science: 'Science',
  maths: 'Maths',
  philosophy: 'Philosophy',
  psychology: 'Psychology',
  medicine: 'Medicine',
};

/** Per-field accent dot, reusing the theme's highlight swatches. */
export function fieldDot(theme: Theme, field: string): string {
  const map: Record<string, string> = {
    science: theme.colors.highlights.sky.dot,
    maths: theme.colors.highlights.violet.dot,
    philosophy: theme.colors.highlights.amber.dot,
    psychology: theme.colors.highlights.rose.dot,
    medicine: theme.colors.highlights.green.dot,
  };
  return map[field] ?? theme.colors.primary;
}

export function statusChip(theme: Theme, status: string | null): { label: string; bg: string; fg: string } | null {
  switch (status) {
    case 'widely-discussed':
      return { label: 'Widely discussed', bg: theme.colors.primarySoft, fg: theme.colors.primaryText };
    case 'contested':
      return { label: 'Contested', bg: theme.colors.goldSoft, fg: theme.colors.goldText };
    case 'criticized':
      return { label: 'Criticized', bg: theme.colors.dangerSoft, fg: theme.colors.danger };
    default:
      return null;
  }
}

interface Props {
  entry: ResearchEntry;
  onPress: (entry: ResearchEntry) => void;
  compact?: boolean;
}

/** One Research entry as an elegant tappable card. */
export function ResearchEntryCard({ entry, onPress, compact }: Props) {
  const theme = useTheme();
  const status = statusChip(theme, entry.status);
  return (
    <PressableScale haptic="selection" activeScale={0.98} onPress={() => onPress(entry)}>
      <Card
        surface="surface"
        style={{ gap: theme.spacing.sm, width: compact ? 250 : undefined, minHeight: compact ? 132 : undefined }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: fieldDot(theme, entry.field) }} />
          <AppText variant="overline" tone="tertiary">
            {FIELD_LABELS[entry.field] ?? entry.field}
          </AppText>
          <View style={{ flex: 1 }} />
          {entry.type === 'connection' ? (
            <Icon name="link-outline" size={14} tone="tertiary" />
          ) : null}
        </View>
        <AppText variant={compact ? 'title' : 'h3'} numberOfLines={compact ? 2 : undefined}>
          {entry.title}
        </AppText>
        <AppText variant="callout" tone="secondary" numberOfLines={compact ? 2 : 3} style={{ flex: compact ? 1 : undefined }}>
          {entry.hook}
        </AppText>
        {!compact ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {status ? <Chip label={status.label} small bg={status.bg} fg={status.fg} /> : null}
            {entry.verseRef ? (
              <Chip label={`Q ${entry.verseRef.surah}:${entry.verseRef.ayah}`} small bg={theme.colors.surfaceAlt} />
            ) : null}
            {entry.tags.slice(0, status ? 2 : 3).map((t) => (
              <Chip key={t} label={t} small outline />
            ))}
          </View>
        ) : status ? (
          <Chip label={status.label} small bg={status.bg} fg={status.fg} />
        ) : null}
      </Card>
    </PressableScale>
  );
}
