import { useTranslation } from 'react-i18next';
import { ClipboardList } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useOwnerLayout } from '../../chrome/layout';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { boardColumns, type BoardColumn } from '../../desk/orderBoard';
import { CardGrid, EmptyCard } from '../../kit';
import { useOrderDesk } from './useOrderDesk';

/**
 * Every ticket in one kitchen stage (New, Cooking or Ready), oldest first, opened from that
 * stage's arrow on Orders. Open tickets count whatever day they came in, so nothing waiting
 * from last night is hidden.
 */
export function OrderStageScreen({ stage }: { stage: BoardColumn }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { wide, desktop } = useOwnerLayout();
  const desk = useOrderDesk('all', !wide);
  const list = boardColumns(desk.orders.data?.items ?? [])[stage];

  return (
    <OwnerPage
      title={t(`ownerOrders.stageTitle.${stage}`)}
      width="wide"
      back={{ label: t('owner.orders'), onPress: () => router.back() }}
    >
      <DeskWait
        loading={desk.orders.isPending}
        error={desk.orders.isError}
        onRetry={() => void desk.orders.refetch()}
      >
        {list.length === 0 ? (
          <EmptyCard
            icon={ClipboardList}
            title={t(`ownerOrders.empty.${stage}`)}
            description={t('ownerOrders.emptyBody')}
          />
        ) : (
          <CardGrid columns={desktop ? 3 : wide ? 2 : 1}>{list.map(desk.card)}</CardGrid>
        )}
      </DeskWait>
      {desk.paySheet}
    </OwnerPage>
  );
}
