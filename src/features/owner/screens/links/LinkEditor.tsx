import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { CustomLink } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import {
  Chips,
  ConfirmDialog,
  Field,
  ModalSheet,
  Section,
  SectionBody,
  Segmented,
  SwitchRow,
  toast,
} from '../../kit';
import { checkLink } from '../../desk/linkForm';
import { LINK_ICONS } from './icons';
import { ownerKeys } from '../../data/keys';

type Placement = CustomLink['placement'];

/** Create or edit one link: words, address, icon, where it shows, and optional dates. */
export function LinkEditor({
  venueId,
  link,
  onClose,
}: {
  venueId: string;
  link: CustomLink | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [title, setTitle] = useState(link?.title ?? '');
  const [url, setUrl] = useState(link?.url ?? '');
  const [icon, setIcon] = useState(link?.icon ?? 'link');
  const [placement, setPlacement] = useState<Placement>(link?.placement ?? 'button');
  const [scheduled, setScheduled] = useState(Boolean(link?.startDate || link?.endDate));
  const [start, setStart] = useState(link?.startDate?.slice(0, 10) ?? '');
  const [end, setEnd] = useState(link?.endDate?.slice(0, 10) ?? '');
  const [showErrors, setShowErrors] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const check = checkLink({ title, url, hasSchedule: scheduled, start, end });
  const error = (field: string) =>
    showErrors && !check.ok && check.field === field ? t(`ownerLinks.err.${field}`) : undefined;
  const done = (message: string) => {
    toast.success(message);
    void client.invalidateQueries({ queryKey: ownerKeys.links(venueId) });
    onClose();
  };

  const save = useMutation({
    mutationFn: () => {
      if (!check.ok) throw new Error('invalid');
      const body = {
        title: title.trim(),
        url: check.url,
        icon,
        placement,
        startDate: check.startDate,
        endDate: check.endDate,
        ...(link ? { enabled: link.enabled } : {}),
      };
      return link
        ? api.ownerUpdateCustomLink(venueId, link.id, body)
        : api.ownerCreateCustomLink(venueId, body);
    },
    onSuccess: () => done(link ? t('ownerKit.saved') : t('ownerLinks.added')),
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });
  const remove = useMutation({
    mutationFn: () => api.ownerDeleteCustomLink(venueId, link?.id ?? ''),
    onSuccess: () => done(t('ownerLinks.deleted')),
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });

  return (
    <ModalSheet
      visible
      fullScreen
      onClose={onClose}
      title={link ? t('ownerLinks.edit') : t('ownerLinks.add')}
      footer={
        <Button
          label={t('ownerKit.save')}
          style={styles.flex}
          loading={save.isPending}
          onPress={() => (check.ok ? save.mutate() : setShowErrors(true))}
        />
      }
    >
      <Field
        label={t('ownerLinks.title')}
        value={title}
        onChangeText={setTitle}
        placeholder={t('ownerLinks.titleHint')}
        error={error('title')}
      />
      <Field
        label={t('ownerLinks.url')}
        value={url}
        onChangeText={setUrl}
        placeholder="mamas.kitchen/book"
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        error={error('url')}
      />
      <Section title={t('ownerLinks.where')}>
        <SectionBody>
          <Segmented<Placement>
            label={t('ownerLinks.where')}
            value={placement}
            onChange={setPlacement}
            options={(['button', 'banner', 'menu'] as const).map((id) => ({
              id,
              label: t(`ownerLinks.placement.${id}`),
            }))}
          />
        </SectionBody>
      </Section>
      <Section title={t('ownerLinks.icon')}>
        <SectionBody>
          <Chips
            single
            label={t('ownerLinks.icon')}
            options={Object.keys(LINK_ICONS).map((id) => ({
              id,
              label: t(`ownerLinks.icons.${id}`),
            }))}
            selected={[icon]}
            onChange={(ids) => setIcon(ids[0] ?? 'link')}
          />
        </SectionBody>
      </Section>
      <Section>
        <SwitchRow
          label={t('ownerLinks.dates')}
          hint={t('ownerLinks.datesHint')}
          value={scheduled}
          onChange={setScheduled}
        />
        {scheduled ? (
          <SectionBody>
            <View style={styles.row}>
              <Field
                label={t('ownerMenu.from')}
                hint="YYYY-MM-DD"
                value={start}
                onChangeText={setStart}
                placeholder="2026-12-01"
                keyboardType="numbers-and-punctuation"
                error={error('start')}
              />
              <Field
                label={t('ownerMenu.until')}
                hint="YYYY-MM-DD"
                value={end}
                onChangeText={setEnd}
                placeholder="2026-12-24"
                keyboardType="numbers-and-punctuation"
                error={error('end')}
              />
            </View>
          </SectionBody>
        ) : null}
      </Section>
      {link ? (
        <Button label={t('ownerLinks.delete')} tone="ghost" onPress={() => setConfirm(true)} />
      ) : null}
      <ConfirmDialog
        visible={confirm}
        destructive
        title={t('ownerLinks.deleteTitle', { title: link?.title ?? '' })}
        message={t('ownerLinks.deleteBody')}
        confirmLabel={t('ownerMenu.delete')}
        loading={remove.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() => remove.mutate()}
      />
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: tokens.space[3] },
});
