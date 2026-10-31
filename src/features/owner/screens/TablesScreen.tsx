import { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { qrModules } from '@/lib/qrSvg';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';

export function TablesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();
  const [codes, setCodes] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const tables = useQuery({ queryKey: ['owner-tables', venueId], queryFn: () => api.ownerListTables(venueId), enabled: Boolean(venueId) });
  const venue = useQuery({ queryKey: ['owner-venue', venueId], queryFn: () => api.ownerGetVenue(venueId), enabled: Boolean(venueId) });
  const add = useMutation({
    mutationFn: () => api.ownerCreateTables(venueId, { codes: codes.split(',').map((code) => code.trim()).filter(Boolean) }),
    onSuccess: () => {
      setCodes('');
      void client.invalidateQueries({ queryKey: ['owner-tables', venueId] });
    },
  });
  const open = tables.data?.items.find((table) => table.id === openId) ?? null;

  return (
    <OwnerPage title={t('owner.tables')}>
      <DeskWait loading={tables.isLoading} error={tables.isError} onRetry={() => void tables.refetch()}>
        {open?.qrUrl ? (
          <View style={styles.sticker}>
            <Image source={require('../../../../assets/images/icon.png')} style={styles.logo} accessibilityIgnoresInvertColors />
            <Text variant="title">{venue.data?.name}</Text>
            <Text>{open.label ?? open.code}</Text>
            <QrMark url={open.qrUrl} />
            {Platform.OS === 'web' ? <Button label={t('owner.printQr')} onPress={() => window.print()} /> : <Text variant="caption">{t('owner.printQr')}</Text>}
          </View>
        ) : null}
        {(tables.data?.items ?? []).map((table) => (
          <Pressable key={table.id} accessibilityRole="button" accessibilityLabel={table.label ?? table.code} onPress={() => setOpenId(table.id)} style={[styles.row, { borderColor: theme.line }]}>
            <Text variant="body-strong">{table.label ?? table.code}</Text>
            <Text variant="caption" style={{ color: theme.meta }}>{table.qrUrl}</Text>
          </Pressable>
        ))}
        <TextInput accessibilityLabel={t('owner.tableCodes')} value={codes} onChangeText={setCodes} placeholder="9, 10" style={[styles.input, { borderColor: theme.line, color: theme.text }]} />
        <Button label={t('owner.addTables')} tone="secondary" onPress={() => add.mutate()} loading={add.isPending} />
      </DeskWait>
    </OwnerPage>
  );
}

function QrMark({ url }: { url: string }) {
  const drawn = qrModules(url, 180);
  return (
    <Svg width={180} height={180} viewBox={`0 0 ${drawn.size} ${drawn.size}`}>
      <Rect width={drawn.size} height={drawn.size} fill="#FFFFFF" />
      <Path d={drawn.path} fill="#111111" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  row: { borderBottomWidth: 1, paddingVertical: tokens.space[3], gap: 4 },
  sticker: { alignItems: 'center', gap: tokens.space[2], paddingVertical: tokens.space[4] },
  logo: { width: 48, height: 48 },
  input: { borderWidth: 1, borderRadius: tokens.radius.md, minHeight: 48, paddingHorizontal: tokens.space[3] },
});
