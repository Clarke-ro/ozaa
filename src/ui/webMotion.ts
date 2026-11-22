import type { ViewStyle } from 'react-native';

/**
 * CSS transitions for the web versions of animated controls. React Native Web passes these
 * style keys straight to the browser; React Native's types don't list them, hence the cast.
 */
export function transition(property: string, ms: number, easing: string): ViewStyle {
  return {
    transitionProperty: property,
    transitionDuration: `${ms}ms`,
    transitionTimingFunction: easing,
  } as unknown as ViewStyle;
}

// tokens.motion.spring is critically damped (no bounce); on the web that is a plain ease-out.
export const EASE_OUT = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
