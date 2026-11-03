import { makeStyles } from '@/ui/makeStyles';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Megaphone,
  Receipt,
  Smartphone,
  Store,
  Wallet,
} from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { StatusPill } from '../kit';
import { ShellScreen } from './ShellScreen';

export function PosShell() {
  const styles = useStyles();
  const { t } = useTranslation();
  const theme = useTheme();
  const [selectedItems, setSelectedItems] = useState<string[]>(['jollof']);
  const [tenderMethod, setTenderMethod] = useState<'cash' | 'momo'>('cash');
  const [paid, setPaid] = useState(false);

  const menu = [
    { id: 'jollof', name: 'Jollof Rice & Chicken', price: 65 },
    { id: 'banku', name: 'Banku & Grilled Tilapia', price: 75 },
    { id: 'sobolo', name: 'Chilled Sobolo (500ml)', price: 15 },
    { id: 'kelewele', name: 'Spicy Kelewele', price: 20 },
  ];

  const total = selectedItems.reduce((acc, id) => {
    const item = menu.find((m) => m.id === id);
    return acc + (item?.price ?? 0);
  }, 0);

  const toggleItem = (id: string) => {
    setPaid(false);
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const preview = (
    <View style={styles.protoContainer}>
      <Text variant="caption" style={{ color: theme.meta, marginBottom: 4 }}>
        TAP DISHES TO ADD TO COUNTER TICKET:
      </Text>
      <View style={styles.dishGrid}>
        {menu.map((dish) => {
          const isSelected = selectedItems.includes(dish.id);
          return (
            <Pressable
              key={dish.id}
              accessibilityRole="button"
              accessibilityLabel={dish.name}
              onPress={() => toggleItem(dish.id)}
              style={[
                styles.dishTile,
                {
                  borderColor: isSelected ? theme.fill : theme.line,
                  backgroundColor: isSelected ? theme.tint : theme.surface,
                },
              ]}
            >
              <Text variant="body-strong">{dish.name}</Text>
              <Text
                variant="caption"
                style={{ color: isSelected ? theme.ink : theme.meta, fontWeight: '700' }}
              >
                GH₵{dish.price}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Ticket summary bar */}
      <View style={styles.ticketSummaryBox}>
        <View style={styles.ticketRow}>
          <Text variant="body-strong">Counter Bill Total:</Text>
          <Text variant="display-m" style={styles.ticketTotalText}>
            GH₵{total}
          </Text>
        </View>

        {paid ? (
          <View style={styles.paidBadge}>
            <CheckCircle2 size={16} color={theme.success} />
            <Text variant="caption" style={{ color: theme.success, fontWeight: '700' }}>
              Order marked paid in {tenderMethod === 'cash' ? 'Cash' : 'MoMo'}. Sent to kitchen
              tickets.
            </Text>
          </View>
        ) : (
          <View style={styles.tenderActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mark Cash"
              onPress={() => {
                setTenderMethod('cash');
                setPaid(true);
              }}
              style={[styles.tenderBtn, { backgroundColor: theme.black }]}
            >
              <Wallet size={16} color={theme.white} />
              <Text variant="caption" style={{ color: theme.white, fontWeight: '700' }}>
                Take Cash
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="MoMo QR"
              onPress={() => {
                setTenderMethod('momo');
                setPaid(true);
              }}
              style={[styles.tenderBtn, { backgroundColor: theme.fill }]}
            >
              <Smartphone size={16} color={theme.onFill} />
              <Text variant="caption" style={{ color: theme.onFill, fontWeight: '700' }}>
                Prompt MoMo
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <ShellScreen
      title={t('owner.pos')}
      body={t('owner.shellPos')}
      next={[t('owner.posNext1'), t('owner.posNext2'), t('owner.posNext3')]}
      icon={Receipt}
      badge="COMING IN PHASE 3"
      preview={preview}
    />
  );
}

export function StockShell() {
  const styles = useStyles();
  const { t } = useTranslation();
  const theme = useTheme();

  const inventory = [
    {
      name: 'Perfumed Rice (50kg bag)',
      quantity: '18.5 kg',
      status: 'In Stock',
      tone: 'success' as const,
    },
    {
      name: 'Fresh Lake Tilapia',
      quantity: '4 pcs',
      status: 'Low Stock',
      tone: 'waiting' as const,
    },
    { name: 'Ripe Plantain', quantity: '0 pcs', status: 'Sold Out (86)', tone: 'error' as const },
    {
      name: 'Ginger & Hibiscus (Sobolo)',
      quantity: '12 litres',
      status: 'In Stock',
      tone: 'success' as const,
    },
  ];

  const preview = (
    <View style={styles.protoContainer}>
      <Text variant="caption" style={{ color: theme.meta, marginBottom: 4 }}>
        REAL-TIME INGREDIENT & RECIPE WATCHER:
      </Text>
      <View style={styles.stockList}>
        {inventory.map((item) => (
          <View key={item.name} style={styles.stockItemRow}>
            <View style={styles.stockItemInfo}>
              <Text variant="body-strong">{item.name}</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                Remaining: {item.quantity}
              </Text>
            </View>
            <StatusPill tone={item.tone} label={item.status} boxed />
          </View>
        ))}
      </View>

      <View style={styles.auto86Note}>
        <AlertTriangle size={16} color={theme.warning} />
        <Text variant="caption" style={{ color: theme.warning, flex: 1 }}>
          Auto-86 Rule: When Ripe Plantain hit 0 pcs, Kelewele was instantly hidden from guest table
          menus.
        </Text>
      </View>
    </View>
  );

  return (
    <ShellScreen
      title={t('owner.stock')}
      body={t('owner.shellStock')}
      next={[t('owner.stockNext1'), t('owner.stockNext2'), t('owner.stockNext3')]}
      icon={Store}
      badge="COMING IN PHASE 3"
      preview={preview}
    />
  );
}

export function AiShell() {
  const styles = useStyles();
  const { t } = useTranslation();
  const theme = useTheme();
  const [lang, setLang] = useState<'en' | 'twi' | 'ga'>('en');

  const dialogues = {
    en: {
      query: 'What is your best spicy dish?',
      reply:
        "Mama's Special Waakye with spicy shito and grilled goat is our top seller. Would you like to add fried plantain (kelewele) for GH₵20?",
    },
    twi: {
      query: 'Aduane bɛn na ɛyɛ dɛ sen biara?',
      reply:
        'Mama Waakye a ɛwɔ shito ne aponkye nam no na nnipa ani gye ho paa. Wopɛ sɛ yɛde kelewele ka ho ma wo?',
    },
    ga: {
      query: 'Mɛni niyenii ŋɔɔ fe fɛɛ?',
      reply: 'Waakye kɛ shito kɛ to loonɛ ŋɔɔ pam! Ani obaasumɔ ni wɔfee kelewele kɛfata he?',
    },
  };

  const currentChat = dialogues[lang];

  const preview = (
    <View style={styles.protoContainer}>
      <View style={styles.langBar}>
        <Text variant="caption" style={{ color: theme.meta }}>
          SELECT PREVIEW LANGUAGE:
        </Text>
        <View style={styles.langPills}>
          {(['en', 'twi', 'ga'] as const).map((l) => (
            <Pressable
              key={l}
              accessibilityRole="button"
              accessibilityLabel={l.toUpperCase()}
              onPress={() => setLang(l)}
              style={[
                styles.langPill,
                {
                  backgroundColor: lang === l ? theme.black : theme.wash,
                },
              ]}
            >
              <Text
                variant="caption"
                style={{
                  color: lang === l ? theme.white : theme.muted,
                  fontWeight: '700',
                }}
              >
                {l.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Chat Dialogue Mockup */}
      <View style={styles.chatFrame}>
        <View style={styles.chatGuestBubble}>
          <Text variant="body" style={styles.chatGuestText}>
            {currentChat.query}
          </Text>
          <Text variant="caption" style={styles.chatTimestamp}>
            Table 4 · Guest
          </Text>
        </View>

        <View style={styles.chatAiBubble}>
          <View style={styles.aiHeaderRow}>
            <Bot size={14} color={theme.ink} />
            <Text variant="caption" style={{ color: theme.ink, fontWeight: '700' }}>
              Ozaa AI Waiter
            </Text>
          </View>
          <Text variant="body" style={styles.chatAiText}>
            {currentChat.reply}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <ShellScreen
      title={t('owner.ai')}
      body={t('owner.shellAi')}
      next={[t('owner.aiNext1'), t('owner.aiNext2'), t('owner.aiNext3')]}
      icon={Bot}
      badge="COMING IN PHASE 3"
      preview={preview}
    />
  );
}

export function MarketingShell() {
  const styles = useStyles();
  const { t } = useTranslation();
  const theme = useTheme();

  const preview = (
    <View style={styles.protoContainer}>
      <View style={styles.audienceNotice}>
        <Megaphone size={16} color={theme.ink} />
        <View style={{ flex: 1 }}>
          <Text variant="body-strong">Active Opt-In Audience: 42 Guests</Text>
          <Text variant="caption" style={{ color: theme.meta }}>
            Only guests who separately checked the Act 843 marketing consent box.
          </Text>
        </View>
      </View>

      <View style={styles.broadcastMessagePreview}>
        <Text variant="caption" style={{ color: theme.meta, marginBottom: 4 }}>
          CAMPAIGN SMS & WHATSAPP PREVIEW:
        </Text>
        <View style={styles.smsCard}>
          <Text variant="body">
            {
              "Weekend Treat at Mama's Kitchen! Show this text to your waiter at Table QR to enjoy a complimentary chilled Sobolo with any main dish. Reply STOP to opt out."
            }
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <ShellScreen
      title={t('owner.marketing')}
      body={t('owner.shellMarketing')}
      next={[t('owner.marketNext1'), t('owner.marketNext2'), t('owner.marketNext3')]}
      icon={Megaphone}
      badge="COMING IN PHASE 3"
      preview={preview}
    />
  );
}

const useStyles = makeStyles((theme) => ({
  protoContainer: {
    gap: tokens.space[3],
  },
  dishGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  dishTile: {
    flex: 1,
    minWidth: 140,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space[3],
    gap: 4,
  },
  ticketSummaryBox: {
    backgroundColor: theme.wash,
    borderRadius: tokens.radius.md,
    padding: tokens.space[3],
    gap: tokens.space[2],
    borderWidth: 1,
    borderColor: theme.line,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketTotalText: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.ink,
  },
  tenderActions: {
    flexDirection: 'row',
    gap: tokens.space[2],
    marginTop: tokens.space[1],
  },
  tenderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: tokens.radius.md,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: tokens.space[2],
    backgroundColor: theme.successTint,
    borderRadius: tokens.radius.sm,
  },
  stockList: {
    gap: tokens.space[2],
  },
  stockItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: tokens.space[1],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.wash,
  },
  stockItemInfo: {
    flex: 1,
    gap: 2,
  },
  auto86Note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: tokens.space[2],
    backgroundColor: theme.warningTint,
    borderRadius: tokens.radius.sm,
  },
  langBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  langPills: {
    flexDirection: 'row',
    gap: 6,
  },
  langPill: {
    paddingHorizontal: tokens.space[3],
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
  },
  chatFrame: {
    backgroundColor: theme.wash,
    borderRadius: tokens.radius.md,
    padding: tokens.space[3],
    gap: tokens.space[2],
    borderWidth: 1,
    borderColor: theme.line,
  },
  chatGuestBubble: {
    alignSelf: 'flex-end',
    backgroundColor: theme.black,
    borderRadius: tokens.radius.md,
    padding: tokens.space[3],
    maxWidth: '85%',
  },
  chatGuestText: {
    color: theme.white,
  },
  chatTimestamp: {
    color: theme.meta,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  chatAiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: theme.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.space[3],
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: theme.line,
    gap: 4,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chatAiText: {
    color: theme.text,
    lineHeight: 20,
  },
  audienceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    backgroundColor: theme.tint,
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: theme.tint,
  },
  broadcastMessagePreview: {
    gap: tokens.space[1],
  },
  smsCard: {
    backgroundColor: theme.wash,
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.fill,
  },
}));
