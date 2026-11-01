import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Check,
  ChevronRight,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Store,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import type { Location, LocationInput, LocationPatchInput } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import { DeskCard, IconTile, ModalSheet, SectionLabel, StatTile, StatusPill } from '../kit';

export function BusinessScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const client = useQueryClient();
  const activeVenueId = useOwnerSession((state) => state.venueId);
  const switchVenue = useOwnerSession((state) => state.switchVenue);

  const businessQuery = useQuery({
    queryKey: ['owner-business'],
    queryFn: () => api.ownerGetBusiness(),
  });

  const [businessName, setBusinessName] = useState<string | null>(null);
  const [isEditingBusinessName, setIsEditingBusinessName] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Add location modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addStep, setAddStep] = useState<'type' | 'details'>('type');
  const [isSeparateBusiness, setIsSeparateBusiness] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newPostcode, setNewPostcode] = useState('');
  const [newCountry, setNewCountry] = useState('Ghana');

  // Edit location modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress1, setEditAddress1] = useState('');
  const [editAddress2, setEditAddress2] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editPostcode, setEditPostcode] = useState('');
  const [editCountry, setEditCountry] = useState('');

  const currentBusinessName = businessName ?? businessQuery.data?.business?.name ?? '';

  const updateBusinessNameMutation = useMutation({
    mutationFn: (name: string) => api.ownerUpdateBusiness({ name }),
    onSuccess: (updated) => {
      setBusinessName(updated.name);
      setIsEditingBusinessName(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      void client.invalidateQueries({ queryKey: ['owner-business'] });
    },
  });

  const createLocationMutation = useMutation({
    mutationFn: (input: LocationInput) => api.ownerCreateLocation(input),
    onSuccess: () => {
      setAddModalOpen(false);
      setAddStep('type');
      setNewName('');
      setNewAddress('');
      setNewCity('');
      setNewPostcode('');
      void client.invalidateQueries({ queryKey: ['owner-business'] });
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: LocationPatchInput }) =>
      api.ownerUpdateLocation(id, input),
    onSuccess: () => {
      setEditModalOpen(false);
      setEditingLocation(null);
      void client.invalidateQueries({ queryKey: ['owner-business'] });
    },
  });

  const locations = businessQuery.data?.locations ?? [];

  const handleOpenEdit = (loc: Location) => {
    setEditingLocation(loc);
    setEditName(loc.name);
    setEditEmail(loc.email ?? '');
    setEditPhone(loc.phone ?? '');
    setEditAddress1(loc.address1 ?? '');
    setEditAddress2(loc.address2 ?? '');
    setEditCity(loc.city ?? '');
    setEditPostcode(loc.postcode ?? '');
    setEditCountry(loc.country ?? 'Ghana');
    setEditModalOpen(true);
  };

  return (
    <OwnerPage
      title={t('owner.business')}
      subtitle="Manage corporate entity identity, multi-location branches, and store details."
    >
      <DeskWait
        loading={businessQuery.isLoading}
        error={businessQuery.isError}
        onRetry={() => void businessQuery.refetch()}
      >
        {/* KPI Summary */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <StatTile
              label="Locations"
              value={String(locations.length)}
              note="Active branch venues"
            />
          </View>
          <View style={styles.statCol}>
            <StatTile
              label="Active branch"
              value={locations.find((l) => l.id === activeVenueId)?.name?.split('-')[0]?.trim() || 'Main'}
              note="Scoped in dashboard"
            />
          </View>
          <View style={styles.statCol}>
            <StatTile
              label="Country"
              value="Ghana"
              note="GHS Pesewas billing"
            />
          </View>
        </View>

        {/* Business entity name card */}
        <SectionLabel title="BUSINESS ENTITY" caps />
        <DeskCard style={styles.card}>
          <View style={styles.bizHeader}>
            <IconTile icon={Building2} tone="tint" size={36} />
            <View style={{ flex: 1 }}>
              <Text variant="title">Legal Business Name</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                Shown on customer receipts, payout records and tax summaries.
              </Text>
            </View>
          </View>

          {isEditingBusinessName ? (
            <View style={styles.editRow}>
              <TextInput
                value={currentBusinessName}
                onChangeText={setBusinessName}
                placeholder="Business entity name"
                placeholderTextColor={theme.meta}
                style={[styles.input, { borderColor: theme.line, color: theme.text }]}
              />
              <View style={styles.btnRow}>
                <Button
                  label="Cancel"
                  tone="secondary"
                  onPress={() => {
                    setBusinessName(businessQuery.data?.business?.name ?? '');
                    setIsEditingBusinessName(false);
                  }}
                />
                <Button
                  label="Save"
                  loading={updateBusinessNameMutation.isPending}
                  disabled={!currentBusinessName.trim()}
                  onPress={() => updateBusinessNameMutation.mutate(currentBusinessName.trim())}
                />
              </View>
            </View>
          ) : (
            <View style={styles.displayRow}>
              <View style={{ flex: 1 }}>
                <Text variant="title" style={{ color: theme.text }}>
                  {currentBusinessName || 'Ozaa Restaurant Group'}
                </Text>
                {saveSuccess ? (
                  <Text variant="caption" style={{ color: theme.success, marginTop: 4 }}>
                    ✓ Business name updated
                  </Text>
                ) : null}
              </View>
              <Button
                label="Edit"
                tone="secondary"
                onPress={() => setIsEditingBusinessName(true)}
              />
            </View>
          )}
        </DeskCard>

        {/* Locations list */}
        <View style={styles.locationsHeadRow}>
          <SectionLabel title={`LOCATIONS (${locations.length})`} caps />
          <Button
            label="Add location"
            tone="secondary"
            onPress={() => {
              setAddStep('type');
              setAddModalOpen(true);
            }}
          />
        </View>

        <View style={styles.locationsList}>
          {locations.map((loc) => {
            const isActive = loc.id === activeVenueId;
            return (
              <DeskCard key={loc.id} style={styles.locationCard}>
                <View style={styles.locationHeaderRow}>
                  <View style={styles.locationTitleBox}>
                    <View style={styles.locationNameRow}>
                      <Text variant="body-strong">{loc.name}</Text>
                      {isActive ? (
                        <StatusPill tone="success" label="Active branch" boxed />
                      ) : null}
                    </View>
                    <Text variant="caption" style={{ color: theme.meta }}>
                      Slug: /{loc.slug}
                    </Text>
                  </View>

                  <View style={styles.actionBtnGroup}>
                    {!isActive ? (
                      <Button
                        label="Switch to this"
                        tone="secondary"
                        onPress={() => switchVenue(loc.id)}
                      />
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Edit location"
                      onPress={() => handleOpenEdit(loc)}
                      style={[styles.editIconBtn, { borderColor: theme.line }]}
                    >
                      <Pencil size={16} color={theme.text} />
                    </Pressable>
                  </View>
                </View>

                {/* Location meta details */}
                <View style={styles.locDetails}>
                  <View style={styles.detailItem}>
                    <MapPin size={14} color={theme.meta} />
                    <Text variant="caption" style={{ color: theme.text }}>
                      {[loc.address1, loc.city, loc.postcode, loc.country].filter(Boolean).join(', ') || 'No address set'}
                    </Text>
                  </View>
                  {loc.phone ? (
                    <View style={styles.detailItem}>
                      <Phone size={14} color={theme.meta} />
                      <Text variant="caption" style={{ color: theme.text }}>
                        {loc.phone}
                      </Text>
                    </View>
                  ) : null}
                  {loc.email ? (
                    <View style={styles.detailItem}>
                      <Mail size={14} color={theme.meta} />
                      <Text variant="caption" style={{ color: theme.text }}>
                        {loc.email}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </DeskCard>
            );
          })}
        </View>

        {/* Add Location Modal */}
        <ModalSheet
          visible={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          title="Add New Location"
        >
          {addStep === 'type' ? (
            <View style={styles.modalContent}>
              <Text variant="body" style={{ color: theme.meta }}>
                Are you adding a new branch under this business, or establishing a separate company?
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setIsSeparateBusiness(false);
                  setAddStep('details');
                }}
                style={[styles.typeOptionCard, { borderColor: theme.line }]}
              >
                <IconTile icon={Store} tone="tint" size={32} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="body-strong">Another branch / location</Text>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    Shares branding, consolidated loyalty reports and parent settlement account.
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.meta} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setIsSeparateBusiness(true);
                  setAddStep('details');
                }}
                style={[styles.typeOptionCard, { borderColor: theme.line }]}
              >
                <IconTile icon={Building2} tone="tint" size={32} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="body-strong">Separate business</Text>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    Independent commercial entity with its own tax and payout configuration.
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.meta} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.modalContent}>
              <View style={styles.modalField}>
                <Text variant="caption" style={styles.fieldLabel}>
                  Location Name *
                </Text>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="e.g. Ozaa Lounge - Airport City"
                  placeholderTextColor={theme.meta}
                  style={[styles.input, { borderColor: theme.line, color: theme.text }]}
                />
              </View>

              <View style={styles.modalField}>
                <Text variant="caption" style={styles.fieldLabel}>
                  Street Address
                </Text>
                <TextInput
                  value={newAddress}
                  onChangeText={setNewAddress}
                  placeholder="e.g. 14 Liberation Road"
                  placeholderTextColor={theme.meta}
                  style={[styles.input, { borderColor: theme.line, color: theme.text }]}
                />
              </View>

              <View style={styles.modalRow}>
                <View style={[styles.modalField, { flex: 1 }]}>
                  <Text variant="caption" style={styles.fieldLabel}>
                    City
                  </Text>
                  <TextInput
                    value={newCity}
                    onChangeText={setNewCity}
                    placeholder="Accra"
                    placeholderTextColor={theme.meta}
                    style={[styles.input, { borderColor: theme.line, color: theme.text }]}
                  />
                </View>

                <View style={[styles.modalField, { flex: 1 }]}>
                  <Text variant="caption" style={styles.fieldLabel}>
                    Postcode / GPS
                  </Text>
                  <TextInput
                    value={newPostcode}
                    onChangeText={setNewPostcode}
                    placeholder="GA-014-2345"
                    placeholderTextColor={theme.meta}
                    style={[styles.input, { borderColor: theme.line, color: theme.text }]}
                  />
                </View>
              </View>

              <View style={styles.modalField}>
                <Text variant="caption" style={styles.fieldLabel}>
                  Country
                </Text>
                <TextInput
                  value={newCountry}
                  onChangeText={setNewCountry}
                  placeholder="Ghana"
                  placeholderTextColor={theme.meta}
                  style={[styles.input, { borderColor: theme.line, color: theme.text }]}
                />
              </View>

              <View style={styles.btnRow}>
                <Button
                  label="Back"
                  tone="secondary"
                  onPress={() => setAddStep('type')}
                />
                <Button
                  label="Create location"
                  loading={createLocationMutation.isPending}
                  disabled={!newName.trim()}
                  onPress={() => {
                    createLocationMutation.mutate({
                      name: newName.trim(),
                      address1: newAddress.trim() || undefined,
                      city: newCity.trim() || undefined,
                      postcode: newPostcode.trim() || undefined,
                      country: newCountry.trim() || 'Ghana',
                      isSeparateBusiness,
                    });
                  }}
                />
              </View>
            </View>
          )}
        </ModalSheet>

        {/* Edit Location Modal */}
        <ModalSheet
          visible={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`Edit ${editingLocation?.name ?? 'Location'}`}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalField}>
              <Text variant="caption" style={styles.fieldLabel}>
                Location Name *
              </Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Location Name"
                placeholderTextColor={theme.meta}
                style={[styles.input, { borderColor: theme.line, color: theme.text }]}
              />
            </View>

            <View style={styles.modalRow}>
              <View style={[styles.modalField, { flex: 1 }]}>
                <Text variant="caption" style={styles.fieldLabel}>
                  Contact Email
                </Text>
                <TextInput
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="contact@venue.com"
                  placeholderTextColor={theme.meta}
                  keyboardType="email-address"
                  style={[styles.input, { borderColor: theme.line, color: theme.text }]}
                />
              </View>
              <View style={[styles.modalField, { flex: 1 }]}>
                <Text variant="caption" style={styles.fieldLabel}>
                  Contact Phone
                </Text>
                <TextInput
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="024 123 4567"
                  placeholderTextColor={theme.meta}
                  keyboardType="phone-pad"
                  style={[styles.input, { borderColor: theme.line, color: theme.text }]}
                />
              </View>
            </View>

            <View style={styles.modalField}>
              <Text variant="caption" style={styles.fieldLabel}>
                Address Line 1
              </Text>
              <TextInput
                value={editAddress1}
                onChangeText={setEditAddress1}
                placeholder="14 Liberation Road"
                placeholderTextColor={theme.meta}
                style={[styles.input, { borderColor: theme.line, color: theme.text }]}
              />
            </View>

            <View style={styles.modalField}>
              <Text variant="caption" style={styles.fieldLabel}>
                Address Line 2 (Optional)
              </Text>
              <TextInput
                value={editAddress2}
                onChangeText={setEditAddress2}
                placeholder="Suite 402, 4th Floor"
                placeholderTextColor={theme.meta}
                style={[styles.input, { borderColor: theme.line, color: theme.text }]}
              />
            </View>

            <View style={styles.modalRow}>
              <View style={[styles.modalField, { flex: 1 }]}>
                <Text variant="caption" style={styles.fieldLabel}>
                  City
                </Text>
                <TextInput
                  value={editCity}
                  onChangeText={setEditCity}
                  placeholder="Accra"
                  placeholderTextColor={theme.meta}
                  style={[styles.input, { borderColor: theme.line, color: theme.text }]}
                />
              </View>
              <View style={[styles.modalField, { flex: 1 }]}>
                <Text variant="caption" style={styles.fieldLabel}>
                  Postcode / GPS
                </Text>
                <TextInput
                  value={editPostcode}
                  onChangeText={setEditPostcode}
                  placeholder="GA-014-2345"
                  placeholderTextColor={theme.meta}
                  style={[styles.input, { borderColor: theme.line, color: theme.text }]}
                />
              </View>
            </View>

            <View style={styles.modalField}>
              <Text variant="caption" style={styles.fieldLabel}>
                Country
              </Text>
              <TextInput
                value={editCountry}
                onChangeText={setEditCountry}
                placeholder="Ghana"
                placeholderTextColor={theme.meta}
                style={[styles.input, { borderColor: theme.line, color: theme.text }]}
              />
            </View>

            <View style={styles.btnRow}>
              <Button
                label="Cancel"
                tone="secondary"
                onPress={() => setEditModalOpen(false)}
              />
              <Button
                label="Save changes"
                loading={updateLocationMutation.isPending}
                disabled={!editName.trim()}
                onPress={() => {
                  if (!editingLocation) return;
                  updateLocationMutation.mutate({
                    id: editingLocation.id,
                    input: {
                      name: editName.trim(),
                      email: editEmail.trim() || undefined,
                      phone: editPhone.trim() || undefined,
                      address1: editAddress1.trim() || undefined,
                      address2: editAddress2.trim() || undefined,
                      city: editCity.trim() || undefined,
                      postcode: editPostcode.trim() || undefined,
                      country: editCountry.trim() || undefined,
                    },
                  });
                }}
              />
            </View>
          </View>
        </ModalSheet>
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
    flexWrap: 'wrap',
  },
  statCol: {
    flex: 1,
    minWidth: 100,
  },
  card: {
    gap: tokens.space[3],
  },
  bizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: tokens.space[1],
  },
  editRow: {
    gap: tokens.space[2],
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: tokens.space[2],
    marginTop: tokens.space[2],
  },
  locationsHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: tokens.space[3],
  },
  locationsList: {
    gap: tokens.space[2],
  },
  locationCard: {
    gap: tokens.space[2],
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationTitleBox: {
    gap: 2,
    flex: 1,
  },
  locationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  actionBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  editIconBtn: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  locDetails: {
    backgroundColor: '#F9FAFB',
    padding: tokens.space[2],
    borderRadius: tokens.radius.sm,
    gap: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalContent: {
    gap: tokens.space[3],
  },
  typeOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[3],
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    backgroundColor: '#FFFFFF',
  },
  modalField: {
    gap: 6,
  },
  fieldLabel: {
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    minHeight: 46,
    paddingHorizontal: tokens.space[3],
    backgroundColor: '#FFFFFF',
  },
  modalRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
  },
});
