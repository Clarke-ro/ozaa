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
import { pesewas } from '@/lib/brand';
import { DEFAULT_CURRENCY, formatMoney, sumPesewas } from '@/lib/money';
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
    { id: 'jollof', name: t('ownerShell.pos.jollof'), price: pesewas(6500) },
    { id: 'banku', name: t('ownerShell.pos.banku'), price: pesewas(7500) },
    { id: 'sobolo', name: t('ownerShell.pos.sobolo'), price: pesewas(1500) },
    { id: 'kelewele', name: t('ownerShell.pos.kelewele'), price: pesewas(2000) },
  ];

  const total = sumPesewas(
    selectedItems.flatMap((id) => menu.find((m) => m.id === id)?.price ?? []),
  );

  const toggleItem = (id: string) => {
    setPaid(false);
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const preview = (
    <View style={styles.protoContainer}>
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
                {formatMoney(dish.price, DEFAULT_CURRENCY)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.ticketSummaryBox}>
        <View style={styles.ticketRow}>
          <Text variant="body-strong">{t('ownerShell.pos.billTotal')}</Text>
          <Text variant="display-m" style={styles.ticketTotalText}>
            {formatMoney(total, DEFAULT_CURRENCY)}
          </Text>
        </View>

        {paid ? (
          <View style={styles.paidBadge}>
            <CheckCircle2 size={16} color={theme.success} />
            <Text variant="caption" style={{ color: theme.success, fontWeight: '700' }}>
              {tenderMethod === 'cash'
                ? t('ownerShell.pos.paidCash')
                : t('ownerShell.pos.paidMomo')}
            </Text>
          </View>
        ) : (
          <View style={styles.tenderActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('ownerShell.pos.takeCash')}
              onPress={() => {
                setTenderMethod('cash');
                setPaid(true);
              }}
              style={[styles.tenderBtn, { backgroundColor: theme.black }]}
            >
              <Wallet size={16} color={theme.white} />
              <Text variant="caption" style={{ color: theme.white, fontWeight: '700' }}>
                {t('ownerShell.pos.takeCash')}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('ownerShell.pos.promptMomo')}
              onPress={() => {
                setTenderMethod('momo');
                setPaid(true);
              }}
              style={[styles.tenderBtn, { backgroundColor: theme.fill }]}
            >
              <Smartphone size={16} color={theme.onFill} />
              <Text variant="caption" style={{ color: theme.onFill, fontWeight: '700' }}>
                {t('ownerShell.pos.promptMomo')}
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
      next={[t('owner.posNext1'), t('owner.posNext2'), t('owner.posNext3')]}
      icon={Receipt}
      badge={t('ownerShell.phase3')}
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
      name: t('ownerShell.stock.rice'),
      quantity: '18.5 kg',
      status: t('ownerShell.stock.inStock'),
      tone: 'success' as const,
    },
    {
      name: t('ownerShell.stock.tilapia'),
      quantity: '4 pcs',
      status: t('ownerShell.stock.lowStock'),
      tone: 'waiting' as const,
    },
    {
      name: t('ownerShell.stock.plantain'),
      quantity: '0 pcs',
      status: t('ownerShell.stock.soldOut'),
      tone: 'error' as const,
    },
    {
      name: t('ownerShell.stock.sobolo'),
      quantity: '12 L',
      status: t('ownerShell.stock.inStock'),
      tone: 'success' as const,
    },
  ];

  const preview = (
    <View style={styles.protoContainer}>
      <View style={styles.stockList}>
        {inventory.map((item) => (
          <View key={item.name} style={styles.stockItemRow}>
            <View style={styles.stockItemInfo}>
              <Text variant="body-strong">{item.name}</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                {t('ownerShell.stock.remaining', { qty: item.quantity })}
              </Text>
            </View>
            <StatusPill tone={item.tone} label={item.status} boxed />
          </View>
        ))}
      </View>

      <View style={styles.auto86Note}>
        <AlertTriangle size={16} color={theme.warning} />
        <Text variant="caption" style={{ color: theme.warning, flex: 1 }}>
          {t('ownerShell.stock.auto86')}
        </Text>
      </View>
    </View>
  );

  return (
    <ShellScreen
      title={t('owner.stock')}
      next={[t('owner.stockNext1'), t('owner.stockNext2'), t('owner.stockNext3')]}
      icon={Store}
      badge={t('ownerShell.phase3')}
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
      query: t('ownerShell.ai.enQuery'),
      reply: t('ownerShell.ai.enReply'),
    },
    twi: {
      query: t('ownerShell.ai.twiQuery'),
      reply: t('ownerShell.ai.twiReply'),
    },
    ga: {
      query: t('ownerShell.ai.gaQuery'),
      reply: t('ownerShell.ai.gaReply'),
    },
  };

  const currentChat = dialogues[lang];

  const preview = (
    <View style={styles.protoContainer}>
      <View style={styles.langBar}>
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

      <View style={styles.chatFrame}>
        <View style={styles.chatGuestBubble}>
          <Text variant="body" style={styles.chatGuestText}>
            {currentChat.query}
          </Text>
          <Text variant="caption" style={styles.chatTimestamp}>
            {t('ownerShell.ai.tableGuest')}
          </Text>
        </View>

        <View style={styles.chatAiBubble}>
          <View style={styles.aiHeaderRow}>
            <Bot size={14} color={theme.ink} />
            <Text variant="caption" style={{ color: theme.ink, fontWeight: '700' }}>
              {t('ownerShell.ai.waiter')}
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
      next={[t('owner.aiNext1'), t('owner.aiNext2'), t('owner.aiNext3')]}
      icon={Bot}
      badge={t('ownerShell.phase3')}
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
        <Text variant="body-strong" style={{ flex: 1 }}>
          {t('ownerShell.marketing.audience')}
        </Text>
      </View>

      <View style={styles.smsCard}>
        <Text variant="body">{t('ownerShell.marketing.sampleSms')}</Text>
      </View>
    </View>
  );

  return (
    <ShellScreen
      title={t('owner.marketing')}
      next={[t('owner.marketNext1'), t('owner.marketNext2'), t('owner.marketNext3')]}
      icon={Megaphone}
      badge={t('ownerShell.phase3')}
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
    justifyContent: 'flex-end',
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
  smsCard: {
    backgroundColor: theme.wash,
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.fill,
  },
}));
