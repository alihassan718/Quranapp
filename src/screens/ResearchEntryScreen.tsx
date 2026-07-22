import { RouteProp, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  FlatList,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ResearchEntryCard, FIELD_LABELS, fieldDot, statusChip } from '../components/research/ResearchEntryCard';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { Divider } from '../components/ui/Divider';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { PressableScale } from '../components/ui/PressableScale';
import { AppText } from '../components/ui/Text';
import { getReadingPosition, setReadingPosition } from '../data/researchProgress';
import { Citation } from '../data/researchSchema';
import { getRelatedEntries, getResearchEntry } from '../data/researchStore';
import { addBoardNode } from '../data/userStore';
import { useUserDb } from '../state/DatabaseProvider';
import { useAppNavigation, RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { haptics } from '../utils/haptics';

/**
 * A single Research entry — a focused, single-idea reading view with
 * progressive disclosure: hook → summary → go deeper → citations.
 * Connection entries render their three parts VISUALLY SEPARATED so the
 * layers never blur: cited knowledge / attributed proposal / status.
 */
export function ResearchEntryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const userDb = useUserDb();
  const route = useRoute<RouteProp<RootStackParamList, 'ResearchEntry'>>();
  const entry = getResearchEntry(route.params.entryId);
  const related = entry ? getRelatedEntries(entry.id) : [];

  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useSharedValue(0);
  const [pinned, setPinned] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: entry ? FIELD_LABELS[entry.field] : 'Research' });
  }, [navigation, entry]);

  // Restore remembered reading position.
  useEffect(() => {
    if (!entry) return;
    let alive = true;
    (async () => {
      const pos = await getReadingPosition(entry.id);
      if (alive && pos > 40) {
        setTimeout(() => scrollRef.current?.scrollTo({ y: pos, animated: false }), 80);
      }
    })();
    return () => {
      alive = false;
    };
  }, [entry]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      scrollY.value = y;
      if (entry) setReadingPosition(entry.id, y);
    },
    [entry, scrollY],
  );

  // Subtle parallax: the title block drifts up slightly slower than the page.
  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scrollY.value * 0.12 }],
  }));

  const pinEntry = useCallback(async () => {
    if (!entry) return;
    const { existed } = await addBoardNode(userDb, 'entry', entry.id);
    haptics.success();
    setPinned(true);
    setTimeout(() => setPinned(false), 1600);
    if (existed) {
      // Already on the board — treat as a friendly confirmation, not an error.
    }
  }, [entry, userDb]);

  if (!entry) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center' }}>
        <EmptyState icon="cloud-offline-outline" title="Entry not found" subtitle="This entry isn't in the bundled data." />
      </View>
    );
  }

  const status = statusChip(theme, entry.status);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: insets.bottom + theme.spacing.giant,
        }}
      >
        {/* Title block (parallax) */}
        <Animated.View style={[{ gap: theme.spacing.sm, marginBottom: theme.spacing.lg }, headerStyle]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: fieldDot(theme, entry.field) }} />
            <AppText variant="overline" tone="tertiary">
              {FIELD_LABELS[entry.field]} · {entry.type === 'connection' ? 'CONNECTION' : 'KNOWLEDGE'}
            </AppText>
            <View style={{ flex: 1 }} />
            <PressableScale haptic="medium" activeScale={0.85} onPress={pinEntry}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pinned ? theme.colors.primarySoft : theme.colors.surfaceAlt,
                }}
              >
                <Icon name={pinned ? 'checkmark' : 'pin-outline'} size={18} tone={pinned ? 'accent' : 'secondary'} />
              </View>
            </PressableScale>
          </View>
          <AppText variant="h1">{entry.title}</AppText>
          <AppText variant="bodyLg" tone="secondary" style={{ fontFamily: theme.fonts.serifMedium }}>
            {entry.hook}
          </AppText>
          {entry.reviewFlag ? (
            <Chip label="Under review" small bg={theme.colors.goldSoft} fg={theme.colors.goldText} />
          ) : null}
        </Animated.View>

        {/* Summary — the entry's own words */}
        <AppText variant="bodyLg" style={{ marginBottom: theme.spacing.lg }}>
          {entry.summary}
        </AppText>

        {/* Connection triad — three visually distinct layers */}
        {entry.type === 'connection' ? (
          <View style={{ gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
            {/* 1 — the verse */}
            {entry.verseRef ? (
              <PressableScale
                haptic="selection"
                activeScale={0.98}
                onPress={() => navigation.navigate('Reader', { surah: entry.verseRef!.surah, ayah: entry.verseRef!.ayah })}
              >
                <Card surface="surfaceAlt" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.base }}>
                  <Icon name="book-outline" size={20} tone="accent" />
                  <View style={{ flex: 1 }}>
                    <AppText variant="title">
                      Qur'an {entry.verseRef.surah}:{entry.verseRef.ayah}
                    </AppText>
                    <AppText variant="caption" tone="tertiary">
                      Read it in context, word by word
                    </AppText>
                  </View>
                  <Icon name="chevron-forward" size={18} tone="tertiary" />
                </Card>
              </PressableScale>
            ) : null}

            {/* 2 — what current knowledge says (cited) */}
            <Card surface="surface" style={{ gap: theme.spacing.sm }}>
              <AppText variant="overline" tone="tertiary">
                WHAT CURRENT KNOWLEDGE SAYS
              </AppText>
              <AppText variant="body">{entry.whatKnowledgeSays}</AppText>
            </Card>

            {/* 3 — the proposed connection (attributed, never the app's claim) */}
            <Card
              surface="surface"
              style={{ gap: theme.spacing.sm, borderLeftWidth: 3, borderLeftColor: theme.colors.gold }}
            >
              <AppText variant="overline" tone="tertiary">
                THE PROPOSED CONNECTION
              </AppText>
              <AppText variant="body">{entry.proposedConnection}</AppText>
              <AppText variant="caption" tone="tertiary">
                As proposed by: {entry.proposer}
              </AppText>
            </Card>

            {/* status */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm }}>
              {status ? <Chip label={status.label} bg={status.bg} fg={status.fg} /> : null}
              <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>
                {entry.statusNote}
              </AppText>
            </View>
          </View>
        ) : null}

        {/* Go deeper — progressive disclosure */}
        {entry.detail ? <GoDeeper detail={entry.detail} /> : null}

        {/* Review flag detail — honesty over polish */}
        {entry.reviewFlag ? (
          <Card surface="surfaceAlt" elevation="none" style={{ marginTop: theme.spacing.lg, gap: 4 }}>
            <AppText variant="overline" tone="tertiary">
              REVIEW NOTE
            </AppText>
            <AppText variant="caption" tone="secondary">
              {entry.reviewFlag}
            </AppText>
          </Card>
        ) : null}

        {/* Citations */}
        <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.sm }}>
          <AppText variant="overline" tone="tertiary">
            SOURCES
          </AppText>
          {entry.citations.map((c, i) => (
            <CitationRow key={`${c.url}-${i}`} citation={c} />
          ))}
        </View>

        {/* Related strip */}
        {related.length ? (
          <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.sm }}>
            <AppText variant="overline" tone="tertiary">
              RELATED
            </AppText>
            <FlatList
              horizontal
              data={related}
              keyExtractor={(e) => e.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: theme.spacing.md, paddingRight: theme.spacing.lg }}
              renderItem={({ item }) => (
                <ResearchEntryCard
                  compact
                  entry={item}
                  // push (not navigate) so related→related builds a browsable trail
                  onPress={(e) => navigation.push('ResearchEntry', { entryId: e.id })}
                />
              )}
            />
          </View>
        ) : null}

        <Divider style={{ marginTop: theme.spacing.xl }} />
        <AppText variant="caption" tone="tertiary" style={{ marginTop: theme.spacing.md }}>
          Curated summary in the app's own words; metadata cited above. DATA UNDER TEST — not yet
          scholar-reviewed.
        </AppText>
      </ScrollView>
    </View>
  );
}

/** Spring-revealed detail section. Chevron rotates; content slides in. */
function GoDeeper({ detail }: { detail: string }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const reveal = useSharedValue(0);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    reveal.value = next ? withSpring(1, theme.motion.spring.gentle) : withTiming(0, { duration: 160 });
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${reveal.value * 180}deg` }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: (1 - reveal.value) * 10 }],
  }));

  return (
    <Card surface="surface" style={{ gap: theme.spacing.sm }}>
      <PressableScale haptic="selection" activeScale={0.99} onPress={toggle}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Icon name="layers-outline" size={16} tone="accent" />
          <AppText variant="title" style={{ flex: 1 }}>
            Go deeper
          </AppText>
          <Animated.View style={chevronStyle}>
            <Icon name="chevron-down" size={18} tone="tertiary" />
          </Animated.View>
        </View>
      </PressableScale>
      {open ? (
        <Animated.View style={bodyStyle}>
          <AppText variant="body" tone="secondary">
            {detail}
          </AppText>
        </Animated.View>
      ) : null}
    </Card>
  );
}

function CitationRow({ citation }: { citation: Citation }) {
  const theme = useTheme();
  const accessLabel: Record<Citation['access'], string> = {
    'open-access': 'Open access',
    'free-to-read': 'Free to read',
    'public-domain': 'Public domain',
    'metadata-only': 'Metadata only',
  };
  return (
    <PressableScale
      haptic="selection"
      activeScale={0.98}
      onPress={() => Linking.openURL(citation.url).catch(() => {})}
    >
      <Card surface="surface" elevation="none" style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <AppText variant="label" tone="secondary" style={{ flex: 1 }}>
            {citation.source}
          </AppText>
          <Chip label={accessLabel[citation.access]} small outline />
          <Icon name="open-outline" size={14} tone="accent" />
        </View>
        <AppText variant="callout">{citation.title}</AppText>
        {citation.authors || citation.year ? (
          <AppText variant="caption" tone="tertiary">
            {[citation.authors, citation.year].filter(Boolean).join(' · ')}
          </AppText>
        ) : null}
      </Card>
    </PressableScale>
  );
}
