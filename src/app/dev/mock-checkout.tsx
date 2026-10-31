import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Button } from '@/ui/Button';
import { decideMockCard } from '@/mocks/mockClient';
export default function MockCheckout() {
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const reference = ref ?? '';
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#fff' }}>
      <Button label="Pay" onPress={() => decideMockCard(reference, 'succeeded')} />
      <Button label="Cancel" tone="secondary" onPress={() => decideMockCard(reference, 'abandoned')} />
    </View>
  );
}
