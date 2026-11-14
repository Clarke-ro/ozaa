import { Redirect, useLocalSearchParams } from 'expo-router';
import { OrderStageScreen, isBoardColumn } from '@/features/owner';

export default function Route() {
  const { stage } = useLocalSearchParams<{ stage: string }>();
  // The stage comes from the URL, so check it before trusting it.
  if (!isBoardColumn(stage)) return <Redirect href="/owner/orders" />;
  return <OrderStageScreen stage={stage} />;
}
