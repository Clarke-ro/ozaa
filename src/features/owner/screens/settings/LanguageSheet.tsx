import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { chooseLanguage, LANGUAGES, languageByCode } from '@/features/venue';
import { hapticSelection } from '@/lib/haptics';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ModalSheet } from '../../kit';

/** Languages the app knows. Ones without a finished translation are shown but cannot be picked yet. */
export function LanguageSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const current = languageByCode(i18n.language).code;
  return (
    <ModalSheet visible={visible} onClose={onClose} title={t('ownerSettings.language')}>
      <View style={[styles.list, { borderColor: theme.line }]}>
        {LANGUAGES.map((language, index) => {
          const on = language.code === current;
          return (
            <Pressable
              key={language.code}
              accessibilityRole="radio"
              aria-checked={on}
              aria-disabled={!language.ready}
              accessibilityLabel={
                language.ready ? language.label : `${language.label}, ${t('ownerSettings.soon')}`
              }
              disabled={!language.ready}
              onPress={() => {
                void hapticSelection();
                void chooseLanguage(language.code);
                onClose();
              }}
              style={({ pressed }) => [
                styles.row,
                index > 0 && {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: theme.line,
                },
                pressed && { backgroundColor: theme.wash },
              ]}
            >
              <Text variant="body" style={[styles.flex, !language.ready && { color: theme.meta }]}>
                {language.label}
              </Text>
              {language.ready ? null : (
                <Text variant="caption" style={{ color: theme.muted }}>
                  {t('ownerSettings.soon')}
                </Text>
              )}
              {on ? <Check size={20} color={theme.ink} /> : null}
            </Pressable>
          );
        })}
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    boxShadow: tokens.shadow.card,
    borderRadius: tokens.radius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: 52,
    paddingHorizontal: tokens.space[4],
  },
  flex: { flex: 1 },
});
