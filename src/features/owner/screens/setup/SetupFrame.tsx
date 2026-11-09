import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/theme/tokens';
import { IconButton } from '@/ui/IconButton';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { useOwnerLayout } from '../../chrome/layout';
import { CravinsMark } from '../../kit';

const MARK = tokens.space[6];

/**
 * Setup's own page: a slim bar with the mark and Close, then one narrow column. No tab bar or
 * sidebar (OwnerChrome hides them for focused pages), so the owner finishes one thing at a time.
 */
export function SetupFrame({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gutter } = useOwnerLayout();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.fill, { backgroundColor: theme.bg }]}
    >
      <View
        style={[
          styles.bar,
          {
            paddingTop: insets.top + tokens.space[2],
            paddingHorizontal: gutter,
            backgroundColor: theme.surface,
            borderBottomColor: theme.line,
          },
        ]}
      >
        <View style={styles.brand}>
          <CravinsMark size={MARK} />
          <Text variant="body-strong" accessibilityRole="header" style={styles.word}>
            {t('owner.setup')}
          </Text>
        </View>
        <IconButton
          label={t('common.close')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/owner'))}
        >
          <X size={22} color={theme.ink} />
        </IconButton>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.page,
          { maxWidth: tokens.owner.page.setup + gutter * 2, paddingHorizontal: gutter },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {children}
      </ScrollView>
      {footer}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: tokens.space[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  word: { fontFamily: fontFamily.strong },
  page: {
    width: '100%',
    alignSelf: 'center',
    gap: tokens.space[4],
    paddingTop: tokens.space[6],
    paddingBottom: tokens.space[16],
  },
});
