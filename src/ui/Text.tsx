import { StyleSheet, Text as NativeText, type TextProps, type TextStyle } from 'react-native';
import { tokens } from '@/theme/tokens';
import { useTheme } from './theme';

type Variant = 'display-l' | 'display-m' | 'title' | 'body' | 'body-strong' | 'caption' | 'button';

const VARIANT: Record<Variant, TextStyle> = {
  'display-l': {
    fontSize: tokens.type['display-l'].size,
    lineHeight: tokens.type['display-l'].line,
  },
  'display-m': {
    fontSize: tokens.type['display-m'].size,
    lineHeight: tokens.type['display-m'].line,
  },
  title: { fontSize: tokens.type.title.size, lineHeight: tokens.type.title.line },
  body: { fontSize: tokens.type.body.size, lineHeight: tokens.type.body.line },
  'body-strong': {
    fontSize: tokens.type['body-strong'].size,
    lineHeight: tokens.type['body-strong'].line,
  },
  caption: { fontSize: tokens.type.caption.size, lineHeight: tokens.type.caption.line },
  button: { fontSize: tokens.type.button.size, lineHeight: tokens.type.button.line },
};

// Inter ships in two weights (400 and 600). Any heavier weight asked for in a style maps to 600,
// because a weight with no font file renders as faux bold on the web and is dropped on Android.
function weightFamily(weight: TextStyle['fontWeight']): string | null {
  if (weight == null) return null;
  return Number(weight) >= 600 || weight === 'bold' ? 'Inter_600' : 'Inter_400';
}

export function Text({
  variant = 'body',
  children,
  style,
  ...rest
}: TextProps & { variant?: Variant }) {
  const theme = useTheme();
  const display = variant === 'display-l' || variant === 'display-m';
  const strong = variant === 'title' || variant === 'body-strong' || variant === 'button';
  const flat = StyleSheet.flatten(style) ?? {};
  const asked = display ? null : weightFamily(flat.fontWeight);
  const { fontWeight: _dropped, ...own } = flat;
  return (
    <NativeText
      {...rest}
      style={[
        VARIANT[variant],
        {
          color: theme.text,
          fontFamily: display ? theme.displayFont : (asked ?? (strong ? 'Inter_600' : 'Inter_400')),
        },
        display ? flat : own,
      ]}
    >
      {children}
    </NativeText>
  );
}
