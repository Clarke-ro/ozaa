import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Megaphone, PanelTop } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Field, Section, SectionBody, SwitchRow } from '../../kit';
import type { NoticeDraft } from '../../desk/noticeForm';

export type NoticeKind = 'banner' | 'popup';
type NoticeField = 'title' | 'text' | 'starts' | 'ends';

/** One notice: show or hide, the words, optional start and end times, and a small preview. */
export function NoticeCard({
  kind,
  draft,
  onDraft,
  error,
}: {
  kind: NoticeKind;
  draft: NoticeDraft;
  onDraft: (draft: NoticeDraft) => void;
  timeZone: string;
  error: (field: NoticeField) => string | undefined;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const set = (key: keyof NoticeDraft) => (value: string) => onDraft({ ...draft, [key]: value });
  const Icon = kind === 'banner' ? Megaphone : PanelTop;
  return (
    <Section title={t(`ownerNotice.${kind}.title`)}>
      <SwitchRow
        icon={Icon}
        label={t('ownerNotice.show')}
        value={draft.enabled}
        onChange={(enabled) => onDraft({ ...draft, enabled })}
      />
      <SectionBody>
        <View style={styles.stack}>
          {kind === 'popup' ? (
            <Field
              label={t('ownerNotice.heading')}
              value={draft.title}
              onChangeText={set('title')}
              placeholder={t('ownerNotice.headingHint')}
              maxLength={60}
              error={error('title')}
            />
          ) : null}
          <Field
            label={t('ownerNotice.text')}
            hint={t('ownerNotice.count', { count: draft.text.trim().length })}
            value={draft.text}
            onChangeText={set('text')}
            placeholder={t(`ownerNotice.${kind}.placeholder`)}
            multiline
            maxLength={280}
            error={error('text')}
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <Field
                label={t('ownerNotice.starts')}
                value={draft.starts}
                onChangeText={set('starts')}
                placeholder="2026-11-04 18:00"
                autoCapitalize="none"
                error={error('starts')}
              />
            </View>
            <View style={styles.flex}>
              <Field
                label={t('ownerNotice.ends')}
                value={draft.ends}
                onChangeText={set('ends')}
                placeholder="2026-11-04 23:00"
                autoCapitalize="none"
                error={error('ends')}
              />
            </View>
          </View>
          {draft.text.trim() ? (
            <View
              accessibilityLabel={t('ownerNotice.preview')}
              style={[
                kind === 'banner' ? styles.bannerPreview : styles.popupPreview,
                {
                  backgroundColor: kind === 'banner' ? theme.tint : theme.wash,
                  borderColor: theme.line,
                },
              ]}
            >
              {kind === 'popup' && draft.title.trim() ? (
                <Text variant="body-strong">{draft.title.trim()}</Text>
              ) : null}
              <Text
                variant="caption"
                numberOfLines={kind === 'banner' ? 1 : 4}
                style={{ color: theme.text }}
              >
                {draft.text.trim()}
              </Text>
            </View>
          ) : null}
        </View>
      </SectionBody>
    </Section>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[3] },
  row: { flexDirection: 'row', gap: tokens.space[3] },
  flex: { flex: 1, minWidth: 0 },
  bannerPreview: {
    paddingVertical: tokens.space[2],
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.sm,
  },
  popupPreview: {
    gap: tokens.space[1],
    padding: tokens.space[4],
    borderRadius: tokens.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
