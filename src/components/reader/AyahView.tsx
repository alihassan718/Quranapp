import React from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  SharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { addBoardNode } from '../../data/userStore';
import { AyahWithWords, Word } from '../../domain/models';
import { useAnnotations } from '../../state/AnnotationsContext';
import { useUserDb } from '../../state/DatabaseProvider';
import { useSettings } from '../../state/SettingsContext';
import { useTheme } from '../../theme/ThemeProvider';
import { ayahMarker, hasArabicLetters } from '../../utils/arabic';
import { haptics } from '../../utils/haptics';
import { ArabicText } from '../ArabicText';
import { Icon, IconName } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import { AppText } from '../ui/Text';
import { TranslationText } from '../ui/TranslationText';
import { WordChip } from './WordChip';

interface AyahViewProps {
  ayah: AyahWithWords;
  /** Inline reference translation for this ayah (null → hidden). */
  translation?: string | null;
  /** Attribution label for the inline translation — always shown with it. */
  translatorName?: string | null;
  /** Normalized scroll-velocity drift for the water theme's buoyancy. */
  drift?: SharedValue<number>;
  floatEnabled?: boolean;
  floatIndex?: number;
  onWordPress: (word: Word) => void;
  onHighlight: () => void;
  onNote: () => void;
  onCompare: () => void;
  onShare: () => void;
}

const VERSE_BASE_SIZE = 32;

export const AyahView = React.memo(function AyahView({
  ayah,
  translation,
  translatorName,
  drift,
  floatEnabled,
  floatIndex,
  onWordPress,
  onHighlight,
  onNote,
  onCompare,
  onShare,
}: AyahViewProps) {
  const theme = useTheme();
  const { settings } = useSettings();
  const userDb = useUserDb();
  const [justPinned, setJustPinned] = React.useState(false);
  const { getAyahHighlight, getWordHighlight, getNote, isBookmarked, toggleBookmark } = useAnnotations();

  // Water-theme buoyancy: chase the list's scroll drift with a soft spring.
  // Amplitude staggers across rows (6/8/10 px) so cards bob independently,
  // like things floating. Inactive themes get a static transform (no cost).
  const floatStyle = useAnimatedStyle(() => {
    if (!floatEnabled || !drift) return { transform: [{ translateY: 0 }] };
    const amp = 6 + ((floatIndex ?? 0) % 3) * 2;
    return {
      transform: [
        { translateY: withSpring(-drift.value * amp, { damping: 13, stiffness: 90, mass: 0.9 }) },
      ],
    };
  }, [floatEnabled, floatIndex]);

  const ayahHl = getAyahHighlight(ayah.surah, ayah.ayah);
  const note = getNote(ayah.surah, ayah.ayah);
  const bookmarked = isBookmarked(ayah.surah, ayah.ayah);
  const hlSwatch = ayahHl ? theme.colors.highlights[ayahHl.color] : null;

  return (
    <Animated.View style={[{ paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md }, floatStyle]}>
      <View
        style={{
          borderRadius: theme.radii.lg,
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
          {ayah.words.map((w) =>
            hasArabicLetters(w.textUthmani) ? (
              <WordChip
                key={w.position}
                word={w}
                size={VERSE_BASE_SIZE}
                highlight={getWordHighlight(ayah.surah, ayah.ayah, w.position)}
                onPress={onWordPress}
              />
            ) : (
              // Standalone pause/sajdah/rub-el-hizb sign: ornament, not a word.
              <View key={w.position} style={{ paddingHorizontal: 3 }}>
                <ArabicText text={w.textUthmani} size={VERSE_BASE_SIZE - 6} color={theme.colors.gold} />
              </View>
            ),
          )}
          <View style={{ paddingHorizontal: 4 }}>
            <ArabicText
              text={ayahMarker(ayah.ayah)}
              size={VERSE_BASE_SIZE - 2}
              color={theme.colors.gold}
            />
          </View>
        </View>
      </View>

      {/* Inline reference translation (clearly attributed, never author-less).
          Plain View: Reanimated `entering` animations silently drop the subtree
          on web, and this block must always be visible when enabled. */}
      {translation ? (
        <View style={{ marginTop: theme.spacing.sm, gap: 4 }}>
          <TranslationText variant="body" color={theme.colors.textSecondary}>
            {translation}
          </TranslationText>
          {translatorName ? (
            <AppText variant="caption" tone="tertiary">
              — {translatorName}
            </AppText>
          ) : null}
        </View>
      ) : null}

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
          <ActionButton
            icon={justPinned ? 'checkmark' : 'pin-outline'}
            active={justPinned}
            onPress={async () => {
              // Pin this ayah onto the Research board (idempotent).
              await addBoardNode(userDb, 'ayah', `${ayah.surah}:${ayah.ayah}`);
              haptics.success();
              setJustPinned(true);
              setTimeout(() => setJustPinned(false), 1600);
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
    </Animated.View>
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
