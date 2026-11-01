import { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  ExternalLink,
  Globe,
  HelpCircle,
  Info,
  MessageCircle,
  MessageSquare,
  ShieldCheck,
  Star,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import { DeskCard, Field, IconTile, ModalSheet, SectionLabel, Toggle } from '../kit';

export function SocialsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();

  const venue = useQuery({
    queryKey: ['owner-venue', venueId],
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });

  const socials = venue.data?.socials ?? {};

  // Form states
  const [googleUrl, setGoogleUrl] = useState<string | null>(null);
  const [tripadvisor, setTripadvisor] = useState<string | null>(null);
  const [minStarGating, setMinStarGating] = useState<boolean | null>(null);
  const [googleReviewMinStars, setGoogleReviewMinStars] = useState<number | null>(null);
  const [instagram, setInstagram] = useState<string | null>(null);
  const [facebook, setFacebook] = useState<string | null>(null);
  const [xSocial, setXSocial] = useState<string | null>(null);
  const [tiktok, setTiktok] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);

  // Helper guide modal
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  const activeGoogleUrl = googleUrl ?? socials.googleReviewUrl ?? '';
  const activeTripadvisor = tripadvisor ?? socials.tripadvisor ?? '';
  const activeGating = minStarGating ?? Boolean(socials.googleReviewMinStars && socials.googleReviewMinStars > 0);
  const activeMinStars = googleReviewMinStars ?? socials.googleReviewMinStars ?? 4;
  const activeInstagram = instagram ?? socials.instagram ?? '';
  const activeFacebook = facebook ?? socials.facebook ?? '';
  const activeX = xSocial ?? socials.x ?? '';
  const activeTiktok = tiktok ?? socials.tiktok ?? '';
  const activeWhatsapp = whatsapp ?? socials.whatsapp ?? '';

  const isValidGoogleUrl =
    !activeGoogleUrl.trim() ||
    activeGoogleUrl.includes('google.com') ||
    activeGoogleUrl.includes('g.page') ||
    activeGoogleUrl.includes('maps.app.goo.gl');

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.ownerUpdateVenue(venueId, {
        socials: {
          googleReviewUrl: activeGoogleUrl.trim() || undefined,
          googleReviewMinStars: activeGating ? activeMinStars : undefined,
          tripadvisor: activeTripadvisor.trim() || undefined,
          instagram: activeInstagram.trim() || undefined,
          facebook: activeFacebook.trim() || undefined,
          x: activeX.trim() || undefined,
          tiktok: activeTiktok.trim() || undefined,
          whatsapp: activeWhatsapp.trim() || undefined,
        },
      });
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['owner-venue', venueId] });
    },
  });

  return (
    <OwnerPage
      title="Reviews & Social Links"
      subtitle="Connect your Google profile, protect your reputation with star gating, and link social channels."
    >
      <DeskWait loading={venue.isLoading} error={venue.isError} onRetry={() => void venue.refetch()}>
        <View style={styles.stack}>
          {/* Smart Review Routing & Star Gating */}
          <DeskCard style={styles.card}>
            <View style={styles.cardHeader}>
              <IconTile icon={Star} tone="tint" size={36} />
              <View style={styles.headerText}>
                <Text variant="title">Smart Google Review Routing</Text>
                <Text variant="caption" style={{ color: theme.meta }}>
                  Route happy guests to your public Google Business page; route unhappy feedback to your private inbox.
                </Text>
              </View>
            </View>

            <View style={styles.inputWithHelp}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Google Review Link (Short URL)"
                  value={activeGoogleUrl}
                  onChangeText={setGoogleUrl}
                  placeholder="https://g.page/r/your-restaurant/review"
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="How to find Google link"
                onPress={() => setGuideModalOpen(true)}
                style={styles.helpLink}
              >
                <HelpCircle size={16} color={theme.fill} />
                <Text variant="caption" style={{ color: theme.fill, fontWeight: '700' }}>
                  How to find link
                </Text>
              </Pressable>
            </View>

            {!isValidGoogleUrl ? (
              <View style={[styles.warningBox, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                <Text variant="caption" style={{ color: '#92400E' }}>
                  Please ensure your link is a valid Google URL (e.g. g.page/r/... or maps.app.goo.gl/...).
                </Text>
              </View>
            ) : null}

            {/* Min Star Gating Toggle */}
            <View style={[styles.gatingBox, { backgroundColor: theme.wash, borderColor: theme.line }]}>
              <View style={styles.gatingHeaderRow}>
                <View style={styles.gatingTextCol}>
                  <View style={styles.badgeRow}>
                    <ShieldCheck size={16} color={theme.success} />
                    <Text variant="body-strong">Reputation Protection Gating</Text>
                  </View>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    Only diners leaving {activeMinStars}★ or 5★ are invited to leave a public Google review.
                    1★ to 3★ ratings are sent directly to your private Feedback inbox so you can resolve them.
                  </Text>
                </View>
                <Toggle
                  value={activeGating}
                  onChange={(val) => setMinStarGating(val)}
                  label="Enable star gating"
                />
              </View>

              {activeGating ? (
                <View style={styles.thresholdRow}>
                  <Text variant="caption" style={{ color: theme.text, fontWeight: '600' }}>
                    Minimum rating to prompt public review:
                  </Text>
                  <View style={styles.starsSelector}>
                    {[4, 5].map((stars) => {
                      const selected = activeMinStars === stars;
                      return (
                        <Pressable
                          key={stars}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selected }}
                          onPress={() => setGoogleReviewMinStars(stars)}
                          style={[
                            styles.starChip,
                            {
                              borderColor: selected ? theme.fill : theme.line,
                              backgroundColor: selected ? theme.fill : theme.white,
                            },
                          ]}
                        >
                          <Text
                            variant="caption"
                            style={{
                              color: selected ? theme.white : theme.text,
                              fontWeight: '700',
                            }}
                          >
                            {stars} Stars & Above
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>

            <Field
              label="Tripadvisor Review URL (Optional)"
              value={activeTripadvisor}
              onChangeText={setTripadvisor}
              placeholder="https://tripadvisor.com/Restaurant_Review-..."
            />
          </DeskCard>

          {/* Social Channels Card */}
          <DeskCard style={styles.card}>
            <View style={styles.cardHeader}>
              <IconTile icon={Globe} tone="tint" size={36} />
              <View style={styles.headerText}>
                <Text variant="title">Social Media Profiles</Text>
                <Text variant="caption" style={{ color: theme.meta }}>
                  Guests can follow your accounts and message you directly from the table menu footer.
                </Text>
              </View>
            </View>

            <Field
              label="WhatsApp Business Number"
              value={activeWhatsapp}
              onChangeText={setWhatsapp}
              placeholder="+233 24 123 4567"
              keyboardType="phone-pad"
            />

            <Field
              label="Instagram Username or URL"
              value={activeInstagram}
              onChangeText={setInstagram}
              placeholder="@mamaskitchen_accra"
            />

            <Field
              label="Facebook Page URL or Name"
              value={activeFacebook}
              onChangeText={setFacebook}
              placeholder="facebook.com/mamaskitchengh"
            />

            <View style={styles.twoColRow}>
              <Field
                label="TikTok Profile"
                value={activeTiktok}
                onChangeText={setTiktok}
                placeholder="@mamaskitchen"
                style={{ flex: 1 }}
              />
              <Field
                label="X (Twitter) Handle"
                value={activeX}
                onChangeText={setXSocial}
                placeholder="@mamaskitchen"
                style={{ flex: 1 }}
              />
            </View>
          </DeskCard>

          {/* Save Button */}
          <View style={styles.saveContainer}>
            <Button
              label={saveMutation.isSuccess ? 'Saved successfully' : 'Save reviews & socials'}
              tone="primary"
              onPress={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
            />
          </View>
        </View>

        {/* How to Find Google Review Link Guide Modal */}
        <ModalSheet
          visible={guideModalOpen}
          onClose={() => setGuideModalOpen(false)}
          title="Finding Your Google Review Link"
          subtitle="A 30-second guide to get your official short link."
        >
          <View style={styles.guideContent}>
            <View style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: theme.fill }]}>
                <Text variant="caption" style={{ color: '#FFF', fontWeight: '800' }}>
                  1
                </Text>
              </View>
              <View style={styles.stepText}>
                <Text variant="body-strong">Open Google Business Profile</Text>
                <Text variant="caption" style={{ color: theme.meta }}>
                  Search for your restaurant name on Google Search or Maps using the Google account that manages your business.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: theme.fill }]}>
                <Text variant="caption" style={{ color: '#FFF', fontWeight: '800' }}>
                  2
                </Text>
              </View>
              <View style={styles.stepText}>
                <Text variant="body-strong">Tap "Ask for reviews"</Text>
                <Text variant="caption" style={{ color: theme.meta }}>
                  Click on the "Ask for reviews" or "Get more reviews" button on your business dashboard.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: theme.fill }]}>
                <Text variant="caption" style={{ color: '#FFF', fontWeight: '800' }}>
                  3
                </Text>
              </View>
              <View style={styles.stepText}>
                <Text variant="body-strong">Copy Short URL & Paste Here</Text>
                <Text variant="caption" style={{ color: theme.meta }}>
                  Copy your unique short link (e.g. https://g.page/r/...) and paste it in the field above.
                </Text>
              </View>
            </View>

            <Button
              label="Got it"
              tone="primary"
              onPress={() => setGuideModalOpen(false)}
            />
          </View>
        </ModalSheet>
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
  card: {
    padding: tokens.space[4],
    gap: tokens.space[3],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  inputWithHelp: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: tokens.space[3],
    flexWrap: 'wrap',
  },
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 14,
  },
  warningBox: {
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  gatingBox: {
    padding: tokens.space[4],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    gap: tokens.space[3],
  },
  gatingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.space[3],
  },
  gatingTextCol: {
    flex: 1,
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.space[2],
    paddingTop: tokens.space[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  starsSelector: {
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  starChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: tokens.space[3],
    flexWrap: 'wrap',
  },
  saveContainer: {
    paddingVertical: tokens.space[2],
  },
  guideContent: {
    gap: tokens.space[4],
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space[3],
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepText: {
    flex: 1,
    gap: 2,
  },
});
