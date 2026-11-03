import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { LANGUAGES, type LanguageCode } from './languages';

export function LanguagePicker({
  open,
  selected,
  onChoose,
  onClose,
}: {
  open: boolean;
  selected: LanguageCode;
  onChoose: (code: LanguageCode) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  if (!open) return null;
  return (
    <View style={[styles.backdrop, { backgroundColor: theme.scrim }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        style={StyleSheet.absoluteFill}
        onPress={onClose}
      />
      <View style={[styles.sheet, { backgroundColor: theme.white }]}>
        <Text variant="title">{t('home.chooseLanguage')}</Text>
        {LANGUAGES.map((language) => {
          const on = language.code === selected;
          return (
            <Pressable
              key={language.code}
              accessibilityRole="button"
              accessibilityLabel={language.label}
              accessibilityState={{ disabled: !language.ready, selected: on }}
              onPress={() => {
                if (!language.ready) return;
                onChoose(language.code);
                onClose();
              }}
              style={[
                styles.row,
                { borderColor: theme.line, backgroundColor: on ? theme.tint : theme.white },
              ]}
            >
              <Text variant="body-strong" style={{ writingDirection: language.dir }}>
                {language.label}
              </Text>
              {language.ready ? null : (
                <Text variant="caption" style={{ color: theme.meta }}>
                  {t('home.comingSoon')}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 30,
    justifyContent: 'flex-end',
  },
  sheet: { zIndex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 10 },
  row: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
