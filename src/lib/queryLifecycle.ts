import { AppState, Platform } from 'react-native';
import { focusManager } from '@tanstack/react-query';

/**
 * Tell React Query when the app goes to the background on a phone, so polling (order status
 * every 10 s, owner tickets every 5 s) stops while it's in a pocket and resumes on return.
 * The web already does this from the tab's visibility, so only native needs wiring.
 * BUILD.md section 11, Polling.
 */
export function pausePollingInBackground(): () => void {
  if (Platform.OS === 'web') return () => undefined;
  focusManager.setEventListener((setFocused) => {
    const sub = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
    return () => sub.remove();
  });
  return () => focusManager.setEventListener(() => () => undefined);
}
