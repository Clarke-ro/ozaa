import { useState } from 'react';
import {
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
  Award,
  Bell,
  Cake,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Gift,
  HelpCircle,
  History,
  QrCode,
  ScanLine,
  Send,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Star,
  Users,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import type { LoyaltyProgram } from '@/lib/api/types';
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
  Field,
  IconTile,
  ModalSheet,
  SectionLabel,
  StatTile,
  StatusPill,
  Toggle,
} from '../kit';
import { LoyaltyCustomersScreen } from './LoyaltyCustomersScreen';
import { LoyaltyAnalyticsScreen } from './LoyaltyAnalyticsScreen';

export function LoyaltyHubScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();

  const [activeTab, setActiveTab] = useState<'program' | 'customers' | 'analytics'>('program');

  // Confirmation to enable stamp card
  const [stampConfirmOpen, setStampConfirmOpen] = useState(false);

  const loyalty = useQuery({
    queryKey: ['owner-loyalty', venueId],
    queryFn: () => api.ownerGetLoyalty(venueId),
    enabled: Boolean(venueId),
  });

  const venue = useQuery({
    queryKey: ['owner-venue', venueId],
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });

  const p = loyalty.data;

  // Program Designer Form State
  const [programKind, setProgramKind] = useState<'stamp_card' | 'rewards_pass' | 'both'>('stamp_card');
  const [rewardName, setRewardName] = useState('');
  const [stampsRequired, setStampsRequired] = useState('10');
  const [secondTierReward, setSecondTierReward] = useState('');
  const [cooldown, setCooldown] = useState<'none' | '1h' | '4h' | '1d'>('1h');
  const [lockscreenMessage, setLockscreenMessage] = useState('');

  // Pass Automations State
  const [welcomeReward, setWelcomeReward] = useState('');
  const [birthdayReward, setBirthdayReward] = useState('');
  const [winbackDays, setWinbackDays] = useState('14');
  const [winbackReward, setWinbackReward] = useState('');
  const [reviewAskReward, setReviewAskReward] = useState('');

  // Pass Appearance
  const [passBgColor, setPassBgColor] = useState('#111111');
  const [passTextColor, setPassTextColor] = useState('#FFFFFF');

  // Sync state when loyalty data loads
  const [hasInitialized, setHasInitialized] = useState(false);
  if (p && !hasInitialized) {
    setProgramKind((p.programKind as any) ?? 'stamp_card');
    setRewardName(p.rewards[0]?.title ?? 'Free Jollof with Tilapia');
    setStampsRequired(String(p.stampsRequired ?? 10));
    setSecondTierReward(p.secondTierReward ?? '');
    setCooldown((p.cooldown as any) ?? '1h');
    setLockscreenMessage(p.lockscreenMessage ?? 'Welcome to Mama Kitchen! Show this to collect stamps.');
    setWelcomeReward(p.automations?.welcomeReward ?? 'Free Welcome Sobolo');
    setBirthdayReward(p.automations?.birthdayReward ?? '20% off Birthday Treat');
    setWinbackDays(String(p.automations?.winbackDays ?? 14));
    setWinbackReward(p.automations?.winbackReward ?? 'Free Dessert on return');
    setReviewAskReward(p.automations?.reviewAskReward ?? '1 Bonus Stamp on feedback');
    setPassBgColor(p.passAppearance?.bgHex ?? '#111111');
    setPassTextColor(p.passAppearance?.textHex ?? '#FFFFFF');
    setHasInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!p) return;
      const updated: LoyaltyProgram = {
        ...p,
        enabled: true,
        programKind,
        stampsRequired: parseInt(stampsRequired, 10) || 10,
        secondTierReward: secondTierReward.trim() || undefined,
        cooldown,
        lockscreenMessage: lockscreenMessage.trim() || undefined,
        rewards: [
          {
            id: p.rewards[0]?.id ?? 'rew_1',
            title: rewardName.trim(),
            cost: parseInt(stampsRequired, 10) || 10,
          },
        ],
        automations: {
          welcomeReward: welcomeReward.trim() || undefined,
          birthdayReward: birthdayReward.trim() || undefined,
          winbackDays: parseInt(winbackDays, 10) || 14,
          winbackReward: winbackReward.trim() || undefined,
          reviewAskReward: reviewAskReward.trim() || undefined,
        },
        passAppearance: {
          bgHex: passBgColor,
          textHex: passTextColor,
        },
      };

      return api.ownerSetLoyalty(venueId, updated);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['owner-loyalty', venueId] });
      void client.invalidateQueries({ queryKey: ['loyalty'] });
    },
  });

  const hubTabs = [
    { id: 'program' as const, label: 'Program Designer' },
    { id: 'customers' as const, label: 'Customer Roster' },
    { id: 'analytics' as const, label: 'Loyalty Analytics' },
  ];

  return (
    <OwnerPage
      title={t('owner.loyalty')}
      subtitle="Reward repeat diners with digital stamp cards, Apple & Google Wallet passes, and automated treats."
    >
      <DeskWait loading={loyalty.isLoading} error={loyalty.isError} onRetry={() => void loyalty.refetch()}>
        <View style={styles.stack}>
          {/* Quick Action Shortcuts Strip */}
          <View style={styles.shortcutsRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/owner/scan' as any)}
              style={[styles.shortcutBtn, { backgroundColor: theme.fill }]}
            >
              <ScanLine size={18} color="#FFFFFF" />
              <Text variant="caption" style={{ color: '#FFFFFF', fontWeight: '700' }}>
                Open Camera Scanner
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/owner/devices' as any)}
              style={[styles.shortcutBtn, { backgroundColor: theme.wash, borderColor: theme.line, borderWidth: 1 }]}
            >
              <Smartphone size={18} color={theme.text} />
              <Text variant="caption" style={{ color: theme.text, fontWeight: '700' }}>
                Paired Scanner Handhelds
              </Text>
            </Pressable>
          </View>

          {/* Navigation Tabs */}
          <DeskTabs tabs={hubTabs} value={activeTab} onChange={setActiveTab} />

          {activeTab === 'customers' ? (
            <LoyaltyCustomersScreen venueId={venueId} />
          ) : activeTab === 'analytics' ? (
            <LoyaltyAnalyticsScreen venueId={venueId} />
          ) : (
            <View style={styles.tabContent}>
              {/* Program Format Selector */}
              <DeskCard style={styles.card}>
                <View style={styles.cardHeader}>
                  <IconTile icon={Gift} tone="tint" size={36} />
                  <View style={{ flex: 1 }}>
                    <Text variant="title">Choose Loyalty Format</Text>
                    <Text variant="caption" style={{ color: theme.meta }}>
                      Select the loyalty experience your guests will see on their mobile phones.
                    </Text>
                  </View>
                </View>

                <View style={styles.formatGrid}>
                  {[
                    {
                      id: 'stamp_card' as const,
                      title: 'Digital Stamp Card',
                      desc: 'Classic 10-stamp punch card. Diners collect stamps with each visit & unlock food.',
                      icon: Award,
                    },
                    {
                      id: 'rewards_pass' as const,
                      title: 'Mobile Wallet Pass',
                      desc: 'Save directly to Apple Wallet & Google Wallet with lock screen notifications.',
                      icon: Smartphone,
                    },
                    {
                      id: 'both' as const,
                      title: 'Stamp Card + Wallet Pass',
                      desc: 'Best of both worlds: digital stamp card with instant mobile wallet pass backup.',
                      icon: Sparkles,
                    },
                  ].map((fmt) => {
                    const active = programKind === fmt.id;
                    const Icon = fmt.icon;
                    return (
                      <Pressable
                        key={fmt.id}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                        onPress={() => {
                          if (fmt.id === 'stamp_card' && programKind !== 'stamp_card') {
                            setStampConfirmOpen(true);
                          } else {
                            setProgramKind(fmt.id);
                          }
                        }}
                        style={[
                          styles.formatCard,
                          {
                            borderColor: active ? theme.fill : theme.line,
                            backgroundColor: active ? '#FFF8F5' : theme.white,
                          },
                        ]}
                      >
                        <View style={styles.formatCardTop}>
                          <Icon size={20} color={active ? theme.fill : theme.meta} />
                          {active ? (
                            <View style={[styles.activeDot, { backgroundColor: theme.fill }]} />
                          ) : null}
                        </View>
                        <Text variant="body-strong">{fmt.title}</Text>
                        <Text variant="caption" style={{ color: theme.meta, lineHeight: 18 }}>
                          {fmt.desc}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </DeskCard>

              {/* Stamp Card Designer (if stamp_card or both) */}
              {programKind !== 'rewards_pass' ? (
                <DeskCard style={styles.card}>
                  <SectionLabel title="STAMP CARD RULES & COOLDOWN" caps />

                  <Field
                    label="Final Reward Name (e.g. Free Main Dish)"
                    value={rewardName}
                    onChangeText={setRewardName}
                    placeholder="e.g. Free Jollof with Tilapia"
                  />

                  <View style={styles.twoColRow}>
                    <Field
                      label="Stamps Required to Unlock"
                      value={stampsRequired}
                      onChangeText={setStampsRequired}
                      placeholder="10"
                      keyboardType="number-pad"
                      style={{ flex: 1 }}
                    />

                    <Field
                      label="Optional Second Tier (Halfway treat)"
                      value={secondTierReward}
                      onChangeText={setSecondTierReward}
                      placeholder="e.g. 5 stamps: Free Kelewele"
                      style={{ flex: 1 }}
                    />
                  </View>

                  {/* Anti-fraud Cooldown Selector */}
                  <View style={styles.cooldownSection}>
                    <View style={styles.cooldownHeader}>
                      <Clock size={16} color={theme.fill} />
                      <Text variant="body-strong">Anti-Fraud Stamp Cooldown</Text>
                    </View>
                    <Text variant="caption" style={{ color: theme.meta }}>
                      Prevents customers from requesting multiple stamps during a single sitting or table turn.
                    </Text>

                    <View style={styles.cooldownChips}>
                      {[
                        { id: 'none' as const, label: 'No Cooldown' },
                        { id: '1h' as const, label: '1 per hour (Standard)' },
                        { id: '4h' as const, label: '1 per 4 hours' },
                        { id: '1d' as const, label: '1 per day' },
                      ].map((cd) => {
                        const active = cooldown === cd.id;
                        return (
                          <Pressable
                            key={cd.id}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: active }}
                            onPress={() => setCooldown(cd.id)}
                            style={[
                              styles.cdChip,
                              {
                                borderColor: active ? theme.fill : theme.line,
                                backgroundColor: active ? theme.wash : theme.white,
                              },
                            ]}
                          >
                            <Text
                              variant="caption"
                              style={{
                                color: active ? theme.fill : theme.text,
                                fontWeight: active ? '700' : '500',
                              }}
                            >
                              {cd.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </DeskCard>
              ) : null}

              {/* Mobile Wallet Pass Designer (if rewards_pass or both) */}
              {programKind !== 'stamp_card' ? (
                <DeskCard style={styles.card}>
                  <SectionLabel title="APPLE & GOOGLE WALLET PASS DESIGN" caps />

                  <View style={styles.passDesignerRow}>
                    {/* Live Wallet Pass Mockup */}
                    <View style={styles.passMockupCol}>
                      <View style={[styles.walletPassMockup, { backgroundColor: passBgColor }]}>
                        <View style={styles.passMockupTop}>
                          <Text variant="caption" style={[styles.passBrandName, { color: passTextColor }]}>
                            {venue.data?.name ?? 'RESTAURANTS'}
                          </Text>
                          <Text variant="caption" style={[styles.passTypeBadge, { color: passTextColor }]}>
                            VIP PASS
                          </Text>
                        </View>

                        <View style={styles.passMockupBody}>
                          <Text variant="display-m" style={[styles.passRewardText, { color: passTextColor }]}>
                            {rewardName || 'Exclusive Rewards'}
                          </Text>
                          <Text variant="caption" style={{ color: passTextColor, opacity: 0.8 }}>
                            {stampsRequired} stamps required for free dish
                          </Text>
                        </View>

                        <View style={styles.passMockupFooter}>
                          <View style={styles.passQrBox}>
                            <QrCode size={40} color="#111" />
                          </View>
                          <Text variant="caption" style={{ color: passTextColor, fontSize: 10, opacity: 0.7 }}>
                            Scan to earn & redeem
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Pass Controls */}
                    <View style={styles.passControlsCol}>
                      <Field
                        label="Lock Screen Nearby Notification Message"
                        value={lockscreenMessage}
                        onChangeText={(val) => setLockscreenMessage(val.slice(0, 60))}
                        placeholder="e.g. Welcome back to Mama's! Show pass for stamps."
                      />
                      <Text variant="caption" style={{ color: theme.meta, textAlign: 'right' }}>
                        {lockscreenMessage.length}/60 chars max
                      </Text>

                      {/* Pass Theme Colors */}
                      <View style={styles.colorsRow}>
                        <Text variant="caption" style={{ color: theme.meta, fontWeight: '700' }}>
                          PASS CARD COLOR
                        </Text>
                        <View style={styles.colorSwatches}>
                          {['#111111', '#D24000', '#047857', '#1E3A8A', '#701A75'].map((hex) => {
                            const isSelected = passBgColor === hex;
                            return (
                              <Pressable
                                key={hex}
                                accessibilityRole="button"
                                onPress={() => setPassBgColor(hex)}
                                style={[
                                  styles.colorDot,
                                  {
                                    backgroundColor: hex,
                                    borderColor: isSelected ? theme.fill : 'transparent',
                                    borderWidth: isSelected ? 2 : 0,
                                  },
                                ]}
                              />
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  </View>
                </DeskCard>
              ) : null}

              {/* Loyalty Automations Card */}
              <DeskCard style={styles.card}>
                <SectionLabel title="AUTOMATED GUEST REWARDS (PASS & DINERS)" caps />
                <Text variant="caption" style={{ color: theme.meta }}>
                  Ozaa automatically sends notifications and perks to delight repeat diners.
                </Text>

                <View style={styles.automationsList}>
                  {/* Welcome Treat */}
                  <View style={[styles.autoItem, { borderColor: theme.line }]}>
                    <View style={styles.autoHeader}>
                      <IconTile icon={Gift} tone="tint" size={32} />
                      <View style={{ flex: 1 }}>
                        <Text variant="body-strong">Instant Welcome Treat</Text>
                        <Text variant="caption" style={{ color: theme.meta }}>
                          Delivered immediately when a diner joins your rewards program.
                        </Text>
                      </View>
                    </View>
                    <Field
                      label=""
                      value={welcomeReward}
                      onChangeText={setWelcomeReward}
                      placeholder="e.g. Free Welcome Sobolo"
                    />
                  </View>

                  {/* Birthday Perk */}
                  <View style={[styles.autoItem, { borderColor: theme.line }]}>
                    <View style={styles.autoHeader}>
                      <IconTile icon={Cake} tone="tint" size={32} />
                      <View style={{ flex: 1 }}>
                        <Text variant="body-strong">Birthday Month Celebration</Text>
                        <Text variant="caption" style={{ color: theme.meta }}>
                          Triggered during the customer's birthday week.
                        </Text>
                      </View>
                    </View>
                    <Field
                      label=""
                      value={birthdayReward}
                      onChangeText={setBirthdayReward}
                      placeholder="e.g. 20% off whole table bill"
                    />
                  </View>

                  {/* Win-back Inactive Diners */}
                  <View style={[styles.autoItem, { borderColor: theme.line }]}>
                    <View style={styles.autoHeader}>
                      <IconTile icon={Flame} tone="tint" size={32} />
                      <View style={{ flex: 1 }}>
                        <Text variant="body-strong">We Miss You Win-Back</Text>
                        <Text variant="caption" style={{ color: theme.meta }}>
                          Delivered when a loyal customer hasn't visited in {winbackDays} days.
                        </Text>
                      </View>
                    </View>
                    <View style={styles.twoColRow}>
                      <Field
                        label="Days of inactivity"
                        value={winbackDays}
                        onChangeText={setWinbackDays}
                        placeholder="14"
                        keyboardType="number-pad"
                        style={{ width: 100 }}
                      />
                      <Field
                        label="Reward offer"
                        value={winbackReward}
                        onChangeText={setWinbackReward}
                        placeholder="e.g. Complimentary Chef Dessert"
                        style={{ flex: 1 }}
                      />
                    </View>
                  </View>
                </View>
              </DeskCard>

              {/* Publish & Save Action */}
              <View style={styles.saveContainer}>
                <Button
                  label={saveMutation.isSuccess ? 'Loyalty program published' : 'Publish loyalty program'}
                  tone="primary"
                  onPress={() => saveMutation.mutate()}
                  loading={saveMutation.isPending}
                />
              </View>
            </View>
          )}
        </View>

        {/* Confirm Stamp Card Enable Dialog */}
        <ConfirmDialog
          visible={stampConfirmOpen}
          title="Enable Digital Stamp Card"
          message="This will switch your primary diner loyalty format to the 10-stamp card. Diners will collect stamps with each visit."
          confirmLabel="Enable Stamp Card"
          onConfirm={() => {
            setProgramKind('stamp_card');
            setStampConfirmOpen(false);
          }}
          onCancel={() => setStampConfirmOpen(false)}
        />
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
  shortcutsRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
    flexWrap: 'wrap',
  },
  shortcutBtn: {
    flex: 1,
    minWidth: 160,
    minHeight: 44,
    borderRadius: tokens.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[2],
    paddingHorizontal: tokens.space[3],
  },
  tabContent: {
    gap: tokens.space[4],
  },
  card: {
    padding: tokens.space[4],
    gap: tokens.space[3],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  formatGrid: {
    gap: tokens.space[2],
  },
  formatCard: {
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    gap: tokens.space[1],
  },
  formatCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: tokens.space[3],
    flexWrap: 'wrap',
  },
  cooldownSection: {
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: '#FAF5FF',
    gap: tokens.space[2],
  },
  cooldownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cooldownChips: {
    flexDirection: 'row',
    gap: tokens.space[2],
    flexWrap: 'wrap',
    marginTop: 2,
  },
  cdChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  passDesignerRow: {
    flexDirection: 'row',
    gap: tokens.space[4],
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  passMockupCol: {
    width: '100%',
    maxWidth: 280,
  },
  walletPassMockup: {
    borderRadius: 16,
    padding: tokens.space[4],
    minHeight: 220,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  passMockupTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passBrandName: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  passTypeBadge: {
    fontSize: 10,
    fontWeight: '800',
    opacity: 0.8,
  },
  passMockupBody: {
    gap: 4,
    marginVertical: tokens.space[3],
  },
  passRewardText: {
    fontSize: 20,
    fontWeight: '800',
  },
  passMockupFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: tokens.space[2],
  },
  passQrBox: {
    backgroundColor: '#FFFFFF',
    padding: 4,
    borderRadius: 6,
  },
  passControlsCol: {
    flex: 1,
    minWidth: 260,
    gap: tokens.space[3],
  },
  colorsRow: {
    gap: tokens.space[2],
  },
  colorSwatches: {
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  automationsList: {
    gap: tokens.space[3],
  },
  autoItem: {
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    gap: tokens.space[2],
  },
  autoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  saveContainer: {
    paddingVertical: tokens.space[2],
  },
});
