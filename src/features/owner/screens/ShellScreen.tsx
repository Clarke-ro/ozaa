import { makeStyles } from '@/ui/makeStyles';
import type { ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { type LucideIcon } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { OwnerPage } from '../chrome/OwnerPage';
import { DeskCard, IconTile, SectionLabel } from '../kit';

export function ShellScreen({
  title,
  next,
  preview,
  icon: Icon,
  badge,
}: {
  title: string;
  body?: string;
  next: string[];
  preview?: ReactNode;
  icon?: LucideIcon;
  badge?: string;
}) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const wide = width >= 920;

  return (
    <OwnerPage title={title}>
      <View style={[styles.stack, wide && styles.split]}>
        {preview ? (
          <DeskCard style={[styles.previewContainer, wide && styles.mainCol]}>
            <View style={styles.previewHeader}>
              <View style={styles.previewTitleRow}>
                {Icon ? <IconTile icon={Icon} tone="tint" size={36} /> : null}
                <Text variant="title">{t('ownerShell.prototype')}</Text>
              </View>
              <View style={styles.phaseBadge}>
                <Text variant="caption" style={styles.phaseText}>
                  {badge ?? t('owner.notYet')}
                </Text>
              </View>
            </View>

            <View style={styles.previewSlot}>{preview}</View>
          </DeskCard>
        ) : null}

        <DeskCard style={[styles.roadmapCard, wide && styles.sideCol]}>
          <SectionLabel title={t('ownerShell.roadmap')} caps />

          <View style={styles.stepsList}>
            {next.map((line, idx) => (
              <View key={line} style={styles.stepItem}>
                <View style={styles.stepNumberCircle}>
                  <Text variant="caption" style={styles.stepNumberText}>
                    {idx + 1}
                  </Text>
                </View>
                <View style={styles.stepTextWrapper}>
                  <Text variant="body-strong">{line}</Text>
                </View>
              </View>
            ))}
          </View>
        </DeskCard>
      </View>
    </OwnerPage>
  );
}

const useStyles = makeStyles((theme) => ({
  stack: { gap: tokens.space[4] },
  split: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[5] },
  mainCol: { flex: 1.3, minWidth: 0 },
  sideCol: { flex: 1, minWidth: 0 },
  previewContainer: {
    gap: tokens.space[3],
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  phaseBadge: {
    backgroundColor: theme.tint,
    paddingHorizontal: tokens.space[2],
    paddingVertical: 3,
    borderRadius: tokens.radius.full,
  },
  phaseText: {
    color: theme.ink,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  previewSlot: {
    paddingTop: tokens.space[1],
  },
  roadmapCard: {
    gap: tokens.space[3],
  },
  stepsList: {
    gap: tokens.space[3],
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space[3],
  },
  stepNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.wash,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontWeight: '700',
    fontSize: 11,
    color: theme.text,
  },
  stepTextWrapper: {
    flex: 1,
  },
}));
