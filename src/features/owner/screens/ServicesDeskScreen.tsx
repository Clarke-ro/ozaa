import { useState } from 'react';
import {
  Clipboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Gamepad2,
  Gift,
  Plus,
  QrCode,
  Shield,
  Star,
  Tag,
  Trash2,
  Wifi,
  type LucideIcon,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import type { ServiceSettings, Wifi as WifiType } from '@/lib/api/types';
import { qrModules } from '@/lib/qrSvg';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { formatWifiQrString, type WifiSecurity } from '@/features/venue/wifiQr';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import { DeskCard, Field, IconTile, ListRow, SectionLabel, Toggle } from '../kit';

type ServiceId =
  | 'menu'
  | 'waiter'
  | 'status'
  | 'pay'
  | 'wifi'
  | 'loyalty'
  | 'offers'
  | 'review'
  | 'play'
  | 'reserve'
  | 'events'
  | 'feedback'
  | 'about';

type ServiceGroup = {
  section: string;
  items: {
    id: ServiceId;
    title: string;
    description: string;
    icon: LucideIcon;
  }[];
};

const SERVICE_GROUPS: ServiceGroup[] = [
  {
    section: 'AT YOUR TABLE',
    items: [
      {
        id: 'menu',
        title: 'Menu',
        description: 'Food and drinks, order from your table',
        icon: BookOpen,
      },
      {
        id: 'waiter',
        title: 'Call waiter',
        description: 'Water, the bill or assistance',
        icon: Bell,
      },
      {
        id: 'status',
        title: 'Order status',
        description: 'See live preparation progress',
        icon: Clock,
      },
      {
        id: 'pay',
        title: 'Pay & split bill',
        description: 'MoMo or card, split any way',
        icon: CreditCard,
      },
      {
        id: 'wifi',
        title: 'Wi-Fi',
        description: 'Connect in one tap via QR',
        icon: Wifi,
      },
    ],
  },
  {
    section: 'REWARDS & SOCIAL',
    items: [
      {
        id: 'loyalty',
        title: 'Loyalty card',
        description: 'Collect stamps, unlock free dishes',
        icon: Gift,
      },
      {
        id: 'offers',
        title: 'Specials & offers',
        description: "Today's chef specials and happy hour",
        icon: Tag,
      },
      {
        id: 'review',
        title: 'Leave a review',
        description: 'Smart routing to Google with star gating',
        icon: Star,
      },
    ],
  },
  {
    section: 'FUN WHILE YOU WAIT',
    items: [
      {
        id: 'play',
        title: 'Plate Stack game',
        description: 'Gamified loyalty: diners earn a stamp when beating target score',
        icon: Gamepad2,
      },
    ],
  },
];

const DEFAULT_CALL_REASONS = [
  'Bring the bill & payment',
  'Order more drinks',
  'Need extra napkins or cutlery',
  'Table cleanup needed',
  'Speak with manager',
];

export function ServicesDeskScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();

  const services = useQuery({
    queryKey: ['services', venueId],
    queryFn: () => api.ownerGetServices(venueId),
    enabled: Boolean(venueId),
  });

  const venue = useQuery({
    queryKey: ['owner-venue', venueId],
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });

  const [ssid, setSsid] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [security, setSecurity] = useState<WifiSecurity | null>(null);
  const [hidden, setHidden] = useState<boolean | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Waiter call reasons states
  const [callReasons, setCallReasons] = useState<string[]>(DEFAULT_CALL_REASONS);
  const [newReason, setNewReason] = useState('');

  const activeSsid = ssid ?? venue.data?.wifi?.ssid ?? '';
  const activePassword = password ?? venue.data?.wifi?.password ?? '';
  const activeSecurity = security ?? ((venue.data?.wifi?.security as WifiSecurity) ?? 'WPA2');
  const activeHidden = hidden ?? venue.data?.wifi?.hidden ?? false;

  const wifiQrString = formatWifiQrString({
    ssid: activeSsid,
    password: activePassword,
    security: activeSecurity,
    hidden: activeHidden,
  });

  const saveServices = useMutation({
    mutationFn: (body: ServiceSettings) => api.ownerSetServices(venueId, body),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['services', venueId] }),
  });

  const saveWifi = useMutation({
    mutationFn: () =>
      api.ownerUpdateVenue(venueId, {
        wifi: {
          ssid: activeSsid,
          password: activePassword,
          security: activeSecurity as any,
          hidden: activeHidden,
        },
      }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['owner-venue', venueId] }),
  });

  const current = services.data;

  const isEnabled = (id: ServiceId): boolean => {
    if (!current) return true;
    if (id === 'play') return current.game.enabled;
    const item = current.services.find((s) => s.id === id);
    return item ? item.enabled : true;
  };

  const handleToggle = (id: ServiceId, next: boolean) => {
    if (!current) return;
    if (id === 'play') {
      saveServices.mutate({
        ...current,
        game: { ...current.game, enabled: next },
      });
      return;
    }
    const updated = current.services.map((item) =>
      item.id === id ? { ...item, enabled: next } : item
    );
    saveServices.mutate({
      ...current,
      services: updated,
    });
  };

  const copyPasswordToClipboard = () => {
    if (!activePassword) return;
    Clipboard.setString(activePassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addCustomReason = () => {
    if (!newReason.trim()) return;
    setCallReasons((curr) => [...curr, newReason.trim()]);
    setNewReason('');
  };

  const removeCustomReason = (index: number) => {
    setCallReasons((curr) => curr.filter((_, i) => i !== index));
  };

  return (
    <OwnerPage
      title={t('owner.services')}
      subtitle="Switch guest table services on or off, configure guest Wi-Fi and waiter call reasons."
    >
      <DeskWait loading={services.isLoading} error={services.isError} onRetry={() => void services.refetch()}>
        <View style={styles.stack}>
          {/* Service Groups */}
          {SERVICE_GROUPS.map((group) => (
            <View key={group.section} style={styles.group}>
              <SectionLabel title={group.section} caps={true} />
              <DeskCard style={styles.groupCard}>
                {group.items.map((item, idx) => {
                  const on = isEnabled(item.id);
                  const isLast = idx === group.items.length - 1;
                  return (
                    <ListRow
                      key={item.id}
                      title={item.title}
                      detail={item.description}
                      icon={item.icon}
                      divider={!isLast}
                      trailing={
                        <Toggle
                          value={on}
                          onChange={(next) => handleToggle(item.id, next)}
                          label={item.title}
                          disabled={saveServices.isPending}
                        />
                      }
                    />
                  );
                })}
              </DeskCard>
            </View>
          ))}

          {/* Wi-Fi Configuration Section with Live QR & Security Modes */}
          <View style={styles.group}>
            <SectionLabel title="VENUE WI-FI CONFIGURATION" caps={true} />
            <DeskCard style={styles.configCard}>
              <View style={styles.wifiHeaderRow}>
                <IconTile icon={Wifi} tone="tint" size={36} />
                <View style={{ flex: 1 }}>
                  <Text variant="title">Guest Wi-Fi Quick Connect</Text>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    Guests tap "Connect to Wi-Fi" or scan the QR code to connect instantly without typing passwords.
                  </Text>
                </View>
              </View>

              <Field
                label={t('owner.ssid')}
                value={activeSsid}
                onChangeText={setSsid}
                placeholder="e.g. MamaGuestWiFi"
              />

              <View style={styles.passwordRow}>
                <View style={{ flex: 1 }}>
                  <Field
                    label={t('owner.password')}
                    value={activePassword}
                    onChangeText={setPassword}
                    placeholder="Enter network password"
                  />
                </View>
                {activePassword ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Copy password"
                    onPress={copyPasswordToClipboard}
                    style={[styles.copyBtn, { backgroundColor: theme.wash, borderColor: theme.line }]}
                  >
                    {copied ? <Check size={16} color={theme.success} /> : <Copy size={16} color={theme.text} />}
                    <Text variant="caption" style={{ fontWeight: '600' }}>
                      {copied ? 'Copied!' : 'Copy'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Security Mode Selector */}
              <View style={styles.securitySection}>
                <Text variant="caption" style={{ color: theme.meta, fontWeight: '700' }}>
                  SECURITY PROTOCOL
                </Text>
                <View style={styles.securityChips}>
                  {(['WPA2', 'WPA3', 'WPA', 'WEP', 'nopass'] as const).map((mode) => {
                    const active = activeSecurity === mode;
                    return (
                      <Pressable
                        key={mode}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                        onPress={() => setSecurity(mode)}
                        style={[
                          styles.secChip,
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
                          {mode === 'nopass' ? 'Open (No password)' : mode}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Hidden network toggle */}
              <View style={styles.hiddenRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="body-strong">Hidden Network</Text>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    Enable if your SSID does not broadcast publicly.
                  </Text>
                </View>
                <Toggle
                  value={activeHidden}
                  onChange={(v) => setHidden(v)}
                  label="Hidden network"
                />
              </View>

              {/* Wi-Fi QR Preview */}
              {activeSsid ? (
                <View style={[styles.wifiQrPreviewBox, { backgroundColor: theme.wash, borderColor: theme.line }]}>
                  <View style={styles.qrCodeFrame}>
                    <WifiQrMark url={wifiQrString} />
                  </View>
                  <View style={styles.wifiQrInfo}>
                    <Text variant="body-strong">Test Wi-Fi Connection</Text>
                    <Text variant="caption" style={{ color: theme.meta }}>
                      Scan with your smartphone camera to verify that your SSID and password join the network immediately.
                    </Text>
                    <Text variant="caption" style={{ color: theme.fill, fontWeight: '600' }}>
                      SSID: {activeSsid} ({activeSecurity})
                    </Text>
                  </View>
                </View>
              ) : null}

              <Button
                label={saveWifi.isSuccess ? 'Wi-Fi settings saved' : t('owner.saveWifi')}
                onPress={() => saveWifi.mutate()}
                loading={saveWifi.isPending}
                disabled={!activeSsid}
              />
            </DeskCard>
          </View>

          {/* Waiter Call Reasons Customizer */}
          <View style={styles.group}>
            <SectionLabel title="WAITER CALL REASONS" caps={true} />
            <DeskCard style={styles.configCard}>
              <Text variant="caption" style={{ color: theme.meta }}>
                When diners tap "Call Waiter", they choose one of these reasons so your team arrives prepared.
              </Text>

              <View style={styles.reasonsList}>
                {callReasons.map((reason, idx) => (
                  <View key={reason} style={[styles.reasonRow, { borderColor: theme.line }]}>
                    <View style={styles.reasonTextWrap}>
                      <Bell size={14} color={theme.fill} />
                      <Text variant="body">{reason}</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${reason}`}
                      onPress={() => removeCustomReason(idx)}
                      style={styles.deleteReasonBtn}
                    >
                      <Trash2 size={16} color="#DC2626" />
                    </Pressable>
                  </View>
                ))}
              </View>

              <View style={styles.addReasonRow}>
                <TextInput
                  value={newReason}
                  onChangeText={setNewReason}
                  placeholder="e.g. Request baby high chair"
                  placeholderTextColor={theme.meta}
                  style={[styles.reasonInput, { borderColor: theme.line, color: theme.text }]}
                />
                <Button
                  label="Add reason"
                  tone="secondary"
                  onPress={addCustomReason}
                  disabled={!newReason.trim()}
                />
              </View>
            </DeskCard>
          </View>

          {/* Game Stamp Target Score Stepper */}
          <View style={styles.group}>
            <SectionLabel title="PLATE STACK GAME REWARDS" caps={true} />
            <DeskCard style={styles.configCard}>
              <View style={styles.stepperRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="body-strong">{t('owner.gameTarget')}</Text>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    Guests earn 1 loyalty stamp when they hit this score in Plate Stack.
                  </Text>
                </View>
                <View style={styles.targetBox}>
                  <Field
                    label=""
                    value={target ?? String(current?.game.minScore ?? 15)}
                    onChangeText={setTarget}
                    keyboardType="number-pad"
                    style={styles.targetInput}
                  />
                </View>
              </View>
              <Button
                label={t('owner.save')}
                tone="secondary"
                onPress={() => {
                  if (!current) return;
                  const score = Number(target ?? current.game.minScore);
                  const minScore =
                    Number.isInteger(score) && score >= 1 && score <= 200
                      ? score
                      : current.game.minScore;
                  saveServices.mutate({
                    ...current,
                    game: { ...current.game, minScore },
                  });
                }}
                loading={saveServices.isPending}
              />
            </DeskCard>
          </View>
        </View>
      </DeskWait>
    </OwnerPage>
  );
}

function WifiQrMark({ url }: { url: string }) {
  const drawn = qrModules(url, 120);
  return (
    <Svg width={120} height={120} viewBox={`0 0 ${drawn.size} ${drawn.size}`}>
      <Rect width={drawn.size} height={drawn.size} fill="#FFFFFF" />
      <Path d={drawn.path} fill="#111111" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[5] },
  group: { gap: tokens.space[2] },
  groupCard: {
    paddingVertical: tokens.space[1],
    paddingHorizontal: tokens.space[4],
  },
  configCard: {
    gap: tokens.space[3],
    padding: tokens.space[4],
  },
  wifiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: tokens.space[2],
  },
  copyBtn: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  securitySection: {
    gap: tokens.space[2],
  },
  securityChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  secChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  hiddenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  wifiQrPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[4],
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    flexWrap: 'wrap',
  },
  qrCodeFrame: {
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: tokens.radius.sm,
  },
  wifiQrInfo: {
    flex: 1,
    minWidth: 160,
    gap: 4,
  },
  reasonsList: {
    gap: tokens.space[2],
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  reasonTextWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    flex: 1,
  },
  deleteReasonBtn: {
    padding: 6,
  },
  addReasonRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  reasonInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[3],
    backgroundColor: '#FFFFFF',
    fontSize: 14,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  targetBox: {
    width: 80,
  },
  targetInput: {
    textAlign: 'center',
    fontFamily: 'Inter_600',
    fontSize: 18,
  },
});
