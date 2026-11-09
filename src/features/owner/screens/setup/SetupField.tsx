import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Field } from '../../kit';

/** Setup's text field: the label sits on the page, the input is a tall rounded box under it. */
export function SetupField({ style, ...rest }: ComponentProps<typeof Field>) {
  return <Field {...rest} style={[styles.input, style]} />;
}

const styles = StyleSheet.create({
  input: {
    minHeight: tokens.touchTarget + tokens.space[3],
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: tokens.space[4],
  },
});
