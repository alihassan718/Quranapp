import React, { useEffect, useState } from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useTheme } from '../../theme/ThemeProvider';
import { motion } from '../../theme/tokens';
import { haptics } from '../../utils/haptics';
import { AppText } from './Text';

export interface SegmentOption<T extends string> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

/** An animated segmented control with a spring-sliding selection indicator. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const pad = 4;
  const n = options.length;
  const seg = width > 0 ? (width - pad * 2) / n : 0;
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const tx = useSharedValue(0);

  useEffect(() => {
    tx.value = withSpring(idx * seg, motion.spring.gentle);
  }, [idx, seg, tx]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
    width: seg,
  }));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[
        {
          flexDirection: 'row',
          backgroundColor: theme.colors.surfaceSunken,
          borderRadius: theme.radii.md,
          padding: pad,
        },
        style,
      ]}
    >
      {seg > 0 && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: pad,
              bottom: pad,
              left: pad,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.sm,
              ...theme.elevation.sm,
            },
            indicatorStyle,
          ]}
        />
      )}
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}
            onPress={() => {
              haptics.selection();
              onChange(o.value);
            }}
          >
            <AppText variant="label" tone={selected ? theme.colors.textPrimary : theme.colors.textSecondary}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
