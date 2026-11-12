import { makeStyles } from '@/ui/makeStyles';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Megaphone } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ShellScreen } from '../ShellScreen';

export function MarketingShell() {
  const styles = useStyles();
  const { t } = useTranslation();
  const theme = useTheme();

  const preview = (
    <View style={styles.protoContainer}>
      <View style={styles.audienceNotice}>
        <Megaphone size={16} color={theme.ink} />
        <Text variant="body-strong" style={{ flex: 1 }}>
          {t('ownerShell.marketing.audience')}
        </Text>
      </View>

      <View style={styles.smsCard}>
        <Text variant="body">{t('ownerShell.marketing.sampleSms')}</Text>
      </View>
    </View>
  );

  return (
    <ShellScreen
      title={t('owner.marketing')}
      next={[t('owner.marketNext1'), t('owner.marketNext2'), t('owner.marketNext3')]}
      icon={Megaphone}
      badge={t('ownerShell.phase3')}
      preview={preview}
    />
  );
}

const useStyles = makeStyles((theme) => ({
  protoContainer: {
    gap: tokens.space[3],
  },
  audienceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    backgroundColor: theme.tint,
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: theme.tint,
  },
  smsCard: {
    backgroundColor: theme.wash,
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.fill,
  },
}));
