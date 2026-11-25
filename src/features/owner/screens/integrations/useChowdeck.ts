import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { toMessageKey } from '@/lib/api/errors';
import type { Channel, ChannelPatch, ChowdeckKeysInput } from '@/lib/api/types';
import { ownerKeys } from '../../data/keys';
import { toast } from '../../kit';

/**
 * The Chowdeck channel, the menu it publishes, and every change the card can make. While a send
 * is in progress the channel is asked again every 2 s, so the card shows when it is done.
 */
export function useChowdeck(venueId: string) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const key = ownerKeys.channels(venueId);
  const channels = useQuery({
    queryKey: key,
    queryFn: () => api.ownerListChannels(venueId),
    enabled: Boolean(venueId),
    refetchInterval: (query) =>
      query.state.data?.channels[2]?.sync.state === 'pending' ? 2_000 : false,
  });
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  const slug = venue.data?.slug ?? '';
  const menu = useQuery({
    queryKey: ownerKeys.menu(slug),
    queryFn: () => api.getMenu(slug),
    enabled: Boolean(slug),
  });

  // Every call answers with the Chowdeck channel as it now is: put it straight into the list.
  const keep = (next: Channel) =>
    client.setQueryData<{ channels: Channel[] }>(key, (old) =>
      old ? { channels: old.channels.map((c) => (c.kind === next.kind ? next : c)) } : old,
    );
  const failed = (error: unknown) => toast.error(t(toMessageKey(error)));

  const connect = useMutation({
    mutationFn: (body: ChowdeckKeysInput) => api.ownerConnectChowdeck(venueId, body),
    onSuccess: (next) => {
      keep(next);
      toast.success(t('ownerChannels.connected'));
    },
    onError: failed,
  });
  const disconnect = useMutation({
    mutationFn: () => api.ownerDisconnectChowdeck(venueId),
    onSuccess: keep,
    onError: failed,
  });
  const update = useMutation({
    mutationFn: (patch: ChannelPatch) => api.ownerUpdateChannel(venueId, 'chowdeck', patch),
    onSuccess: keep,
    onError: failed,
  });
  const publish = useMutation({
    mutationFn: () => api.ownerPublishChannel(venueId, 'chowdeck'),
    onSuccess: (next) => {
      keep(next);
      toast.success(t('ownerChannels.queued'));
    },
    onError: failed,
  });

  return {
    channel: channels.data?.channels[2] ?? null,
    menu: menu.data ?? null,
    currency: venue.data?.currency ?? 'GHS',
    loading: channels.isPending,
    connect,
    disconnect,
    update,
    publish,
  };
}
