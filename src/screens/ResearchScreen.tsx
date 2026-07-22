import React, { useMemo, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ResearchEntryCard, FIELD_ICONS, FIELD_LABELS, fieldDot } from '../components/research/ResearchEntryCard';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { PressableScale } from '../components/ui/PressableScale';
import { AppText } from '../components/ui/Text';
import { getFieldCounts, searchResearch } from '../data/researchStore';
import { ResearchFieldId } from '../data/researchSchema';
import { useAppNavigation } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';

type FieldFilter = ResearchFieldId | 'all';

/**
 * Research — a curated, offline knowledge space. Curated summaries with
 * sources; connection entries are attributed reflections, not proofs.
 */
export function ResearchScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();

  const [query, setQuery] = useState('');
  const [field, setField] = useState<FieldFilter>('all');

  const entries = useMemo(() => searchResearch(query, field), [query, field]);
  const fields = useMemo(() => getFieldCounts(), []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: insets.top + theme.spacing.base,
          paddingBottom: insets.bottom + theme.spacing.xxl,
          gap: theme.spacing.md,
        }}
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.md, marginBottom: theme.spacing.xs }}>
            <View>
              <AppText variant="overline" tone="tertiary">
                READ · CONNECT · ANNOTATE
              </AppText>
              <AppText variant="display" style={{ marginTop: 4 }}>
                Research
              </AppText>
              <AppText variant="caption" tone="tertiary" style={{ marginTop: theme.spacing.sm }}>
                Curated summaries with sources. Connection entries are attributed reflections — never proofs.
                Content is under review.
              </AppText>
            </View>

            {/* The user's own space */}
            <PressableScale haptic="selection" activeScale={0.98} onPress={() => navigation.navigate('ResearchBoard')}>
              <Card surface="surfaceAlt" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.base }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.colors.primarySoft,
                  }}
                >
                  <Icon name="git-network-outline" size={22} tone="accent" />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="h3">My Board</AppText>
                  <AppText variant="caption" tone="secondary">
                    Your thinking space — pin entries and āyāt, draw your own connections.
                  </AppText>
                </View>
                <Icon name="chevron-forward" size={18} tone="tertiary" />
              </Card>
            </PressableScale>

            {/* Search */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.sm,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radii.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
                paddingHorizontal: theme.spacing.md,
              }}
            >
              <Icon name="search" size={16} tone="tertiary" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search entries, tags, proposers…"
                placeholderTextColor={theme.colors.textTertiary}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  fontFamily: theme.fonts.serif,
                  fontSize: 15,
                  color: theme.colors.textPrimary,
                }}
              />
            </View>

            {/* Field filter chips */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              <FilterChip label="All" active={field === 'all'} onPress={() => setField('all')} />
              {fields.map((f) => (
                <FilterChip
                  key={f.id}
                  label={`${FIELD_LABELS[f.id]} · ${f.count}`}
                  icon={FIELD_ICONS[f.id]}
                  dot={fieldDot(theme, f.id)}
                  active={field === f.id}
                  onPress={() => setField(field === f.id ? 'all' : f.id)}
                />
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <ResearchEntryCard entry={item} onPress={(e) => navigation.navigate('ResearchEntry', { entryId: e.id })} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="cloud-outline"
            title="No entries match"
            subtitle="Try a different search, or clear the field filter."
          />
        }
      />
    </View>
  );
}

function FilterChip({
  label,
  icon,
  dot,
  active,
  onPress,
}: {
  label: string;
  icon?: React.ComponentProps<typeof Icon>['name'];
  dot?: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressableScale haptic="selection" activeScale={0.95} onPress={onPress}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: 7,
          borderRadius: theme.radii.pill,
          backgroundColor: active ? theme.colors.primarySoft : theme.colors.surface,
          borderWidth: 1,
          borderColor: active ? theme.colors.primary : theme.colors.border,
        }}
      >
        {dot ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: dot }} /> : icon ? (
          <Icon name={icon} size={13} tone={active ? 'accent' : 'tertiary'} />
        ) : null}
        <AppText variant="label" tone={active ? theme.colors.primaryText : theme.colors.textSecondary}>
          {label}
        </AppText>
      </View>
    </PressableScale>
  );
}
