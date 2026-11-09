import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Inbox, Search, Shield, X } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { DeskTabs, EmptyCard, toast } from '../../kit';
import { AskCravinsAiScreen } from '../AskCravinsAiScreen';
import { FeedbackCard } from './FeedbackCard';

type Tab = 'new' | 'archived' | 'ai';

export function FeedbackScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
    const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();
  const [tab, setTab] = useState<Tab>('new');
  const [search, setSearch] = useState('');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const query = useDebouncedValue(search.trim());

  const list = useQuery({
    queryKey: [...ownerKeys.feedback(venueId), tab, query],
    queryFn: () =>
      api.ownerListFeedback(venueId, {
        state: tab === 'archived' ? 'archived' : 'new',
        search: query || undefined,
      }),
    enabled: Boolean(venueId) && tab !== 'ai',
    placeholderData: keepPreviousData,
  });
  const unread = useQuery({
    queryKey: [...ownerKeys.feedback(venueId), 'new', ''],
    queryFn: () => api.ownerListFeedback(venueId, { state: 'new' }),
    enabled: Boolean(venueId),
  });

  const archive = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      api.ownerArchiveFeedback(venueId, id, { archived }),
    onSuccess: (_data, { archived }) => {
      void client.invalidateQueries({ queryKey: ownerKeys.feedback(venueId) });
      toast.success(archived ? t('ownerFeedback.archived') : t('ownerFeedback.restored'));
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });

  const items = list.data?.items ?? [];

  return (
    <OwnerPage title={t('owner.feedback')} subtitle={t('ownerLead.feedback')}>
      <DeskTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'new', label: t('ownerFeedback.new'), count: unread.data?.items.length },
          { id: 'archived', label: t('ownerFeedback.archivedTab') },
          { id: 'ai', label: t('ownerFeedback.ask') },
        ]}
      />
      {tab === 'ai' ? (
        <AskCravinsAiScreen venueId={venueId} />
      ) : (
        <>
          <View style={styles.toolbar}>
            <View
              style={[styles.search, { borderColor: theme.line, backgroundColor: theme.surface }]}
            >
              <Search size={18} color={theme.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t('ownerFeedback.search')}
                placeholderTextColor={theme.meta}
                accessibilityLabel={t('ownerFeedback.search')}
                returnKeyType="search"
                style={[styles.input, { color: theme.text }]}
              />
              {search ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('ownerFeedback.clear')}
                  onPress={() => setSearch('')}
                  style={styles.clear}
                >
                  <X size={18} color={theme.muted} />
                </Pressable>
              ) : null}
            </View>
            <View style={styles.note}>
              <Shield size={14} color={theme.muted} />
              <Text variant="caption" style={{ color: theme.muted }}>
                {t('ownerFeedback.delay')}
              </Text>
            </View>
          </View>
          <DeskWait
            loading={list.isLoading}
            error={list.isError}
            onRetry={() => void list.refetch()}
          >
            {items.length === 0 ? (
              <EmptyCard
                icon={Inbox}
                title={
                  query
                    ? t('ownerFeedback.noMatch')
                    : tab === 'archived'
                      ? t('ownerFeedback.noArchived')
                      : t('ownerFeedback.empty')
                }
                description={query ? t('ownerFeedback.noMatchBody') : t('ownerFeedback.emptyBody')}
              />
            ) : (
              <View style={styles.list}>
                {items.map((item) => (
                  <View key={item.id}>
                    <FeedbackCard
                      now={now}
                      item={item}
                      busy={archive.isPending && archive.variables?.id === item.id}
                      onArchive={(archived) => archive.mutate({ id: item.id, archived })}
                    />
                  </View>
                ))}
              </View>
            )}
          </DeskWait>
        </>
      )}
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  toolbar: { gap: tokens.space[2] },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: 44,
    paddingLeft: tokens.space[3],
    borderWidth: 1,
    borderRadius: tokens.radius.md,
  },
  input: { flex: 1, minHeight: 42, fontFamily: 'Inter_400', fontSize: 15 },
  clear: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  list: { gap: tokens.space[3] },
});
