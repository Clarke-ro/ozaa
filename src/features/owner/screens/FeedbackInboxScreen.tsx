import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import {
  Archive,
  ArchiveRestore,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  Frown,
  Inbox,
  Info,
  Lock,
  Meh,
  MessageSquare,
  Palette,
  Phone,
  Search,
  Shield,
  Smile,
  Sparkles,
  Star,
  X,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import type { FeedbackItem, FeedbackSentiment } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import {
  ConfirmDialog,
  DeskCard,
  DeskTabs,
  EmptyCard,
  IconTile,
  ModalSheet,
  SectionLabel,
  StatusPill,
  Toggle,
} from '../kit';
import { AskOzaaAiScreen } from './AskOzaaAiScreen';

const SENTIMENT_CONFIG: Record<
  FeedbackSentiment,
  { label: string; bg: string; text: string; icon: typeof Smile }
> = {
  positive: { label: 'Positive', bg: '#DCFCE7', text: '#15803D', icon: Smile },
  neutral: { label: 'Neutral', bg: '#F4F4F5', text: '#52525B', icon: Meh },
  negative: { label: 'Action Needed', bg: '#FEE2E2', text: '#B91C1C', icon: Frown },
};

export function FeedbackInboxScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();

  // Active tab: 'new' | 'archived' | 'ai'
  const [activeSegment, setActiveSegment] = useState<'new' | 'archived' | 'ai'>('new');
  const [search, setSearch] = useState('');
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  const [feedbackBoxEnabled, setFeedbackBoxEnabled] = useState(true);
  const [allowContactDetails, setAllowContactDetails] = useState(true);

  // Selected feedback for inspection
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);

  const feedbackQuery = useQuery({
    queryKey: ['owner-feedback', venueId, activeSegment, search],
    queryFn: () =>
      api.ownerListFeedback(venueId, {
        state: activeSegment === 'archived' ? 'archived' : 'new',
        search: search.trim() || undefined,
      }),
    enabled: Boolean(venueId && activeSegment !== 'ai'),
  });

  const refresh = () => void client.invalidateQueries({ queryKey: ['owner-feedback', venueId] });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      api.ownerArchiveFeedback(venueId, id, { archived }),
    onSuccess: refresh,
  });

  const items = feedbackQuery.data?.items ?? [];

  const segmentTabs = [
    { id: 'new' as const, label: 'Active Inbox' },
    { id: 'archived' as const, label: 'Archived' },
    { id: 'ai' as const, label: 'AI Assistant' },
  ];

  return (
    <OwnerPage
      title="Feedback Inbox"
      subtitle="Private customer sentiment inbox with anonymity delay protection and AI intelligence."
    >
      <View style={styles.stack}>
        {/* Settings Toggle Header Strip */}
        <DeskCard style={styles.settingsCard}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text variant="body-strong">Private Feedback Box on Venue Page</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                Allows diners to share confidential feedback directly with owners rather than writing public complaints.
              </Text>
            </View>
            <Toggle
              value={feedbackBoxEnabled}
              onChange={setFeedbackBoxEnabled}
              label="Enable feedback"
            />
          </View>

          <View style={[styles.switchRow, styles.topBorder]}>
            <View style={styles.switchText}>
              <Text variant="body-strong">Allow Unhappy Diners to Leave Phone Number</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                Offers unhappy customers an optional contact input so management can reach out and resolve issues.
              </Text>
            </View>
            <Toggle
              value={allowContactDetails}
              onChange={setAllowContactDetails}
              label="Allow contact details"
            />
          </View>
        </DeskCard>

        {/* Dismissible Setup Checklist */}
        {!checklistDismissed ? (
          <DeskCard style={[styles.checklistCard, { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }]}>
            <View style={styles.checklistHeader}>
              <View style={styles.checklistTitleRow}>
                <CheckCircle2 size={20} color={theme.fill} />
                <Text variant="title">Feedback Setup Checklist</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss checklist"
                onPress={() => setChecklistDismissed(true)}
                style={styles.closeBtn}
              >
                <X size={16} color={theme.meta} />
              </Pressable>
            </View>

            <View style={styles.checklistGrid}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/owner/branding' as any)}
                style={styles.checkCardItem}
              >
                <Palette size={18} color={theme.fill} />
                <Text variant="body-strong">1. Design venue page</Text>
                <Text variant="caption" style={{ color: theme.meta }}>
                  Customize your brand colors & logo
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/owner/socials' as any)}
                style={styles.checkCardItem}
              >
                <Star size={18} color={theme.fill} />
                <Text variant="body-strong">2. Add Google review link</Text>
                <Text variant="caption" style={{ color: theme.meta }}>
                  Enable smart star rating gating
                </Text>
              </Pressable>

              <View style={styles.checkCardItem}>
                <Lock size={18} color={theme.fill} />
                <Text variant="body-strong">3. Anonymity delay</Text>
                <Text variant="caption" style={{ color: theme.meta }}>
                  Notes held 2h so diners feel safe
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/owner/tables' as any)}
                style={styles.checkCardItem}
              >
                <Eye size={18} color={theme.fill} />
                <Text variant="body-strong">4. Preview diner page</Text>
                <Text variant="caption" style={{ color: theme.meta }}>
                  Test customer feedback form
                </Text>
              </Pressable>
            </View>
          </DeskCard>
        ) : null}

        {/* Navigation Segments */}
        <DeskTabs tabs={segmentTabs} value={activeSegment} onChange={setActiveSegment} />

        {activeSegment === 'ai' ? (
          <AskOzaaAiScreen venueId={venueId} />
        ) : (
          <DeskWait
            loading={feedbackQuery.isLoading}
            error={feedbackQuery.isError}
            onRetry={() => void feedbackQuery.refetch()}
          >
            {/* Search & Anonymity Delay Badge */}
            <View style={styles.filterRow}>
              <View style={styles.searchBox}>
                <Search size={18} color={theme.meta} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search comments, dishes or keywords..."
                  placeholderTextColor={theme.meta}
                  style={[styles.searchInput, { color: theme.text }]}
                />
                {search ? (
                  <Pressable onPress={() => setSearch('')} hitSlop={8}>
                    <X size={16} color={theme.meta} />
                  </Pressable>
                ) : null}
              </View>

              <View style={[styles.anonymityBadge, { backgroundColor: '#F4F4F5' }]}>
                <Shield size={14} color={theme.meta} />
                <Text variant="caption" style={{ color: theme.meta, fontWeight: '600' }}>
                  2h Anonymity Delay Active
                </Text>
              </View>
            </View>

            {/* Feedback Items List */}
            {items.length === 0 ? (
              <EmptyCard
                icon={Inbox}
                title={
                  search
                    ? 'No feedback matches your search'
                    : activeSegment === 'archived'
                    ? 'No archived feedback items'
                    : 'Inbox is currently clear'
                }
                description={
                  search
                    ? 'Try different keywords or clear the search query.'
                    : 'Customer notes submitted from your table QR code will appear here after the 2-hour anonymity protection delay.'
                }
              />
            ) : (
              <View style={styles.itemsList}>
                {items.map((fb) => {
                  const cfg = SENTIMENT_CONFIG[fb.sentiment] ?? SENTIMENT_CONFIG.neutral;
                  const Icon = cfg.icon;

                  return (
                    <DeskCard key={fb.id} style={styles.feedbackCard}>
                      <View style={styles.fbHeaderRow}>
                        <View style={[styles.sentimentChip, { backgroundColor: cfg.bg }]}>
                          <Icon size={14} color={cfg.text} />
                          <Text variant="caption" style={{ color: cfg.text, fontWeight: '700' }}>
                            {cfg.label}
                          </Text>
                        </View>

                        <View style={styles.dateRow}>
                          <Clock size={12} color={theme.meta} />
                          <Text variant="caption" style={{ color: theme.meta }}>
                            {new Date(fb.createdAt).toLocaleDateString()} •{' '}
                            {new Date(fb.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </View>

                      {/* Comment text */}
                      <Text variant="body" style={styles.commentText}>
                        "{fb.text}"
                      </Text>

                      {/* Photo Attachment if present */}
                      {fb.photoUrl ? (
                        <View style={styles.photoWrap}>
                          <Image
                            source={{ uri: fb.photoUrl }}
                            style={styles.photo}
                            accessibilityLabel="Customer attached photo"
                          />
                        </View>
                      ) : null}

                      {/* Contact chip if provided */}
                      {fb.contactPhone ? (
                        <View style={[styles.contactBox, { backgroundColor: theme.wash }]}>
                          <Phone size={14} color={theme.fill} />
                          <Text variant="caption" style={{ color: theme.text, fontWeight: '600' }}>
                            Customer Contact: {fb.contactName ? `${fb.contactName} (${fb.contactPhone})` : fb.contactPhone}
                          </Text>
                        </View>
                      ) : null}

                      {/* Bottom action: Archive / Unarchive */}
                      <View style={styles.fbActionsRow}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() =>
                            archiveMutation.mutate({
                              id: fb.id,
                              archived: !fb.archived,
                            })
                          }
                          disabled={archiveMutation.isPending}
                          style={styles.archiveActionBtn}
                        >
                          {fb.archived ? (
                            <>
                              <ArchiveRestore size={16} color={theme.fill} />
                              <Text variant="caption" style={{ color: theme.fill, fontWeight: '700' }}>
                                Move to Active Inbox
                              </Text>
                            </>
                          ) : (
                            <>
                              <Archive size={16} color={theme.meta} />
                              <Text variant="caption" style={{ color: theme.meta, fontWeight: '600' }}>
                                Archive
                              </Text>
                            </>
                          )}
                        </Pressable>
                      </View>
                    </DeskCard>
                  );
                })}
              </View>
            )}
          </DeskWait>
        )}
      </View>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
  settingsCard: {
    padding: tokens.space[4],
    gap: tokens.space[3],
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[3],
  },
  topBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4E4E7',
    paddingTop: tokens.space[3],
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  checklistCard: {
    padding: tokens.space[4],
    gap: tokens.space[3],
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checklistTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  closeBtn: {
    padding: 6,
  },
  checklistGrid: {
    flexDirection: 'row',
    gap: tokens.space[2],
    flexWrap: 'wrap',
  },
  checkCardItem: {
    flex: 1,
    minWidth: 140,
    padding: tokens.space[3],
    backgroundColor: '#FFFFFF',
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    flexWrap: 'wrap',
  },
  searchBox: {
    flex: 1,
    minWidth: 240,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: tokens.radius.full,
    paddingHorizontal: tokens.space[3],
    height: 44,
    gap: tokens.space[2],
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  anonymityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: tokens.radius.full,
  },
  itemsList: {
    gap: tokens.space[3],
  },
  feedbackCard: {
    padding: tokens.space[4],
    gap: tokens.space[3],
  },
  fbHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sentimentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  photoWrap: {
    borderRadius: tokens.radius.md,
    overflow: 'hidden',
    marginTop: 2,
  },
  photo: {
    width: '100%',
    height: 160,
    borderRadius: tokens.radius.md,
  },
  contactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    padding: tokens.space[2],
    borderRadius: tokens.radius.sm,
  },
  fbActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: tokens.space[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4E4E7',
  },
  archiveActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
  },
});
