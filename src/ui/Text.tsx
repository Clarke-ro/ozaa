import { Text as NativeText, type TextProps, type TextStyle } from 'react-native';
import { tokens } from '@/theme/tokens';
import { useTheme } from './theme';

type Variant = 'display-l' | 'display-m' | 'title' | 'body' | 'body-strong' | 'caption' | 'button';

const VARIANT: Record<Variant, TextStyle> = {
  'display-l': { fontSize: tokens.type['display-l'].size, lineHeight: tokens.type['display-l'].line },
  'display-m': { fontSize: tokens.type['display-m'].size, lineHeight: tokens.type['display-m'].line },
  title: { fontSize: tokens.type.title.size, lineHeight: tokens.type.title.line },
  body: { fontSize: tokens.type.body.size, lineHeight: tokens.type.body.line },
  'body-strong': { fontSize: tokens.type['body-strong'].size, lineHeight: tokens.type['body-strong'].line },
  caption: { fontSize: tokens.type.caption.size, lineHeight: tokens.type.caption.line },
  button: { fontSize: tokens.type.button.size, lineHeight: tokens.type.button.line },
};

export function Text({
  variant = 'body',
  children,
  style,
  ...rest
}: TextProps & { variant?: Variant }) {
  const theme = useTheme();
  const display = variant === 'display-l' || variant === 'display-m';
  const strong = variant === 'title' || variant === 'body-strong' || variant === 'button';
  return (
    <NativeText
      {...rest}
      style={[
        VARIANT[variant],
        {
          color: theme.text,
          fontFamily: display ? theme.displayFont : strong ? 'Inter_600' : 'Inter_400',
        },
        style,
      ]}
    >
      {children}
    </NativeText>
  );
}
