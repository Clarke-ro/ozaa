import { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronRight,
  Globe,
  HelpCircle,
  LifeBuoy,
  LogOut,
  Mail,
  MessageSquare,
  QrCode,
  ScanLine,
  Shield,
  Smartphone,
  Trash2,
  User,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import { ConfirmDialog, DeskCard, IconTile, ModalSheet, SectionLabel, StatTile, StatusPill } from '../kit';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'pt', label: 'Portuguese', native: 'Português' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'sw', label: 'Swahili', native: 'Kiswahili' },
  { code: 'ar', label: 'Arabic', native: 'العربية' },
];

export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();

  const firstName = useOwnerSession((state) => state.firstName) ?? 'Owner';
  const role = useOwnerSession((state) => state.role) ?? 'owner';
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const clearOwner = useOwnerSession((state) => state.clearOwner);

  const bizQuery = useQuery({
    queryKey: ['owner-business'],
    queryFn: () => api.ownerGetBusiness(),
  });

  const venueQuery = useQuery({
    queryKey: ['owner-venue', venueId],
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });

  // Modal states
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [bugModalOpen, setBugModalOpen] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [bugSubmitted, setBugSubmitted] = useState(false);

  // Sign out confirm
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);

  // Delete account flow
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const locations = bizQuery.data?.locations ?? [];
  const activeLocation = locations.find((l) => l.id === venueId);
  const venueSlug = venueQuery.data?.slug ?? 'mamas-kitchen';

  const deleteAccountMutation = useMutation({
    mutationFn: () => api.deleteAccount({ confirmText: 'DELETE MY ACCOUNT' }),
    onSuccess: () => {
      clearOwner();
      setDeleteModalOpen(false);
      router.replace('/owner/login' as '/owner');
    },
  });

  const handleSignOut = () => {
    clearOwner();
    setSignOutConfirmOpen(false);
    router.replace('/owner/login' as '/owner');
  };

  const handleSendBugReport = () => {
    if (!bugDescription.trim()) return;
    setBugSubmitted(true);
    setTimeout(() => {
      setBugSubmitted(false);
      setBugDescription('');
      setBugModalOpen(false);
    }, 1500);
  };

  return (
    <OwnerPage
      title={t('owner.settings')}
      subtitle="Profile credentials, language preferences, devices and security."
    >
      <DeskWait
        loading={bizQuery.isLoading && venueQuery.isLoading}
        error={bizQuery.isError && venueQuery.isError}
        onRetry={() => {
          void bizQuery.refetch();
          void venueQuery.refetch();
        }}
      >
        {/* Profile overview card */}
        <SectionLabel title="ACCOUNT & PROFILE" caps />
        <DeskCard style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatarCircle}>
              <Text variant="title" style={styles.avatarText}>
                {firstName.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.profileNameRow}>
                <Text variant="title">{firstName}</Text>
                <StatusPill tone="accent" label={t(`owner.roles.${role}`)} boxed />
              </View>
              <Text variant="caption" style={{ color: theme.meta }}>
                Ghana Mobile Login · {locations.length} branch location{locations.length === 1 ? '' : 's'}
              </Text>
              <Text variant="caption" style={{ color: '#4B5563', fontWeight: '500' }}>
                Active: {activeLocation?.name ?? 'Mama’s Kitchen'}
              </Text>
            </View>
          </View>
        </DeskCard>

        {/* Shortcuts & Operations */}
        <SectionLabel title="SHORTCUTS & TOOLS" caps />
        <View style={styles.menuGroup}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/owner/tables' as '/owner')}
            style={[styles.menuRow, { borderColor: theme.line, backgroundColor: theme.white }]}
          >
            <IconTile icon={QrCode} tone="tint" size={32} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="body-strong">Table QR Codes & Card Print</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                Generate table codes, print acrylic stands & tent cards
              </Text>
            </View>
            <ChevronRight size={18} color={theme.meta} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/owner/devices' as '/owner')}
            style={[styles.menuRow, { borderColor: theme.line, backgroundColor: theme.white }]}
          >
            <IconTile icon={Smartphone} tone="tint" size={32} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="body-strong">Scanner Devices & Staff Handhelds</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                Pair Android & iOS camera scanner devices with a 6-digit PIN
              </Text>
            </View>
            <ChevronRight size={18} color={theme.meta} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/owner/scan' as '/owner')}
            style={[styles.menuRow, { borderColor: theme.line, backgroundColor: theme.white }]}
          >
            <IconTile icon={ScanLine} tone="tint" size={32} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="body-strong">Staff Scanner Mode</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                Open full-screen camera to stamp cards and redeem guest rewards
              </Text>
            </View>
            <ChevronRight size={18} color={theme.meta} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/owner/business' as '/owner')}
            style={[styles.menuRow, { borderColor: theme.line, backgroundColor: theme.white }]}
          >
            <IconTile icon={Building2} tone="tint" size={32} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="body-strong">Business & Multi-Location</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                Switch locations, add new branches and configure entity profile
              </Text>
            </View>
            <ChevronRight size={18} color={theme.meta} />
          </Pressable>
        </View>

        {/* Preferences */}
        <SectionLabel title="PREFERENCES" caps />
        <View style={styles.menuGroup}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setLangModalOpen(true)}
            style={[styles.menuRow, { borderColor: theme.line, backgroundColor: theme.white }]}
          >
            <IconTile icon={Globe} tone="tint" size={32} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="body-strong">Language</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                Current: {LANGUAGES.find((l) => l.code === i18n.language)?.label ?? 'English'}
              </Text>
            </View>
            <ChevronRight size={18} color={theme.meta} />
          </Pressable>
        </View>

        {/* Support & Legal */}
        <SectionLabel title="HELP & SUPPORT" caps />
        <View style={styles.menuGroup}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setHelpModalOpen(true)}
            style={[styles.menuRow, { borderColor: theme.line, backgroundColor: theme.white }]}
          >
            <IconTile icon={HelpCircle} tone="tint" size={32} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="body-strong">How Ozaa Works</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                Guides for table ordering, MoMo split payouts, and loyalty
              </Text>
            </View>
            <ChevronRight size={18} color={theme.meta} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => setBugModalOpen(true)}
            style={[styles.menuRow, { borderColor: theme.line, backgroundColor: theme.white }]}
          >
            <IconTile icon={LifeBuoy} tone="tint" size={32} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="body-strong">Report a Bug / Request Feature</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                Share feedback or issue logs directly with the Ozaa team
              </Text>
            </View>
            <ChevronRight size={18} color={theme.meta} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => void Linking.openURL('https://wa.me/233240000000?text=Hello%20Ozaa%20Support')}
            style={[styles.menuRow, { borderColor: theme.line, backgroundColor: theme.white }]}
          >
            <IconTile icon={MessageSquare} tone="tint" size={32} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="body-strong">WhatsApp Support Hotline</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                Direct Ghanaian hospitality support (+233 24 000 0000)
              </Text>
            </View>
            <ChevronRight size={18} color={theme.meta} />
          </Pressable>
        </View>

        {/* Session & Danger Zone */}
        <SectionLabel title="ACCOUNT MANAGEMENT" caps />
        <DeskCard style={styles.card}>
          <View style={styles.dangerActions}>
            <Button
              label="Sign out"
              tone="secondary"
              onPress={() => setSignOutConfirmOpen(true)}
            />

            <View style={[styles.deleteSection, { borderColor: theme.line }]}>
              <View style={{ gap: 2 }}>
                <Text variant="body-strong" style={{ color: '#DC2626' }}>
                  Delete Account & Data
                </Text>
                <Text variant="caption" style={{ color: theme.meta }}>
                  Permanently purge personal profile, team permissions and session tokens under Ghana Data Protection Act 843.
                </Text>
              </View>

              <Button
                label="Delete account"
                style={{ backgroundColor: '#DC2626' }}
                onPress={() => {
                  setDeleteConfirmText('');
                  setDeleteModalOpen(true);
                }}
              />
            </View>
          </View>
        </DeskCard>

        {/* Language Modal */}
        <ModalSheet
          visible={langModalOpen}
          onClose={() => setLangModalOpen(false)}
          title="Select Language"
        >
          <View style={{ gap: tokens.space[2] }}>
            {LANGUAGES.map((lang) => {
              const isSelected = i18n.language === lang.code;
              return (
                <Pressable
                  key={lang.code}
                  accessibilityRole="button"
                  onPress={() => {
                    void i18n.changeLanguage(lang.code);
                    setLangModalOpen(false);
                  }}
                  style={[
                    styles.langOption,
                    {
                      borderColor: isSelected ? theme.ink : theme.line,
                      backgroundColor: isSelected ? theme.wash : theme.white,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="body-strong">{lang.label}</Text>
                    <Text variant="caption" style={{ color: theme.meta }}>
                      {lang.native}
                    </Text>
                  </View>
                  {isSelected ? <Check size={18} color={theme.ink} strokeWidth={2.5} /> : null}
                </Pressable>
              );
            })}
          </View>
        </ModalSheet>

        {/* How It Works Modal */}
        <ModalSheet
          visible={helpModalOpen}
          onClose={() => setHelpModalOpen(false)}
          title="How Ozaa Works"
        >
          <ScrollView style={{ maxHeight: 460 }}>
            <View style={styles.helpDoc}>
              <View style={styles.helpStep}>
                <View style={styles.stepNumCircle}>
                  <Text variant="body-strong" style={{ color: '#FFFFFF' }}>1</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="body-strong">Diners Scan & Order</Text>
                  <Text variant="caption" style={{ color: '#4B5563' }}>
                    Guests point their smartphone camera at the table QR stand. Ozaa instantly opens your browser menu without app downloads or guest accounts.
                  </Text>
                </View>
              </View>

              <View style={styles.helpStep}>
                <View style={styles.stepNumCircle}>
                  <Text variant="body-strong" style={{ color: '#FFFFFF' }}>2</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="body-strong">Direct Settlement via MoMo & Card</Text>
                  <Text variant="caption" style={{ color: '#4B5563' }}>
                    Payments settle directly into your venue’s bank or MTN/Telecel/AT mobile money account via Paystack split-payment. Ozaa never holds customer funds.
                  </Text>
                </View>
              </View>

              <View style={styles.helpStep}>
                <View style={styles.stepNumCircle}>
                  <Text variant="body-strong" style={{ color: '#FFFFFF' }}>3</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="body-strong">Digital Stamp Card & Passes</Text>
                  <Text variant="caption" style={{ color: '#4B5563' }}>
                    Guests add their Ozaa pass to Apple Wallet or Google Wallet. Staff verify visits using the built-in scanner to stamp cards and celebrate unlocks.
                  </Text>
                </View>
              </View>

              <View style={styles.helpStep}>
                <View style={styles.stepNumCircle}>
                  <Text variant="body-strong" style={{ color: '#FFFFFF' }}>4</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="body-strong">Private Feedback & Reviews</Text>
                  <Text variant="caption" style={{ color: '#4B5563' }}>
                    Unhappy guests leave private feedback sent directly to you with an anonymity delay, while 5-star diners are routed to your Google Review page.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </ModalSheet>

        {/* Bug / Feedback Modal */}
        <ModalSheet
          visible={bugModalOpen}
          onClose={() => setBugModalOpen(false)}
          title="Report Bug / Send Feedback"
        >
          <View style={{ gap: tokens.space[3] }}>
            <Text variant="caption" style={{ color: theme.meta }}>
              Encountered a problem or want a feature? Let Clarke and the engineering team know:
            </Text>
            <TextInput
              value={bugDescription}
              onChangeText={setBugDescription}
              placeholder="Describe what happened, table number or device details..."
              placeholderTextColor={theme.meta}
              multiline
              numberOfLines={4}
              style={[styles.textArea, { borderColor: theme.line, color: theme.text }]}
            />
            {bugSubmitted ? (
              <Text variant="caption" style={{ color: theme.success, fontWeight: '700' }}>
                ✓ Thank you! Bug report dispatched to engineering.
              </Text>
            ) : null}
            <View style={styles.modalBtnRow}>
              <Button
                label="Cancel"
                tone="secondary"
                onPress={() => setBugModalOpen(false)}
              />
              <Button
                label="Submit report"
                disabled={!bugDescription.trim()}
                onPress={handleSendBugReport}
              />
            </View>
          </View>
        </ModalSheet>

        {/* Sign Out Confirmation */}
        <ConfirmDialog
          visible={signOutConfirmOpen}
          title="Sign Out of Ozaa?"
          message="You will need to verify your phone number OTP again to sign back in."
          confirmLabel="Sign out"
          cancelLabel="Stay signed in"
          onConfirm={handleSignOut}
          onCancel={() => setSignOutConfirmOpen(false)}
        />

        {/* Delete Account Modal with Typed Confirmation */}
        <ModalSheet
          visible={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Account & Personal Data"
        >
          <View style={{ gap: tokens.space[3] }}>
            <View style={styles.deleteWarningBox}>
              <AlertTriangle size={20} color="#DC2626" />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="body-strong" style={{ color: '#DC2626' }}>
                  Irreversible Action (Act 843)
                </Text>
                <Text variant="caption" style={{ color: '#991B1B' }}>
                  Under the Ghana Data Protection Act 2012 (Act 843), all personal data, staff records and authentication keys associated with this account will be erased.
                </Text>
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text variant="caption" style={{ color: '#374151', fontWeight: '600' }}>
                Type <Text variant="body-strong" style={{ color: '#DC2626' }}>DELETE MY ACCOUNT</Text> to confirm:
              </Text>
              <TextInput
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="DELETE MY ACCOUNT"
                placeholderTextColor={theme.meta}
                autoCapitalize="characters"
                style={[styles.deleteInput, { borderColor: deleteConfirmText === 'DELETE MY ACCOUNT' ? '#DC2626' : theme.line }]}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <Button
                label="Cancel"
                tone="secondary"
                onPress={() => setDeleteModalOpen(false)}
              />
              <Button
                label="Permanently delete"
                style={{ backgroundColor: '#DC2626' }}
                loading={deleteAccountMutation.isPending}
                disabled={deleteConfirmText !== 'DELETE MY ACCOUNT'}
                onPress={() => deleteAccountMutation.mutate()}
              />
            </View>
          </View>
        </ModalSheet>
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: tokens.space[3],
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  menuGroup: {
    gap: tokens.space[2],
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[3],
    borderWidth: 1,
    borderRadius: tokens.radius.md,
  },
  dangerActions: {
    gap: tokens.space[4],
  },
  deleteSection: {
    borderTopWidth: 1,
    paddingTop: tokens.space[4],
    gap: tokens.space[3],
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  helpDoc: {
    gap: tokens.space[4],
    paddingVertical: tokens.space[2],
  },
  helpStep: {
    flexDirection: 'row',
    gap: tokens.space[3],
  },
  stepNumCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space[3],
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#FFFFFF',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: tokens.space[2],
    marginTop: tokens.space[2],
  },
  deleteWarningBox: {
    flexDirection: 'row',
    gap: tokens.space[2],
    padding: tokens.space[3],
    backgroundColor: '#FEF2F2',
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  deleteInput: {
    borderWidth: 1.5,
    borderRadius: tokens.radius.md,
    minHeight: 46,
    paddingHorizontal: tokens.space[3],
    backgroundColor: '#FFFFFF',
    fontWeight: '700',
    color: '#111111',
  },
});
