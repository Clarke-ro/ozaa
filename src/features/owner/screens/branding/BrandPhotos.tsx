import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ImageOff } from 'lucide-react-native';
import type { MediaKind } from '../../data/uploadImage';
import { canPickImages, pickAndUploadImage } from '../../data/uploadImage';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { VenueImage } from '@/ui/VenueImage';
import { useTheme } from '@/ui/theme';
import { TitledSection, toast } from '../../kit';
import { FieldLabel } from './FieldLabel';

type Picked = { id: string; url: string | null };

/** Canvas Photos card: a wide cover and a round logo side by side, each with its change button. */
export function BrandPhotos({
  venueId,
  coverUrl,
  logoUrl,
  onCover,
  onLogo,
}: {
  venueId: string;
  coverUrl: string | null;
  logoUrl: string | null;
  onCover: (picked: Picked) => void;
  onLogo: (picked: Picked) => void;
}) {
  const { t } = useTranslation();
  return (
    <TitledSection title={t('ownerBranding.photosTitle')} cardStyle={styles.card}>
      <Slot
        venueId={venueId}
        kind="banner"
        label={t('ownerBranding.cover')}
        button={t('ownerBranding.changeCover')}
        url={coverUrl}
        onPick={onCover}
        wide
      />
      <Slot
        venueId={venueId}
        kind="logo"
        label={t('ownerBranding.logo')}
        button={t('ownerBranding.changeLogo')}
        url={logoUrl}
        onPick={onLogo}
      />
    </TitledSection>
  );
}

function Slot({
  venueId,
  kind,
  label,
  button,
  url,
  onPick,
  wide,
}: {
  venueId: string;
  kind: MediaKind;
  label: string;
  button: string;
  url: string | null;
  onPick: (picked: Picked) => void;
  wide?: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const choose = async () => {
    setBusy(true);
    const result = await pickAndUploadImage(venueId, kind);
    setBusy(false);
    if (result.ok) onPick({ id: result.mediaId, url: result.previewUrl });
    else if (result.reason !== 'cancelled') toast.error(t(`ownerKit.upload.${result.reason}`));
  };
  return (
    <View style={wide ? styles.wide : styles.narrow}>
      <FieldLabel>{label}</FieldLabel>
      <View
        style={[
          wide ? styles.cover : styles.logo,
          { backgroundColor: theme.wash, borderColor: theme.line },
        ]}
      >
        {url ? (
          <VenueImage url={url} alt={label} style={StyleSheet.absoluteFill} />
        ) : (
          <ImageOff size={24} color={theme.meta} />
        )}
      </View>
      {canPickImages ? (
        <Button
          label={busy ? t('ownerKit.upload.uploading') : button}
          tone="secondary"
          loading={busy}
          onPress={() => void choose()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[5], padding: 20 },
  wide: { flexGrow: 1, flexShrink: 1, flexBasis: 260, gap: tokens.space[2] },
  narrow: { flexGrow: 0, flexShrink: 1, flexBasis: 160, gap: tokens.space[2] },
  // Canvas: cover 130 px high with 12 px corners; logo a 130 px circle.
  cover: {
    height: 130,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
