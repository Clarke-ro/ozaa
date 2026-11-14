import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Field, TitledSection } from '../../kit';

type Words = { name: string; tagline: string; description: string };

/** Venue name and tagline side by side, then the About us text. */
export function WordsSection({
  value,
  onChange,
}: {
  value: Words;
  onChange: (key: keyof Words, text: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <TitledSection title={t('ownerBranding.words')} cardStyle={styles.card}>
      <View style={styles.row}>
        <View style={styles.half}>
          <Field
            label={t('ownerBranding.name')}
            value={value.name}
            onChangeText={(text) => onChange('name', text)}
            maxLength={60}
          />
        </View>
        <View style={styles.half}>
          <Field
            label={t('ownerBranding.tagline')}
            value={value.tagline}
            onChangeText={(text) => onChange('tagline', text)}
            placeholder={t('ownerLoyalty.optional')}
            maxLength={100}
          />
        </View>
      </View>
      <Field
        label={t('ownerBranding.about')}
        value={value.description}
        onChangeText={(text) => onChange('description', text)}
        multiline
      />
    </TitledSection>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, gap: tokens.space[4] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[4] },
  half: { flexGrow: 1, flexBasis: 200, minWidth: 0 },
});
