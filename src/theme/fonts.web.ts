import { FontDisplay, useFonts, type FontSource } from 'expo-font';
import Inter400 from '../../assets/fonts/Inter-400.woff2';
import Inter600 from '../../assets/fonts/Inter-600.woff2';
import Montserrat800 from '../../assets/fonts/Montserrat-800.woff2';
import NotoSans400 from '../../assets/fonts/NotoSans-400.woff2';
import NotoSans600 from '../../assets/fonts/NotoSans-600.woff2';
import NotoSans800 from '../../assets/fonts/NotoSans-800.woff2';
import NotoSerif700 from '../../assets/fonts/NotoSerif-700.woff2';

// On the web each font swaps in when it arrives (BUILD.md section 11, Fonts), so the page can
// show in the system font straight away instead of waiting for seven files on slow data.
const font = (file: number): FontSource => ({ uri: file, display: FontDisplay.SWAP });

export function useAppFonts(): boolean {
  useFonts({
    Inter_400: font(Inter400),
    Inter_600: font(Inter600),
    NotoSans_400: font(NotoSans400),
    NotoSans_600: font(NotoSans600),
    NotoSans_800: font(NotoSans800),
    NotoSerif_700: font(NotoSerif700),
    Montserrat_800: font(Montserrat800),
  });
  return true;
}
