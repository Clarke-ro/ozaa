import { Image, StyleSheet, View } from 'react-native';
import type { TableCardTemplate } from '@/features/tables';
import { QR_INK as INK, QR_PAPER } from '@/theme/palette';
import { Text } from '@/ui/Text';
import { fontFamily } from '@/ui/theme';
import { QrImage } from './QrImage';

// The printed card is paper: it never follows dark mode, and the QR stays black on white.
const GREY = '#52525B';
const STAND_BASE = '#2B2B2E';
const FOLD = '#D9D9D3';
const SHADOW = '#D4D4CE';

/**
 * One table card in a canvas style, drawn at `scale` (1 is the big preview; the All tables grid
 * uses about 0.62). Sizes are the canvas's own, multiplied by the scale.
 */
export function TableCard({
  template,
  scale = 1,
  accent,
  venueName,
  label,
  qrUrl,
  cta,
  shortText,
  logoUrl,
}: {
  template: TableCardTemplate;
  scale?: number;
  accent: string;
  venueName: string;
  label: string;
  qrUrl: string;
  cta: string;
  shortText: string;
  logoUrl: string | null;
}) {
  const s = (n: number) => n * scale;
  const text = (size: number, strong = false, color = INK) => ({
    fontSize: s(size),
    lineHeight: s(size) * 1.3,
    color,
    fontFamily: strong ? fontFamily.strong : fontFamily.regular,
  });

  if (template === 'sticker') {
    return (
      <View
        style={[
          styles.center,
          {
            width: s(250),
            height: s(250),
            borderRadius: s(125),
            borderWidth: s(12),
            borderColor: accent,
            backgroundColor: QR_PAPER,
            gap: s(4),
          },
        ]}
      >
        <Text style={[text(11, true, GREY), styles.caps]}>{shortText}</Text>
        <QrImage url={qrUrl} size={s(112)} />
        <Text style={text(18, true)} numberOfLines={1}>
          {label}
        </Text>
        <Text style={text(11, false, GREY)} numberOfLines={1}>
          {venueName}
        </Text>
      </View>
    );
  }

  if (template === 'acrylic_stand') {
    return (
      <View style={styles.center}>
        <View
          style={[
            styles.center,
            styles.clip,
            {
              zIndex: 1,
              width: s(196),
              borderRadius: s(14),
              borderWidth: 1,
              borderColor: '#E4E4E7',
              backgroundColor: QR_PAPER,
            },
          ]}
        >
          <View
            style={[
              styles.center,
              { alignSelf: 'stretch', backgroundColor: accent, padding: s(14), gap: s(2) },
            ]}
          >
            <Text style={text(15, true, QR_PAPER)} numberOfLines={1}>
              {venueName}
            </Text>
            <Text style={text(22, true, QR_PAPER)} numberOfLines={1}>
              {label}
            </Text>
          </View>
          <View style={{ marginTop: s(14), marginBottom: s(8) }}>
            <QrImage url={qrUrl} size={s(128)} />
          </View>
          <Text style={[text(11, false, GREY), { marginBottom: s(16) }]}>{shortText}</Text>
        </View>
        <View
          style={{
            width: s(236),
            height: s(28),
            marginTop: -s(10),
            borderRadius: s(8),
            backgroundColor: STAND_BASE,
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.center}>
      {/* The back half of the fold, peeking over the top. */}
      <View
        style={{
          width: s(196),
          height: s(14),
          borderTopLeftRadius: s(10),
          borderTopRightRadius: s(10),
          backgroundColor: FOLD,
        }}
      />
      <View
        style={[
          styles.center,
          {
            width: s(220),
            backgroundColor: QR_PAPER,
            borderTopWidth: s(6),
            borderTopColor: accent,
            borderTopLeftRadius: s(6),
            borderTopRightRadius: s(6),
            borderBottomLeftRadius: s(14),
            borderBottomRightRadius: s(14),
            paddingHorizontal: s(16),
            paddingVertical: s(18),
            gap: s(8),
          },
        ]}
      >
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            style={{ width: s(32), height: s(32), borderRadius: s(6) }}
          />
        ) : null}
        <Text style={text(16, true)} numberOfLines={1}>
          {venueName}
        </Text>
        <View
          style={{
            backgroundColor: INK,
            paddingHorizontal: s(12),
            paddingVertical: s(3),
            borderRadius: s(12),
          }}
        >
          <Text style={text(14, true, QR_PAPER)} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <QrImage url={qrUrl} size={s(132)} />
        <Text style={[text(11, false, GREY), styles.middle]}>{cta}</Text>
      </View>
      {/* Its shadow on the table. */}
      <View
        style={{
          width: s(240),
          height: s(10),
          marginTop: s(4),
          borderRadius: s(120),
          backgroundColor: SHADOW,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  clip: { overflow: 'hidden' },
  caps: { letterSpacing: 0.8, textTransform: 'uppercase' },
  middle: { textAlign: 'center' },
});
