import { Redirect, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Button } from '@/ui/Button';
import { PAYMENTS_ENABLED } from '@/lib/features';
import { decideMockCard } from '@/mocks/mockClient';
export default function MockCheckout() {
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const reference = ref ?? '';
  if (!PAYMENTS_ENABLED) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#fff' }}>
      <Button label="Pay" onPress={() => decideMockCard(reference, 'succeeded')} />
      <Button label="Cancel" tone="secondary" onPress={() => decideMockCard(reference, 'abandoned')} />
    </View>
  );
}
