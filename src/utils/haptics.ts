import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let enabled = true;

/** Synced from the user's hapticsEnabled setting (see App.tsx). */
export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

function active(): boolean {
  return enabled && Platform.OS !== 'web';
}

export const haptics = {
  light() {
    if (active()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium() {
    if (active()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  selection() {
    if (active()) Haptics.selectionAsync().catch(() => {});
  },
  success() {
    if (active())
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
};
