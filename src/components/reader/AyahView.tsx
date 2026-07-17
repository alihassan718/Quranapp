import React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AyahWithWords, Word } from '../../domain/models';
import { useAnnotations } from '../../state/AnnotationsContext';
import { useSettings } from '../../state/SettingsContext';
import { useTheme } from '../../theme/ThemeProvider';
import { ayahMarker } from '../../utils/arabic';
import { haptics } from '../../utils/haptics';
import { ArabicText } from '../ArabicText';
import { Icon, IconName } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import { AppText } from '../ui/Text';
import { WordChip } from './WordChip';

interface AyahViewProps {
  ayah: AyahWithWords;
  onWordPress: (word: Word) => void;
  onHighlight: () => void;
  onNote: () => void;
  onCompare: () => void;
  onShare: () => void;
}

const VERSE_BASE_SIZE = 32;

export const AyahView = React.memo(function AyahView({
  ayah,
  onWordPress,
  onHighlight,
  onNote,
  onCompare,
  onShare,
}: AyahViewProps) {
  const theme = useTheme();
  const { settings } = useSettings();
  const { getAyahHighlight, getWordHighlight, getNote, isBookmarked, toggleBookmark } = useAnnotations();

  const ayahHl = getAyahHighlight(ayah.surah, ayah.ayah);
  const note = getNote(ayah.surah, ayah.ayah);
  const bookmarked = isBookmarked(ayah.surah, ayah.ayah);
  const hlSwatch = ayahHl ? theme.colors.highlights[ayahHl.color] : null;

  return (
    <View style={{ paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md }}>
      <View
        style={{
          borderRadius: theme.radii.lg,
          overflow: 'hidden',
          paddingHorizontal: hlSwatch ? theme.spacing.sm : 0,
          paddingVertical: hlSwatch ? theme.spacing.sm : 0,
        }}
      >
        {hlSwatch ? (
          <Animated.View
            key={ayahHl?.color}
            entering={FadeIn.duration(240)}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: hlSwatch.bg,
              borderRadius: theme.radii.lg,
              borderRightWidth: 3,
              borderRightColor: hlSwatch.stroke,
            }}
          />
        ) : null}

        {/* Verse: RTL flow of individually tappable words + end marker */}
        <View
          style={{
            flexDirection: 'row-reverse',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          {ayah.words.map((w) => (
            <WordChip
              key={w.position}
              word={w}
              size={VERSE_BASE_SIZE}
              highlight={getWordHighlight(ayah.surah, ayah.ayah, w.position)}
              onPress={onWordPress}
            />
          ))}
          <View style={{ paddingHorizontal: 4 }}>
            <ArabicText
              text={ayahMarker(ayah.ayah)}
              size={VERSE_BASE_SIZE - 2}
              color={theme.colors.gold}
              lineHeightMultiplier={1.5}
            />
          </View>
        </View>
      </View>

      {/* Meta + actions */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.sm }}>
        <AppText variant="caption" tone="tertiary">
          {ayah.surah}:{ayah.ayah}
        </AppText>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
          <ActionButton icon="color-palette-outline" active={!!ayahHl} onPress={onHighlight} />
          <ActionButton icon={note ? 'create' : 'create-outline'} active={!!note} onPress={onNote} />
          <ActionButton
            icon={bookmarked ? 'bookmark' : 'bookmark-outline'}
            active={bookmarked}
            onPress={() => {
              haptics.light();
              toggleBookmark(ayah.surah, ayah.ayah);
            }}
          />
          <ActionButton icon="layers-outline" onPress={onCompare} />
          <ActionButton icon="share-outline" onPress={onShare} />
        </View>
      </View>

      {/* Note preview */}
      {note ? (
        <PressableScale onPress={onNote} activeScale={0.99} haptic={false} style={{ marginTop: theme.spacing.sm }}>
          <View
            style={{
              flexDirection: 'row',
              gap: theme.spacing.sm,
              backgroundColor: theme.colors.goldSoft,
              borderRadius: theme.radii.md,
              padding: theme.spacing.md,
            }}
          >
            <Icon name="reader-outline" size={15} color={theme.colors.goldText} />
            <AppText variant="callout" tone={theme.colors.goldText} style={{ flex: 1 }} numberOfLines={3}>
              {note.text}
            </AppText>
          </View>
        </PressableScale>
      ) : null}
    </View>
  );
});

function ActionButton({ icon, active, onPress }: { icon: IconName; active?: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale
      haptic="selection"
      activeScale={0.85}
      onPress={onPress}
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? theme.colors.primarySoft : 'transparent',
      }}
    >
      <Icon name={icon} size={19} tone={active ? 'accent' : 'secondary'} />
    </PressableScale>
  );
}
