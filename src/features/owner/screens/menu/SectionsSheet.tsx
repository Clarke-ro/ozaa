import { useTranslation } from 'react-i18next';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ModalSheet } from '../../kit';
import { SectionsList, type SectionsListProps } from './SectionsList';

/** The Sections sheet on the Menu screen. */
export function SectionsSheet({
  visible,
  onClose,
  ...list
}: SectionsListProps & { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={t('ownerMenu.sections')}
      subtitle={t('ownerMenu.sectionsLead')}
    >
      <SectionsList {...list} />
      <Text variant="caption" style={{ color: theme.muted }}>
        {t('ownerMenu.orderHint')}
      </Text>
    </ModalSheet>
  );
}
