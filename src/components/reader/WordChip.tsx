import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Highlight, Word } from '../../domain/models';
import { useTheme } from '../../theme/ThemeProvider';
import { ArabicText } from '../ArabicText';
import { PressableScale } from '../ui/PressableScale';

interface WordChipProps {
  word: Word;
  size: number;
  highlight?: Highlight;
  onPress: (word: Word) => void;
}

/** A single tappable Qur'anic word with springy press feedback + highlight. */
export const WordChip = React.memo(function WordChip({ word, size, highlight, onPress }: WordChipProps) {
  const theme = useTheme();
  const sw = highlight ? theme.colors.highlights[highlight.color] : null;
  return (
    <PressableScale
      haptic="selection"
      activeScale={0.9}
      onPress={() => onPress(word)}
      style={{ marginHorizontal: 1, marginVertical: 2, borderRadius: 9 }}
    >
      {sw ? (
        <Animated.View
          entering={FadeIn.duration(220)}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: sw.bg, borderRadius: 9, borderBottomWidth: 2, borderBottomColor: sw.stroke },
          ]}
        />
      ) : null}
      <View style={{ paddingHorizontal: 5, paddingVertical: 1 }}>
        <ArabicText text={word.textUthmani} size={size} lineHeightMultiplier={1.5} align="center" />
      </View>
    </PressableScale>
  );
});
