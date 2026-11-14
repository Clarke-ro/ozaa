import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TitledSection } from '../../kit';
import { DragList } from '../../kit/DragList';

export const BUTTON_KEYS = ['menu', 'waiter', 'wifi', 'socials', 'links'] as const;

/** The order of the buttons on the guest home. Hold the grip and drag; the first is filled. */
export function HomeOrderSection({
  order,
  onOrder,
}: {
  order: string[];
  onOrder: (next: string[]) => void;
}) {
  const { t } = useTranslation();
  return (
    <TitledSection title={t('ownerBranding.homeOrder')} cardStyle={styles.card}>
      <DragList
        items={order.map((key) => ({ key, label: t(`ownerBranding.button.${key}`) }))}
        onOrder={onOrder}
      />
    </TitledSection>
  );
}

const styles = StyleSheet.create({ card: { padding: 12 } });
