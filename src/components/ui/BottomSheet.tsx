import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/ThemeProvider';
import { motion, zIndex } from '../../theme/tokens';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeightRatio?: number;
}

/**
 * A self-contained animated bottom sheet built directly on Reanimated +
 * Gesture Handler: spring-expands on open, drag the handle to dismiss, backdrop
 * fades in. No third-party sheet dependency, so it tracks the SDK cleanly.
 */
export function BottomSheet({ visible, onClose, children, maxHeightRatio = 0.9 }: BottomSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);

  const translateY = useSharedValue(screenH);
  const backdropOpacity = useSharedValue(0);
  const startY = useRef(0);

  // The app is edge-to-edge (Android 15 targets), so the window does NOT
  // resize for the soft keyboard — without this the sheet stays hidden behind
  // it whenever a child input focuses (e.g. the note editor). Track the
  // keyboard on the UI thread and lift the sheet just above it, clamped so a
  // tall sheet can't get pushed past the top safe area.
  const keyboard = useAnimatedKeyboard({
    isStatusBarTranslucentAndroid: true,
    isNavigationBarTranslucentAndroid: true,
  });
  const sheetHeight = useSharedValue(0);

  // Mount on show.
  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  // Enter animation once mounted + visible.
  useEffect(() => {
    if (mounted && visible) {
      translateY.value = withSpring(0, motion.spring.panel);
      backdropOpacity.value = withTiming(1, { duration: motion.duration.base });
    }
  }, [mounted, visible, translateY, backdropOpacity]);

  // Exit animation on hide.
  useEffect(() => {
    if (!visible && mounted) {
      backdropOpacity.value = withTiming(0, { duration: motion.duration.fast });
      translateY.value = withTiming(screenH, { duration: motion.duration.base }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible, mounted, screenH, translateY, backdropOpacity]);

  const sheetStyle = useAnimatedStyle(() => {
    const maxLift = Math.max(0, screenH - insets.top - 12 - sheetHeight.value);
    const lift = Math.min(keyboard.height.value, maxLift);
    return { transform: [{ translateY: translateY.value - lift }] };
  });
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  const pan = Gesture.Pan()
    .onStart(() => {
      startY.current = translateY.value;
    })
    .onUpdate((e) => {
      translateY.value = Math.max(0, startY.current + e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 900) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, motion.spring.panel);
      }
    });

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.colors.overlay, zIndex: zIndex.sheetBackdrop },
          backdropStyle,
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        onLayout={(e) => {
          sheetHeight.value = e.nativeEvent.layout.height;
        }}
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.backgroundElevated,
            borderColor: theme.colors.border,
            maxHeight: screenH * maxHeightRatio,
            paddingBottom: insets.bottom + theme.spacing.base,
            zIndex: zIndex.sheet,
            ...theme.elevation.xl,
          },
          sheetStyle,
        ]}
      >
        <GestureDetector gesture={pan}>
          <View style={styles.handleZone}>
            <View style={[styles.handle, { backgroundColor: theme.colors.borderStrong }]} />
          </View>
        </GestureDetector>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  handleZone: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle: { width: 42, height: 5, borderRadius: 3 },
});
