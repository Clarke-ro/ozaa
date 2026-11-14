import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { OwnerPage } from '../../chrome/OwnerPage';
import { TitledSection } from '../../kit';
import { FaqItem } from './FaqItem';
import { HELP_GROUPS, searchHelp, type HelpTopic } from './helpTopics';
import { StillStuck } from './StillStuck';

/** Answers to common questions, grouped and searchable, then a way to reach us. */
export function HelpScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const textOf = (topic: HelpTopic) =>
    `${t(`ownerHelp.q.${topic.id}.question`)} ${t(`ownerHelp.q.${topic.id}.answer`)}`;
  const groups = searchHelp(HELP_GROUPS, query, textOf);

  return (
    <OwnerPage title={t('ownerChrome.help')} subtitle={t('ownerHelp.lead')}>
      <View style={styles.stack}>
        <View style={[styles.search, { borderColor: theme.line, backgroundColor: theme.surface }]}>
          <Search size={16} color={theme.meta} />
          <TextInput
            accessibilityLabel={t('ownerHelp.search')}
            placeholder={t('ownerHelp.search')}
            placeholderTextColor={theme.meta}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            style={[styles.input, { color: theme.text }]}
          />
        </View>
        {groups.length === 0 ? (
          <Text variant="body" style={{ color: theme.muted }}>
            {t('ownerHelp.noMatch')}
          </Text>
        ) : null}
        {groups.map((group) => (
          <TitledSection
            key={group.id}
            title={t(`ownerHelp.groups.${group.id}`)}
            cardStyle={styles.list}
          >
            {group.topics.map((topic, index) => (
              <FaqItem
                key={topic.id}
                first={index === 0}
                question={t(`ownerHelp.q.${topic.id}.question`)}
                answer={t(`ownerHelp.q.${topic.id}.answer`)}
                linkLabel={t(`ownerHelp.q.${topic.id}.link`)}
                to={topic.to}
                open={open === topic.id}
                onToggle={() => setOpen((now) => (now === topic.id ? null : topic.id))}
              />
            ))}
          </TitledSection>
        ))}
        <TitledSection title={t('ownerHelp.stuck')} cardStyle={styles.bare}>
          <StillStuck />
        </TitledSection>
      </View>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.owner.controls.sectionGap },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: tokens.owner.controls.height,
    paddingHorizontal: tokens.space[4],
    borderWidth: 1,
    borderRadius: tokens.radius.full,
  },
  input: { flex: 1, minHeight: 40, fontFamily: fontFamily.regular, fontSize: 15, padding: 0 },
  list: { padding: 0, overflow: 'hidden' },
  bare: { padding: 0 },
});
