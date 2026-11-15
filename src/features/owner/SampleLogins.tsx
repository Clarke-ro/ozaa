import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DEMO_LOGINS } from '@/mocks/demo';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/** The demo accounts, as the local number an owner would type (0XX…). */
export const SAMPLES = DEMO_LOGINS.map((person) => ({
  ...person,
  local: `0${person.phone.slice(4)}`,
}));

/**
 * Sample logins for the demo build only: the accounts exist only in the mock, so a build against
 * a real server never shows this (the screen checks DEMO before rendering it).
 */
export function SampleLogins({
  phone,
  onPick,
}: {
  phone: string;
  onPick: (local: string) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={[styles.section, { borderTopColor: theme.line }]}>
      <Text variant="caption" style={{ color: theme.meta, textAlign: 'center' }}>
        {t('owner.sample')}
      </Text>
      <View style={styles.chips}>
        {SAMPLES.map((s) => {
          const label = t('owner.sampleLogin', {
            venue: s.venueName,
            name: s.firstName,
            role: t(`owner.roles.${s.role}`),
          });
          const on = phone === s.local;
          return (
            <Pressable
              key={s.phone}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => onPick(s.local)}
              style={[
                styles.chip,
                {
                  borderColor: on ? theme.black : theme.line,
                  backgroundColor: on ? theme.wash : theme.surface,
                },
              ]}
            >
              <Text variant="caption" style={{ fontWeight: '600', color: theme.muted }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: tokens.space[2],
    paddingTop: tokens.space[2],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chips: { gap: 6 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
});
