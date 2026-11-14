import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { FullMenuStyle } from '@/lib/menuStyle';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { Chips, Section, SectionBody, Segmented } from '../../kit';

const SORTS: FullMenuStyle['itemSort'][] = [
  'manual',
  'popular_first',
  'name',
  'price_low',
  'price_high',
];

/** Menu-page panel: dish order (all five), list or grid, and light or dark pages. */
export function MenuStyleSection({
  style,
  onChange,
}: {
  style: FullMenuStyle;
  onChange: (next: FullMenuStyle) => void;
}) {
  const { t } = useTranslation();
  return (
    <Section title={t('ownerBranding.menuStyle.title')}>
      <SectionBody>
        <View style={styles.stack}>
          <Text variant="body-strong">{t('ownerBranding.menuStyle.sort')}</Text>
          <Chips
            single
            label={t('ownerBranding.menuStyle.sort')}
            options={SORTS.map((id) => ({ id, label: t(`ownerBranding.menuStyle.sorts.${id}`) }))}
            selected={[style.itemSort]}
            onChange={(ids) => ids[0] && onChange({ ...style, itemSort: ids[0] })}
          />
          <Text variant="body-strong">{t('ownerBranding.menuStyle.layout')}</Text>
          <Segmented
            label={t('ownerBranding.menuStyle.layout')}
            value={style.layout}
            onChange={(layout) => onChange({ ...style, layout })}
            options={[
              { id: 'list', label: t('ownerBranding.menuStyle.list') },
              { id: 'grid', label: t('ownerBranding.menuStyle.grid') },
            ]}
          />
          <Text variant="body-strong">{t('ownerBranding.menuStyle.scheme')}</Text>
          <Segmented
            label={t('ownerBranding.menuStyle.scheme')}
            value={style.colorScheme}
            onChange={(colorScheme) => onChange({ ...style, colorScheme })}
            options={[
              { id: 'light', label: t('ownerBranding.menuStyle.light') },
              { id: 'dark', label: t('ownerBranding.menuStyle.dark') },
              { id: 'auto', label: t('ownerBranding.menuStyle.auto') },
            ]}
          />
        </View>
      </SectionBody>
    </Section>
  );
}

const styles = StyleSheet.create({ stack: { gap: tokens.space[2] } });
