import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { OwnerPage } from '../chrome/OwnerPage';
import { useGoTo } from '../chrome/NavRow';
import { EmptyCard } from '../kit';

export type SoonPage = 'promos' | 'help';

/** A sidebar page whose screen isn't built yet. Says what's coming and leads back to Today. */
export function ComingSoonScreen({ page }: { page: SoonPage }) {
  const { t } = useTranslation();
  const goTo = useGoTo();
  const title = page === 'help' ? t('ownerChrome.help') : t(`owner.${page}`);
  return (
    <OwnerPage title={title}>
      <View style={styles.wrap}>
        <EmptyCard
          icon={Clock}
          title={t('ownerSoon.title')}
          description={t(`ownerSoon.${page}`)}
          actionLabel={t('ownerSoon.back')}
          onAction={() => goTo('/owner')}
        />
      </View>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({ wrap: { paddingTop: tokens.space[4] } });
