import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TitledSection } from '../../kit';
import { DragList } from '../../kit/DragList';

/**
 * The order of the sections on the guest home (canvas): At your table, Rewards, Fun while you
 * wait, More. Hold the grip and drag. Saved as the venue's sectionOrder.
 */
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
        gripSide="start"
        items={order.map((key) => ({ key, label: t(`home.sections.${key}`) }))}
        onOrder={onOrder}
      />
    </TitledSection>
  );
}

const styles = StyleSheet.create({ card: { padding: 12 } });
