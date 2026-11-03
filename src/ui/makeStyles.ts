import { StyleSheet } from 'react-native';
import { useTheme, type Theme } from './theme';

// StyleSheet.create's own parameter type. Reusing it keeps 'center' a literal instead of widening to string.
type Styles = Parameters<typeof StyleSheet.create>[0];

/**
 * Styles that depend on the theme (light, dark or a venue colour).
 * Each theme's sheet is built once and reused, so calling the hook on every render is cheap.
 *
 *   const useStyles = makeStyles((theme) => ({ card: { backgroundColor: theme.surface } }));
 *   function Card() { const styles = useStyles(); ... }
 */
export function makeStyles<S extends Styles>(factory: (theme: Theme) => S & Styles) {
  const cache = new WeakMap<Theme, Readonly<S>>();
  return function useStyles(): Readonly<S> {
    const theme = useTheme();
    const hit = cache.get(theme);
    if (hit) return hit;
    const sheet = StyleSheet.create(factory(theme));
    cache.set(theme, sheet);
    return sheet;
  };
}
