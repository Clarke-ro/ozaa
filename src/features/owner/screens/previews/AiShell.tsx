import { makeStyles } from '@/ui/makeStyles';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bot } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ShellScreen } from '../ShellScreen';

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

const useStyles = makeStyles((theme) => ({
  protoContainer: {
    gap: tokens.space[3],
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
}));
