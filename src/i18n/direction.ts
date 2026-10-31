import { I18nManager, Platform } from 'react-native';

/** Arabic is right-to-left. Every other language we ship stays left-to-right. */
export function textDirection(code: string | undefined): 'ltr' | 'rtl' {
  const base = code?.toLowerCase().split('-')[0];
  return base === 'ar' ? 'rtl' : 'ltr';
}

/** Web follows `dir` immediately. Native RTL needs a reload, so this is ready before Arabic is selectable. */
export function applyTextDirection(code: string | undefined): void {
  const rtl = textDirection(code) === 'rtl';
  if (typeof document !== 'undefined') {
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = code?.split('-')[0] || 'en';
  }
  if (Platform.OS === 'web') return;
  I18nManager.allowRTL(true);
  if (I18nManager.isRTL !== rtl) I18nManager.forceRTL(rtl);
}
