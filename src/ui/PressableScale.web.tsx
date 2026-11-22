import {
  Pressable,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { tokens } from '@/theme/tokens';
import { useReducedMotion } from './useReducedMotion.web';
import { EASE_OUT, transition } from './webMotion';

const m = tokens.motion;

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
  scale?: number;
};

/**
 * The web version of PressableScale (see PressableScale.tsx for the why): the same shrink on
 * touch-down and the same settle on release, as a CSS transition. Reanimated is about 100 KB on
 * every guest page; buttons don't need it in a browser (audit, 2026-11-22).
 */
export function PressableScale({ style, scale = m.pressScale, disabled, ...rest }: Props) {
  const reduce = useReducedMotion();
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      style={(state) => {
        const resolved = typeof style === 'function' ? style(state) : style;
        const down = state.pressed && !reduce && !disabled;
        return [
          resolved,
          { transform: [{ scale: down ? scale : 1 }] },
          down
            ? transition('transform', m.press, 'ease-out')
            : transition('transform', m.spring.duration, EASE_OUT),
        ];
      }}
    />
  );
}
