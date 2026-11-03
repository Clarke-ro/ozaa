import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

/** The app's root view. Native needs gesture-handler's root; the web has its own (GestureRoot.web.tsx). */
export function GestureRoot({ children }: { children: ReactNode }) {
  return <GestureHandlerRootView style={{ flex: 1 }}>{children}</GestureHandlerRootView>;
}
