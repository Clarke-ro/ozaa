import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  HelpCircle,
  MessageSquare,
  Send,
  Sparkles,
  User,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskCard, IconTile } from '../kit';

const SUGGESTIONS = [
  'What do diners love most about our dishes?',
  'Which complaints happened more than once this week?',
  'How can we improve table turn time & service?',
  'Summarize feedback sentiment breakdown',
];

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  suggestions?: string[];
}

export function AskOzaaAiScreen({ venueId }: { venueId: string }) {
  const theme = useTheme();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your Ozaa Feedback Assistant. Ask me anything about your diner feedback, repeat complaints, popular dishes, or service speed.',
      suggestions: SUGGESTIONS,
    },
  ]);

  const askMutation = useMutation({
    mutationFn: (q: string) => api.ownerAskFeedbackAi(venueId, { question: q }),
    onSuccess: (data, q) => {
      setMessages((curr) => [
        ...curr,
        {
          id: 'user_' + Date.now(),
          sender: 'user',
          text: q,
        },
        {
          id: 'ai_' + Date.now(),
          sender: 'assistant',
          text: data.reply,
          suggestions: data.suggestions,
        },
      ]);
      setQuestion('');
    },
  });

  const handleSend = (qToSend?: string) => {
    const q = (qToSend ?? question).trim();
    if (!q || askMutation.isPending) return;
    askMutation.mutate(q);
  };

  return (
    <View style={styles.container}>
      <DeskCard style={styles.card}>
        <View style={styles.header}>
          <IconTile icon={Sparkles} tone="tint" size={36} />
          <View style={{ flex: 1 }}>
            <Text variant="title">Ozaa Feedback AI Assistant</Text>
            <Text variant="caption" style={{ color: theme.meta }}>
              Real-time intelligence synthesized strictly from this venue's guest notes
            </Text>
          </View>
        </View>

        {/* Chat Stream */}
        <ScrollView style={styles.chatScroll} contentContainerStyle={styles.chatContent}>
          {messages.map((msg) => {
            const isAi = msg.sender === 'assistant';
            return (
              <View
                key={msg.id}
                style={[
                  styles.msgRow,
                  isAi ? styles.msgLeft : styles.msgRight,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    isAi
                      ? [styles.bubbleAi, { backgroundColor: '#F8FAFC', borderColor: theme.line }]
                      : [styles.bubbleUser, { backgroundColor: theme.fill }],
                  ]}
                >
                  <Text
                    variant="body"
                    style={{
                      color: isAi ? theme.text : '#FFFFFF',
                      lineHeight: 22,
                    }}
                  >
                    {msg.text}
                  </Text>
                </View>

                {/* Suggested question chips */}
                {isAi && msg.suggestions && msg.suggestions.length > 0 ? (
                  <View style={styles.chipsWrap}>
                    {msg.suggestions.map((s) => (
                      <Pressable
                        key={s}
                        accessibilityRole="button"
                        accessibilityLabel={s}
                        onPress={() => handleSend(s)}
                        style={[styles.suggestChip, { borderColor: theme.line, backgroundColor: theme.white }]}
                      >
                        <Sparkles size={12} color={theme.fill} />
                        <Text variant="caption" style={{ color: theme.fill, fontWeight: '600' }}>
                          {s}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="Ask about diner feedback, food or service..."
            placeholderTextColor={theme.meta}
            onSubmitEditing={() => handleSend()}
            style={[styles.input, { borderColor: theme.line, color: theme.text }]}
          />
          <Button
            label="Ask"
            tone="primary"
            onPress={() => handleSend()}
            loading={askMutation.isPending}
            disabled={!question.trim()}
          />
        </View>
      </DeskCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.space[4],
  },
  card: {
    padding: tokens.space[4],
    gap: tokens.space[3],
    minHeight: 460,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingBottom: tokens.space[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4E4E7',
  },
  chatScroll: {
    flex: 1,
    maxHeight: 380,
  },
  chatContent: {
    gap: tokens.space[3],
    paddingVertical: tokens.space[2],
  },
  msgRow: {
    gap: tokens.space[2],
  },
  msgLeft: {
    alignItems: 'flex-start',
    maxWidth: '85%',
  },
  msgRight: {
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  bubble: {
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
  },
  bubbleAi: {
    borderWidth: 1,
  },
  bubbleUser: {
    borderBottomRightRadius: 2,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[1],
    marginTop: 4,
  },
  suggestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  inputBar: {
    flexDirection: 'row',
    gap: tokens.space[2],
    paddingTop: tokens.space[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4E4E7',
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[3],
    backgroundColor: '#FFFFFF',
    fontSize: 14,
  },
});
