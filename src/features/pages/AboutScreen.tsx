import type { ReactNode } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  type LucideIcon,
} from 'lucide-react-native';
import { mapsLink, useVenue } from '@/features/venue';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { ErrorState, LoadingState } from '@/ui/states';
import { guestFont, useTheme } from '@/ui/theme';
import { socialLinks } from './socialLinks';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

/** Hours for the week, how to get there, how to reach the venue, and where to follow it. */
export function AboutScreen({ slug }: { slug: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const venue = useVenue(slug);
  if (venue.isLoading) return <LoadingState />;
  if (!venue.data) return <ErrorState onRetry={() => void venue.refetch()} />;
  const v = venue.data;
  // Hours are stored Monday first; getDay() counts from Sunday.
  const today = (new Date().getDay() + 6) % 7;
  const links = socialLinks({ ...(v.socials ?? {}), phone: undefined });
  const digits = (n: string) => n.replace(/[^\d]/g, '');

  return (
    <SafeScreen>
      <PageHeader title={t('services.about.title')} subtitle={v.name} />
      <ScrollView contentContainerStyle={styles.body}>
        <Group title={t('about.hours')}>
          {DAYS.map((day, index) => {
            const slots = v.hours.weekly[index] ?? [];
            const on = index === today;
            return (
              <View
                key={day}
                style={[
                  styles.hourRow,
                  index > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: theme.line,
                  },
                ]}
              >
                <Text variant={on ? 'body-strong' : 'body'} style={styles.flex}>
                  {t(`about.days.${day}`)}
                  {on ? ` · ${t('about.today')}` : ''}
                </Text>
                <Text
                  variant={on ? 'body-strong' : 'body'}
                  style={{ color: slots.length ? theme.text : theme.muted }}
                >
                  {slots.length
                    ? slots.map((s) => `${s.opens}–${s.closes}`).join(', ')
                    : t('about.closed')}
                </Text>
              </View>
            );
          })}
        </Group>

        <Group title={t('about.find')}>
          <LinkLine
            icon={MapPin}
            label={v.location.label}
            hint={t('about.directions')}
            url={mapsLink(v.location)}
          />
          {v.phone ? (
            <LinkLine icon={Phone} label={t('about.call')} hint={v.phone} url={`tel:${v.phone}`} />
          ) : null}
          {v.whatsapp ? (
            <LinkLine
              icon={MessageCircle}
              label={t('about.whatsapp')}
              hint={v.whatsapp}
              url={`https://wa.me/${digits(v.whatsapp)}`}
            />
          ) : null}
        </Group>

        {links.length ? (
          <Group title={t('about.follow')}>
            {links.map((link) => (
              <LinkLine
                key={link.key}
                icon={link.key === 'email' ? Mail : Globe}
                label={t(`ownerSocials.${link.key}`)}
                hint={link.url.replace(/^(https?:\/\/|mailto:)/, '')}
                url={link.url}
              />
            ))}
          </Group>
        ) : null}
      </ScrollView>
    </SafeScreen>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.group}>
      <Text
        variant="caption"
        accessibilityRole="header"
        style={[styles.groupTitle, { color: theme.muted }]}
      >
        {title.toUpperCase()}
      </Text>
      <View style={[styles.card, { borderColor: theme.line, backgroundColor: theme.surface }]}>
        {children}
      </View>
    </View>
  );
}

function LinkLine({
  icon: Icon,
  label,
  hint,
  url,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  url: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={hint ? `${label}, ${hint}` : label}
      onPress={() => void Linking.openURL(url)}
      style={({ pressed }) => [styles.linkRow, pressed && { backgroundColor: theme.wash }]}
    >
      <Icon size={20} color={theme.ink} />
      <View style={styles.flex}>
        <Text variant="body-strong">{label}</Text>
        {hint ? (
          <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
            {hint}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={18} color={theme.meta} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 24, paddingBottom: 48 },
  group: { gap: 8 },
  groupTitle: { fontFamily: guestFont.strong, letterSpacing: 0.8 },
  card: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', paddingHorizontal: 16 },
  hourRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 12 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 8,
  },
  flex: { flex: 1 },
});
