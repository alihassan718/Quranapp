import React from 'react';
import { Pressable, PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { motion } from '../../theme/tokens';
import { haptics } from '../../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends PressableProps {
  activeScale?: number;
  haptic?: 'light' | 'medium' | 'selection' | false;
  children?: React.ReactNode;
}

/** A Pressable with a springy scale-down on press and optional haptic feedback. */
export function PressableScale({
  activeScale = 0.96,
  haptic = 'light',
  onPressIn,
  onPress,
  style,
  children,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      style={[animatedStyle, style as object]}
      onPressIn={(e) => {
        scale.value = withSpring(activeScale, motion.spring.press);
        if (haptic) haptics[haptic]();
        onPressIn?.(e);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring.press);
      }}
      onPress={onPress}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
