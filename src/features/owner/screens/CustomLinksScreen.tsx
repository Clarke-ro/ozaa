import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Clock,
  Edit2,
  Gift,
  Globe,
  Link as LinkIcon,
  MousePointerClick,
  Music,
  Sparkles,
  Ticket,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import type { CustomLink } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import {
  ConfirmDialog,
  DeskCard,
  EmptyCard,
  Field,
  IconTile,
  ModalSheet,
  SectionLabel,
  Toggle,
  toast,
} from '../kit';
import { checkLink } from '../desk/linkForm';

const LINK_ERRORS = {
  title: 'Add the words guests will see on the button.',
  url: 'Enter a web address, for example mamas.kitchen/book.',
  start: 'Use the format YYYY-MM-DD, for example 2026-12-01.',
  end: 'Use YYYY-MM-DD, on or after the From date.',
} as const;

const ICON_MAP: Record<string, LucideIcon> = {
  globe: Globe,
  gift: Gift,
  music: Music,
  calendar: Calendar,
  ticket: Ticket,
  sparkles: Sparkles,
  link: LinkIcon,
};

const ICONS = ['globe', 'gift', 'music', 'calendar', 'ticket', 'sparkles', 'link'] as const;

export function CustomLinksScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();

  const links = useQuery({
    queryKey: ['owner-links', venueId],
    queryFn: () => api.ownerListCustomLinks(venueId),
    enabled: Boolean(venueId),
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<CustomLink | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CustomLink | null>(null);

  const refresh = () => void client.invalidateQueries({ queryKey: ['owner-links', venueId] });

  const toggleMutation = useMutation({
    mutationFn: (link: CustomLink) =>
      api.ownerUpdateCustomLink(venueId, link.id, {
        title: link.title,
        url: link.url,
        icon: link.icon,
        placement: link.placement,
        enabled: !link.enabled,
        startDate: link.startDate,
        endDate: link.endDate,
      }),
    onSuccess: refresh,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.ownerDeleteCustomLink(venueId, id),
    onSuccess: () => {
      setDeleteConfirm(null);
      refresh();
    },
  });

  const items = links.data?.items ?? [];

  const buttonItems = items.filter((i) => i.placement === 'button');
  const bannerItems = items.filter((i) => i.placement === 'banner');
  const menuItems = items.filter((i) => i.placement === 'menu');

  return (
    <OwnerPage title={t('owner.links')}>
      <DeskWait
        loading={links.isLoading}
        error={links.isError}
        onRetry={() => void links.refetch()}
      >
        <View style={styles.stack}>
          {/* Top Actions Bar */}
          <View style={styles.topActionsRow}>
            <View>
              <Text variant="title">Active Action Buttons</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                {items.length} link{items.length === 1 ? '' : 's'} configured
              </Text>
            </View>

            <Button
              label="Add new link"
              tone="primary"
              onPress={() => {
                setEditingLink(null);
                setModalOpen(true);
              }}
            />
          </View>

          {items.length === 0 ? (
            <EmptyCard
              icon={LinkIcon}
              title="No custom links created yet"
              description="Add interactive action buttons on your guest menu for table bookings, event tickets, playlists, and promotions."
              actionLabel="Create your first link"
              onAction={() => {
                setEditingLink(null);
                setModalOpen(true);
              }}
            />
          ) : (
            <View style={styles.sectionsList}>
              {/* Group 1: Action Buttons */}
              {buttonItems.length > 0 ? (
                <View style={styles.placementGroup}>
                  <SectionLabel title="PRIMARY ACTION BUTTONS" caps />
                  {buttonItems.map((item) => (
                    <LinkRowCard
                      key={item.id}
                      item={item}
                      onEdit={() => {
                        setEditingLink(item);
                        setModalOpen(true);
                      }}
                      onDelete={() => setDeleteConfirm(item)}
                      onToggle={() => toggleMutation.mutate(item)}
                      toggleLoading={toggleMutation.isPending}
                    />
                  ))}
                </View>
              ) : null}

              {/* Group 2: Promotional Banners */}
              {bannerItems.length > 0 ? (
                <View style={styles.placementGroup}>
                  <SectionLabel title="IN-MENU BANNERS & CAROUSEL" caps />
                  {bannerItems.map((item) => (
                    <LinkRowCard
                      key={item.id}
                      item={item}
                      onEdit={() => {
                        setEditingLink(item);
                        setModalOpen(true);
                      }}
                      onDelete={() => setDeleteConfirm(item)}
                      onToggle={() => toggleMutation.mutate(item)}
                      toggleLoading={toggleMutation.isPending}
                    />
                  ))}
                </View>
              ) : null}

              {/* Group 3: Menu Links */}
              {menuItems.length > 0 ? (
                <View style={styles.placementGroup}>
                  <SectionLabel title="MENU FOOTER & MORE LINKS" caps />
                  {menuItems.map((item) => (
                    <LinkRowCard
                      key={item.id}
                      item={item}
                      onEdit={() => {
                        setEditingLink(item);
                        setModalOpen(true);
                      }}
                      onDelete={() => setDeleteConfirm(item)}
                      onToggle={() => toggleMutation.mutate(item)}
                      toggleLoading={toggleMutation.isPending}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* Create / Edit Modal */}
        <CustomLinkModal
          visible={modalOpen}
          link={editingLink}
          venueId={venueId}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            refresh();
          }}
        />

        {/* Confirm Delete Dialog */}
        <ConfirmDialog
          visible={Boolean(deleteConfirm)}
          title="Delete Custom Link"
          message={`Are you sure you want to remove "${deleteConfirm?.title}"? Diners will no longer see this button.`}
          confirmLabel="Delete"
          destructive
          loading={deleteMutation.isPending}
          onConfirm={() => {
            if (deleteConfirm) deleteMutation.mutate(deleteConfirm.id);
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      </DeskWait>
    </OwnerPage>
  );
}

function LinkRowCard({
  item,
  onEdit,
  onDelete,
  onToggle,
  toggleLoading,
}: {
  item: CustomLink;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  toggleLoading: boolean;
}) {
  const theme = useTheme();
  const Icon = ICON_MAP[item.icon ?? 'globe'] ?? Globe;

  return (
    <DeskCard style={[styles.linkCard, !item.enabled && { opacity: 0.75 }]}>
      <View style={styles.linkMainRow}>
        <IconTile icon={Icon} tone={item.enabled ? 'tint' : 'wash'} size={36} />

        <View style={styles.linkInfoCol}>
          <View style={styles.titleWithBadgeRow}>
            <Text variant="title" style={styles.linkTitle}>
              {item.title}
            </Text>
            {item.clicks !== undefined ? (
              <View style={[styles.clickPill, { backgroundColor: theme.successTint }]}>
                <MousePointerClick size={12} color={theme.success} />
                <Text variant="caption" style={{ color: theme.success, fontWeight: '700' }}>
                  {item.clicks} click{item.clicks === 1 ? '' : 's'}
                </Text>
              </View>
            ) : null}
          </View>

          <Text variant="caption" style={{ color: theme.meta }} numberOfLines={1}>
            {item.url}
          </Text>

          {item.startDate || item.endDate ? (
            <View style={styles.scheduleRow}>
              <Clock size={12} color={theme.meta} />
              <Text variant="caption" style={{ color: theme.meta }}>
                Scheduled: {item.startDate ? new Date(item.startDate).toLocaleDateString() : 'Now'}{' '}
                - {item.endDate ? new Date(item.endDate).toLocaleDateString() : 'Indefinite'}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Right Controls */}
        <View style={styles.linkControls}>
          <Toggle
            value={item.enabled}
            onChange={onToggle}
            label={item.title}
            disabled={toggleLoading}
          />

          <View style={styles.iconActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${item.title}`}
              onPress={onEdit}
              style={[styles.smallBtn, { backgroundColor: theme.wash }]}
            >
              <Edit2 size={16} color={theme.text} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.title}`}
              onPress={onDelete}
              style={[styles.smallBtn, { backgroundColor: theme.errorTint }]}
            >
              <Trash2 size={16} color={theme.error} />
            </Pressable>
          </View>
        </View>
      </View>
    </DeskCard>
  );
}

function CustomLinkModal({
  visible,
  link,
  venueId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  link: CustomLink | null;
  venueId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const theme = useTheme();
  const [title, setTitle] = useState(link?.title ?? '');
  const [url, setUrl] = useState(link?.url ?? '');
  const [icon, setIcon] = useState<string>(link?.icon ?? 'globe');
  const [placement, setPlacement] = useState<'button' | 'banner' | 'menu'>(
    link?.placement ?? 'button',
  );
  const enabled = link?.enabled ?? true;
  const [hasSchedule, setHasSchedule] = useState(Boolean(link?.startDate || link?.endDate));
  // Edited as YYYY-MM-DD; saved as the start and end of those days.
  const [startDate, setStartDate] = useState(link?.startDate?.slice(0, 10) ?? '');
  const [endDate, setEndDate] = useState(link?.endDate?.slice(0, 10) ?? '');
  const [showErrors, setShowErrors] = useState(false);
  const check = checkLink({ title, url, hasSchedule, start: startDate, end: endDate });
  const errorFor = (field: 'title' | 'url' | 'start' | 'end') =>
    showErrors && !check.ok && check.field === field ? LINK_ERRORS[field] : undefined;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!check.ok) throw new Error('invalid');
      const payload = {
        title: title.trim(),
        url: check.url,
        icon,
        placement,
        enabled,
        startDate: check.startDate,
        endDate: check.endDate,
      };

      if (link) {
        return api.ownerUpdateCustomLink(venueId, link.id, payload);
      } else {
        return api.ownerCreateCustomLink(venueId, payload);
      }
    },
    onSuccess: () => {
      toast.success(link ? 'Link saved' : 'Link added');
      onSaved();
    },
    onError: () => toast.error('That did not save. Check the connection and try again.'),
  });

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={link ? 'Edit Action Link' : 'Add Action Link'}
    >
      <View style={modalStyles.stack}>
        <Field
          label="Button text"
          error={errorFor('title')}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Reserve a VIP Booth, Friday DJ Set, Buy Tickets"
        />

        <Field
          label="Link"
          error={errorFor('url')}
          value={url}
          onChangeText={setUrl}
          placeholder="mamas.kitchen/book"
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={modalStyles.scheduleRow}>
          <View style={{ flex: 1 }}>
            <Text variant="body-strong">Show only between dates</Text>
            <Text variant="caption" style={{ color: theme.muted }}>
              For an event or a deal that ends. Leave a date empty to keep that side open.
            </Text>
          </View>
          <Toggle value={hasSchedule} onChange={setHasSchedule} label="Show only between dates" />
        </View>
        {hasSchedule ? (
          <View style={modalStyles.dates}>
            <Field
              label="From"
              hint="YYYY-MM-DD"
              error={errorFor('start')}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="2026-12-01"
              keyboardType="numbers-and-punctuation"
            />
            <Field
              label="Until"
              hint="YYYY-MM-DD"
              error={errorFor('end')}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="2026-12-24"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        ) : null}

        {/* Icon Picker */}
        <View style={modalStyles.group}>
          <Text variant="caption" style={{ color: theme.meta, fontWeight: '700' }}>
            ICON
          </Text>
          <View style={modalStyles.iconsRow}>
            {ICONS.map((ic) => {
              const IconComp = ICON_MAP[ic] ?? Globe;
              const selected = icon === ic;
              return (
                <Pressable
                  key={ic}
                  accessibilityRole="button"
                  accessibilityLabel={ic}
                  onPress={() => setIcon(ic)}
                  style={[
                    modalStyles.iconChoice,
                    {
                      borderColor: selected ? theme.fill : theme.line,
                      backgroundColor: selected ? theme.wash : theme.surface,
                    },
                  ]}
                >
                  <IconComp size={20} color={selected ? theme.fill : theme.text} />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Placement Picker */}
        <View style={modalStyles.group}>
          <Text variant="caption" style={{ color: theme.meta, fontWeight: '700' }}>
            PAGE PLACEMENT
          </Text>
          <View style={modalStyles.placementRow}>
            {[
              { id: 'button' as const, label: 'Hero Action Button' },
              { id: 'banner' as const, label: 'In-Menu Banner' },
              { id: 'menu' as const, label: 'Menu Footer' },
            ].map((p) => {
              const active = placement === p.id;
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  onPress={() => setPlacement(p.id)}
                  style={[
                    modalStyles.placementBtn,
                    {
                      borderColor: active ? theme.fill : theme.line,
                      backgroundColor: active ? theme.fill : theme.surface,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: active ? theme.onFill : theme.text,
                      fontWeight: active ? '700' : '500',
                    }}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button
          label={link ? 'Save link' : 'Create link'}
          tone="primary"
          onPress={() => {
            if (!check.ok) {
              setShowErrors(true);
              return;
            }
            saveMutation.mutate();
          }}
          loading={saveMutation.isPending}
        />
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  sectionsList: {
    gap: tokens.space[4],
  },
  placementGroup: {
    gap: tokens.space[2],
  },
  linkCard: {
    padding: tokens.space[3],
  },
  linkMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  linkInfoCol: {
    flex: 1,
    gap: 2,
  },
  titleWithBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    flexWrap: 'wrap',
  },
  linkTitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  clickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  linkControls: {
    alignItems: 'flex-end',
    gap: tokens.space[2],
  },
  iconActions: {
    flexDirection: 'row',
    gap: tokens.space[1],
  },
  smallBtn: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const modalStyles = StyleSheet.create({
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  dates: { flexDirection: 'row', gap: tokens.space[3] },
  stack: {
    gap: tokens.space[4],
  },
  group: {
    gap: tokens.space[2],
  },
  iconsRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
    flexWrap: 'wrap',
  },
  iconChoice: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placementRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  placementBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
