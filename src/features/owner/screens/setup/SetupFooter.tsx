import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { useTheme } from '@/ui/theme';
import { useOwnerLayout } from '../../chrome/layout';
import type { Footer } from './setupFlow';

const PRIMARY: Record<Footer['primary'], string> = {
  next: 'owner.next',
  finish: 'owner.finish',
  connect: 'ownerSetup.connect',
};

/**
 * The bar under each step: Back on the left, then Skip and the one filled button. On a wide
 * screen the buttons stay inside the page column instead of stretching across the window.
 */
export function SetupFooter({
  footer,
  busy,
  onBack,
  onSkip,
  onPrimary,
}: {
  footer: Footer;
  busy: boolean;
  onBack: () => void;
  onSkip: () => void;
  onPrimary: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { wide, gutter } = useOwnerLayout();
  return (
    <View
      style={[
        styles.bar,
        { borderTopColor: theme.line, backgroundColor: theme.surface, paddingHorizontal: gutter },
      ]}
    >
      <View style={[styles.inner, { maxWidth: tokens.owner.page.setup }]}>
        {footer.back ? (
          <Button label={t('owner.back')} tone="ghost" size="md" onPress={onBack} />
        ) : null}
        {/* Wide: Back left, the rest right. Phones: the filled button takes what's left. */}
        {wide ? <View style={styles.spacer} /> : null}
        {footer.skip ? (
          <Button label={t(`ownerSetup.${footer.skip}`)} tone="ghost" size="md" onPress={onSkip} />
        ) : null}
        <Button
          label={t(PRIMARY[footer.primary])}
          size="md"
          loading={busy}
          onPress={onPrimary}
          style={wide ? undefined : styles.primary}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingVertical: tokens.space[3], borderTopWidth: StyleSheet.hairlineWidth },
  inner: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  spacer: { flex: 1 },
  // Phones: the filled button takes the rest of the row, within thumb reach.
  primary: { flex: 1 },
});
