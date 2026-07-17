import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { HIGHLIGHT_ORDER, HighlightColorKey } from '../theme/tokens';
import { Icon } from './ui/Icon';
import { PressableScale } from './ui/PressableScale';

interface HighlightSwatchesProps {
  selected?: HighlightColorKey;
  onSelect: (color: HighlightColorKey) => void;
  onRemove?: () => void;
  size?: number;
}

export function HighlightSwatches({ selected, onSelect, onRemove, size = 36 }: HighlightSwatchesProps) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
      {HIGHLIGHT_ORDER.map((key) => {
        const sw = theme.colors.highlights[key];
        const isSelected = selected === key;
        return (
          <PressableScale
            key={key}
            haptic="selection"
            activeScale={0.88}
            onPress={() => onSelect(key)}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: sw.bg,
              borderWidth: isSelected ? 2.5 : 1,
              borderColor: isSelected ? sw.stroke : theme.colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isSelected ? (
              <Icon name="checkmark" size={18} color={sw.stroke} />
            ) : (
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: sw.dot }} />
            )}
          </PressableScale>
        );
      })}
      {onRemove && selected ? (
        <PressableScale
          haptic="selection"
          activeScale={0.88}
          onPress={onRemove}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="close" size={18} tone="secondary" />
        </PressableScale>
      ) : null}
    </View>
  );
}
