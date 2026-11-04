import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { useDraft } from '../../data/useDraft';
import { useSaveVenue } from '../../data/useSaveVenue';
import { SaveBar } from '../../kit';
import { checkNotice, draftOf, type NoticeDraft } from '../../desk/noticeForm';
import { NoticeCard, type NoticeKind } from './NoticeCard';

// Every venue has opening hours with a zone; this is only a safety net while it loads.
const FALLBACK_ZONE = 'Africa/Accra';

type Drafts = Record<NoticeKind, NoticeDraft>;

/** Store notice: a scrolling banner and a popup on the guest pages, each with times and a switch. */
export function NoticeScreen() {
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  const zone = venue.data?.hours.timezone ?? FALLBACK_ZONE;
  const saved = venue.data?.noticeSettings;
  // Untouched cards follow the server; once the owner types, their text is kept (useDraft).
  const draft = useDraft<Drafts>({
    banner: draftOf(saved?.banner, zone),
    popup: draftOf(saved?.popup, zone),
  });
  const [showErrors, setShowErrors] = useState(false);

  const save = useSaveVenue(venueId, () => {
    setShowErrors(false);
    draft.reset();
  });
  const current = draft.value;
  const checks = {
    banner: checkNotice(current.banner, zone),
    popup: checkNotice(current.popup, zone),
  };
  const errorFor = (kind: NoticeKind) => (field: 'title' | 'text' | 'starts' | 'ends') => {
    const check = checks[kind];
    return showErrors && !check.ok && check.field === field
      ? t(`ownerNotice.err.${field}`)
      : undefined;
  };

  const submit = () => {
    if (!checks.banner.ok || !checks.popup.ok) {
      setShowErrors(true);
      return;
    }
    save.mutate({ noticeSettings: { banner: checks.banner.notice, popup: checks.popup.notice } });
  };

  return (
    <OwnerPage
      title={t('owner.notice')}
      subtitle={t('ownerNotice.lead')}
      footer={
        <SaveBar
          visible={draft.dirty}
          saving={save.isPending}
          onDiscard={() => {
            draft.reset();
            setShowErrors(false);
          }}
          onSave={submit}
        />
      }
    >
      <DeskWait
        loading={venue.isLoading}
        error={venue.isError}
        onRetry={() => void venue.refetch()}
      >
        {(['banner', 'popup'] as const).map((kind) => (
          <NoticeCard
            key={kind}
            kind={kind}
            draft={current[kind]}
            onDraft={(next) => draft.set(kind, next)}
            timeZone={zone}
            error={errorFor(kind)}
          />
        ))}
      </DeskWait>
    </OwnerPage>
  );
}
