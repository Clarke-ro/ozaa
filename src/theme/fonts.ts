import { useFonts } from 'expo-font';
import Inter400 from '../../assets/fonts/Inter-400.woff2';
import Inter600 from '../../assets/fonts/Inter-600.woff2';
import Montserrat800 from '../../assets/fonts/Montserrat-800.woff2';
import NotoSerif700 from '../../assets/fonts/NotoSerif-700.woff2';
import Unbounded700 from '../../assets/fonts/Unbounded-700.woff2';

export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Inter_400: Inter400,
    Inter_600: Inter600,
    Unbounded_700: Unbounded700,
    NotoSerif_700: NotoSerif700,
    Montserrat_800: Montserrat800,
  });
  // WOFF2 subsets load on the web. Expo Go cannot use them, and waiting forever leaves a blank screen.
  return loaded || error != null;
}
