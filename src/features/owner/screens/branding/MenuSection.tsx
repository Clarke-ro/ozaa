import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { FullMenuStyle } from '@/lib/menuStyle';
import { tokens } from '@/theme/tokens';
import { Segmented, TitledSection } from '../../kit';
import { FieldLabel } from './FieldLabel';

type Sort = FullMenuStyle['itemSort'];
type Layout = FullMenuStyle['layout'];
// The canvas offers these three. The price orders stay valid in the contract; a venue that
// already uses one keeps it until the owner picks another here.
const SORTS: Sort[] = ['manual', 'popular_first', 'name'];

/** Dish order in each section, and whether the menu opens as a list or a grid. */
export function MenuSection({
  style,
  onChange,
}: {
  style: FullMenuStyle;
  onChange: (next: FullMenuStyle) => void;
}) {
  const { t } = useTranslation();
  return (
    <TitledSection title={t('ownerBranding.menuTitle')} cardStyle={styles.card}>
      <View style={styles.block}>
        <FieldLabel>{t('ownerBranding.dishOrder')}</FieldLabel>
        <Segmented<Sort>
          label={t('ownerBranding.dishOrder')}
          value={style.itemSort}
          onChange={(itemSort) => onChange({ ...style, itemSort })}
          options={SORTS.map((id) => ({ id, label: t(`ownerBranding.sortShort.${id}`) }))}
        />
      </View>
      <View style={styles.block}>
        <FieldLabel>{t('ownerBranding.layout')}</FieldLabel>
        <Segmented<Layout>
          label={t('ownerBranding.layout')}
          value={style.layout}
          onChange={(layout) => onChange({ ...style, layout })}
          options={[
            { id: 'list', label: t('ownerBranding.menuStyle.list') },
            { id: 'grid', label: t('ownerBranding.menuStyle.grid') },
          ]}
        />
      </View>
    </TitledSection>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, gap: tokens.space[5] },
  block: { gap: tokens.space[2] },
});
