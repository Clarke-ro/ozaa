import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { IconTile } from './IconTile';

export interface EmptyCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyCardProps) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.white, borderColor: theme.line }]}>
      <IconTile icon={icon} tone="wash" size={48} />
      <View style={styles.textWrap}>
        <Text variant="title" style={styles.title}>
          {title}
        </Text>
        <Text variant="caption" style={[styles.desc, { color: theme.meta }]}>
          {description}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <View style={styles.btnWrap}>
          <Button label={actionLabel} onPress={onAction} tone="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: tokens.space[6],
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[3],
    marginVertical: tokens.space[2],
  },
  textWrap: {
    alignItems: 'center',
    gap: tokens.space[1],
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  desc: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 320,
  },
  btnWrap: {
    marginTop: tokens.space[2],
  },
});
