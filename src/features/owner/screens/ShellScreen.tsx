import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, type LucideIcon } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { OwnerPage } from '../chrome/OwnerPage';
import { DeskCard, IconTile, SectionLabel } from '../kit';

export function ShellScreen({
  title,
  body,
  next,
  preview,
  icon: Icon,
  badge,
}: {
  title: string;
  body: string;
  next: string[];
  preview?: ReactNode;
  icon?: LucideIcon;
  badge?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <OwnerPage title={title} subtitle={body}>
      {/* Product Prototype Preview */}
      {preview ? (
        <DeskCard style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <View style={styles.previewTitleRow}>
              {Icon ? <IconTile icon={Icon} tone="tint" size={36} /> : null}
              <View>
                <Text variant="title">Interactive Prototype</Text>
                <Text variant="caption" style={{ color: theme.meta }}>
                  Product preview & upcoming workflow
                </Text>
              </View>
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

      {/* Roadmap & Next Steps Checklist */}
      <DeskCard style={styles.roadmapCard}>
        <SectionLabel title="SPECIFICATION ROADMAP" caps />

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

        <View style={styles.releaseNotice}>
          <CheckCircle2 size={16} color="#16A34A" />
          <Text variant="caption" style={{ color: '#16A34A', fontWeight: '600' }}>
            Aligned with Ozaa Phase 3 roadmap specifications and restaurant feedback.
          </Text>
        </View>
      </DeskCard>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  previewContainer: {
    gap: tokens.space[3],
    marginBottom: tokens.space[3],
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
    backgroundColor: '#FFF1EA',
    paddingHorizontal: tokens.space[2],
    paddingVertical: 3,
    borderRadius: tokens.radius.full,
  },
  phaseText: {
    color: '#D24000',
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
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontWeight: '700',
    fontSize: 11,
    color: '#111111',
  },
  stepTextWrapper: {
    flex: 1,
  },
  releaseNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: tokens.space[2],
    backgroundColor: '#F0FDF4',
    borderRadius: tokens.radius.sm,
    marginTop: tokens.space[1],
  },
});
