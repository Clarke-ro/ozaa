import { useFonts } from 'expo-font';
import Inter400 from '../../assets/fonts/Inter-400.ttf';
import Inter600 from '../../assets/fonts/Inter-600.ttf';
import Montserrat800 from '../../assets/fonts/Montserrat-800.ttf';
import NotoSans400 from '../../assets/fonts/NotoSans-400.ttf';
import NotoSans600 from '../../assets/fonts/NotoSans-600.ttf';
import NotoSans800 from '../../assets/fonts/NotoSans-800.ttf';
import NotoSerif700 from '../../assets/fonts/NotoSerif-700.ttf';

/**
 * iPhone and Android cannot read the WOFF2 files the browser uses. They load these TrueType
 * copies of the same subsets. A failed load still counts as ready: waiting forever would leave
 * the splash screen up and the new menu would never appear.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Inter_400: Inter400,
    Inter_600: Inter600,
    NotoSans_400: NotoSans400,
    NotoSans_600: NotoSans600,
    NotoSans_800: NotoSans800,
    NotoSerif_700: NotoSerif700,
    Montserrat_800: Montserrat800,
  });
  return loaded || error != null;
}
