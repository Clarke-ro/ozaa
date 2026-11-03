import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ImageOff } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { useTheme } from '@/ui/theme';
import { canPickImages, pickAndUploadImage, type MediaKind } from '../data/uploadImage';

/** Photo preview with Choose / Replace / Remove. Uploads straight away; the form saves the media id. */
export function PhotoField({
  venueId,
  url,
  onChange,
  kind = 'dish_photo',
  label,
}: {
  venueId: string;
  url: string | null;
  onChange: (mediaId: string | null, url: string | null) => void;
  kind?: MediaKind;
  label?: string;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async () => {
    setError(null);
    setBusy(true);
    const result = await pickAndUploadImage(venueId, kind);
    setBusy(false);
    if (result.ok) onChange(result.mediaId, result.previewUrl);
    else if (result.reason !== 'cancelled') setError(t(`ownerKit.upload.${result.reason}`));
  };

  return (
    <View style={styles.wrap}>
      <Text variant="body-strong" style={styles.label}>
        {label ?? 'Photo'}
      </Text>
      <View style={styles.row}>
        <View style={[styles.preview, { backgroundColor: theme.wash, borderColor: theme.line }]}>
          {url ? (
            <VenueImage url={url} alt={label ?? 'Photo'} style={StyleSheet.absoluteFill} />
          ) : (
            <ImageOff size={24} color={theme.meta} />
          )}
        </View>
        <View style={styles.actions}>
          {canPickImages ? (
            <>
              <Button
                label={
                  busy
                    ? t('ownerKit.upload.uploading')
                    : url
                      ? t('ownerKit.upload.replace')
                      : t('ownerKit.upload.choose')
                }
                tone="secondary"
                size="md"
                loading={busy}
                onPress={() => void choose()}
              />
              {url ? (
                <Button
                  label={t('ownerKit.upload.remove')}
                  tone="ghost"
                  size="md"
                  onPress={() => onChange(null, null)}
                />
              ) : null}
            </>
          ) : (
            <Text variant="caption" style={{ color: theme.muted }}>
              {t('ownerKit.upload.unsupported')}
            </Text>
          )}
        </View>
      </View>
      {error ? (
        <Text variant="caption" accessibilityLiveRegion="polite" style={{ color: theme.error }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[2] },
  label: { fontSize: 14 },
  row: { flexDirection: 'row', gap: tokens.space[3], alignItems: 'center' },
  preview: {
    width: 96,
    height: 96,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flex: 1, gap: tokens.space[2] },
});
