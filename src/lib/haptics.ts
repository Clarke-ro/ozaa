import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Every helper is a no-op on the web and on phones without a haptic engine.
async function run(play: () => Promise<void>): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await play();
  } catch {
    // No haptic engine: nothing to do.
  }
}

/** Picker, segment and tab changes. */
export const hapticSelection = () => run(() => Haptics.selectionAsync());

/** Toggles, drops and the main button on a screen. */
export const hapticImpactLight = () =>
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

/** A save or scan went through. */
export const hapticSuccess = () =>
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

/** Something needs the user's attention before it can go on. */
export const hapticWarning = () =>
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));

/** A save or scan failed. */
export const hapticError = () =>
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
