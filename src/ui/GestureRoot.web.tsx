import type { ReactNode } from 'react';
import { View } from 'react-native';

/**
 * On the web no screen uses gesture-handler, so a plain View keeps the library (and the
 * animation code it pulls in) out of the guest's first download. BUILD.md section 11, Budget.
 */
export function GestureRoot({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1 }}>{children}</View>;
}
