import { ScrollView, View } from 'react-native';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { ThemeProvider, themeFromAccent } from '@/ui/theme';

const SAMPLES = [
  { name: "Mama's Kitchen", accent: '#B5432A', font: 'serif' as const },
  { name: 'Bean There', accent: '#1F5C3F', font: 'bold' as const },
  { name: 'Auntie Akos', accent: '#FFC21A', font: 'cravins' as const },
];

export default function UiGallery() {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={{ padding: 20, gap: 28 }}
    >
      <Text variant="display-l">Cravins UI</Text>
      {SAMPLES.map((sample) => (
        <ThemeProvider key={sample.name} theme={themeFromAccent(sample.accent, sample.font)}>
          <View style={{ gap: 12 }}>
            <Text variant="display-m">{sample.name}</Text>
            <Text variant="body">
              Buttons, type and the venue colour, with contrast kept at 4.5:1.
            </Text>
            <Button label="Primary" onPress={() => undefined} />
            <Button label="Secondary" tone="secondary" onPress={() => undefined} />
            <Button label="Disabled" disabled onPress={() => undefined} />
          </View>
        </ThemeProvider>
      ))}
    </ScrollView>
  );
}
