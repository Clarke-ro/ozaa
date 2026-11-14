import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { ownerKeys } from '../../data/keys';
import { cardStyle } from '../../kit';

const MAX = 5;

/**
 * Find a member without their card: by name or the last 4 digits of their phone. A card code
 * typed here and sent with Enter goes to the scanner instead.
 */
export function GuestLookup({
  venueId,
  busyId,
  onStamp,
  onCode,
}: {
  venueId: string;
  busyId: string | null;
  onStamp: (customerId: string) => void;
  onCode: (code: string) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const query = useDebouncedValue(text.trim());
  const found = useQuery({
    queryKey: [...ownerKeys.loyaltyCustomers(venueId), query, 'lookup'],
    queryFn: () => api.ownerListLoyaltyCustomers(venueId, { search: query }),
    enabled: Boolean(venueId) && query.length >= 2,
  });
  const items = (found.data?.items ?? []).slice(0, MAX);
  return (
    <View style={[cardStyle(theme), styles.card]}>
      <Text variant="body-strong">{t('ownerScan.lookupTitle')}</Text>
      <View style={styles.findRow}>
        <TextInput
          accessibilityLabel={t('ownerScan.lookupLabel')}
          placeholder={t('ownerScan.lookupHint')}
          placeholderTextColor={theme.meta}
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => text.trim() && onCode(text.trim())}
          autoCorrect={false}
          style={[
            styles.input,
            styles.flex,
            { borderColor: theme.line, color: theme.text, backgroundColor: theme.surface },
          ]}
        />
        <Button
          label={t('ownerScan.find')}
          tone="secondary"
          disabled={!text.trim()}
          onPress={() => onCode(text.trim())}
        />
      </View>
      {query.length >= 2 && found.data && items.length === 0 ? (
        <Text variant="caption" style={{ color: theme.muted }}>
          {t('ownerScan.noMatch')}
        </Text>
      ) : null}
      {items.map((member) => (
        <View key={member.id} style={[styles.row, { borderTopColor: theme.line }]}>
          <View style={styles.flex}>
            <Text variant="body-strong" numberOfLines={1}>
              {member.name}
            </Text>
            <Text variant="caption" style={{ color: theme.muted }}>
              {`${member.phoneMasked} · ${t('ownerMembers.stamps', { count: member.stamps })}`}
            </Text>
          </View>
          <Button
            label={t('ownerMembers.addStamp')}
            tone="secondary"
            size="md"
            loading={busyId === member.id}
            onPress={() => onStamp(member.id)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  findRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  card: { padding: tokens.space[5], gap: tokens.space[3] },
  input: {
    minHeight: tokens.touchTarget + 4,
    borderWidth: 1,
    borderRadius: tokens.radius.full,
    paddingHorizontal: tokens.space[4],
    fontFamily: fontFamily.regular,
    fontSize: tokens.type.body.size,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingTop: tokens.space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  flex: { flex: 1, minWidth: 0, gap: 2 },
});
