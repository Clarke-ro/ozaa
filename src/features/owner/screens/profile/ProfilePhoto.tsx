import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle, toast } from '../../kit';
import { canPickImages, pickAndUploadImage } from '../../data/uploadImage';

/** The canvas photo card: a round photo (or the first letter) and "Change photo". Saves at once. */
export function ProfilePhoto({
  venueId,
  url,
  initial,
  onChange,
}: {
  venueId: string;
  url: string | null;
  initial: string;
  onChange: (mediaId: string) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const choose = async () => {
    setBusy(true);
    const result = await pickAndUploadImage(venueId, 'logo');
    setBusy(false);
    if (result.ok) onChange(result.mediaId);
    else if (result.reason !== 'cancelled') toast.error(t(`ownerKit.upload.${result.reason}`));
  };
  return (
    <View style={[cardStyle(theme), styles.card]}>
      <View style={[styles.avatar, { backgroundColor: theme.wash, borderColor: theme.line }]}>
        {url ? (
          <VenueImage url={url} alt={t('ownerSettings.photo')} style={StyleSheet.absoluteFill} />
        ) : (
          <Text style={[styles.initial, { color: theme.muted }]}>{initial}</Text>
        )}
      </View>
      {canPickImages ? (
        <Button
          label={busy ? t('ownerKit.upload.uploading') : t('ownerProfile.changePhoto')}
          tone="secondary"
          loading={busy}
          onPress={() => void choose()}
          style={styles.button}
        />
      ) : (
        <Text variant="caption" style={{ color: theme.muted }}>
          {t('ownerKit.upload.unsupported')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.owner.controls.cardPadding,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontSize: 17, fontFamily: fontFamily.strong },
  button: { minHeight: 40 },
});
