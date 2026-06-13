import React, { useCallback, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import * as contactsApi from '../../api/contactsApi';
import { getApiErrorMessage } from '../../api/client';
import { EmptyState } from '../../components/EmptyState';
import { AppHeader } from '../../components/AppHeader';
import { FormInput } from '../../components/FormInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { TrustedContactCard } from '../../components/TrustedContactCard';
import { InfoBanner } from '../../components/InfoBanner';
import { InlineLoader } from '../../components/InlineLoader';
import { Card } from '../../components/Card';
import { useTheme } from '../../hooks/useTheme';
import { getCachedValue, setCachedValue } from '../../utils/cache';
import { STORAGE_KEYS } from '../../constants/storage';
import { cleanText, hasErrors, minLength, validateEmail, validatePhone } from '../../utils/validation';

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  relationship: '',
  notes: '',
  isPrimary: false,
};

export function ContactsScreen() {
  const { theme } = useTheme();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const primaryContacts = useMemo(() => contacts.filter((contact) => contact.is_primary).length, [contacts]);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const cachedContacts = await getCachedValue(STORAGE_KEYS.cachedContacts, []);
      if (cachedContacts.length > 0) {
        setContacts(cachedContacts);
      }

      const nextContacts = await contactsApi.getContacts();
      setContacts(nextContacts);
      await setCachedValue(STORAGE_KEYS.cachedContacts, nextContacts);
    } catch (error) {
      setLoadError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [loadContacts])
  );

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: '' }));
  };

  const openCreateModal = () => {
    setEditingContact(null);
    setForm(emptyForm);
    setErrors({});
    setModalVisible(true);
  };

  const openEditModal = (contact) => {
    setEditingContact(contact);
    setForm({
      name: contact.name || '',
      phone: contact.phone || '',
      email: contact.email || '',
      relationship: contact.relationship || '',
      notes: contact.notes || '',
      isPrimary: Boolean(contact.is_primary),
    });
    setErrors({});
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingContact(null);
    setForm(emptyForm);
    setErrors({});
  };

  const validate = () => {
    const hasPhoneOrEmail = cleanText(form.phone) || cleanText(form.email);
    const nextErrors = {
      name: minLength(form.name, 2, 'Name'),
      phone: form.phone ? validatePhone(form.phone) : '',
      email: form.email ? validateEmail(form.email) : '',
      contactMethod: hasPhoneOrEmail ? '' : 'Add at least one phone number or email.',
    };
    setErrors(nextErrors);
    return !hasErrors(nextErrors);
  };

  const saveContact = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      const payload = {
        name: cleanText(form.name),
        phone: cleanText(form.phone),
        email: cleanText(form.email).toLowerCase(),
        relationship: cleanText(form.relationship),
        notes: cleanText(form.notes),
        isPrimary: form.isPrimary ? 1 : 0,
      };

      if (editingContact) {
        await contactsApi.updateContact(editingContact.id, payload);
      } else {
        await contactsApi.createContact(payload);
      }

      closeModal();
      await loadContacts();
    } catch (error) {
      Alert.alert('Unable to save contact', getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (contact) => {
    Alert.alert('Delete contact', `Remove ${contact.name} from trusted contacts?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await contactsApi.deleteContact(contact.id);
            await loadContacts();
          } catch (error) {
            Alert.alert('Delete failed', getApiErrorMessage(error));
          }
        },
      },
    ]);
  };

  const modalTitle = useMemo(() => (editingContact ? 'Edit trusted contact' : 'Set up emergency number'), [editingContact]);

  return (
    <ScreenWrapper refreshControl={<RefreshControl refreshing={loading} onRefresh={loadContacts} tintColor={theme.colors.primary} />}>
      <AppHeader
        eyebrow="Guardians"
        title="Emergency contacts"
        subtitle="People you trust to receive SOS alerts and live-location links."
        rightElement={
          <Pressable onPress={openCreateModal} accessibilityRole="button" accessibilityLabel="Add trusted contact" style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', ...theme.softShadow }}>
            <Ionicons name="add" size={26} color={theme.colors.white} />
          </Pressable>
        }
      />

      <Card elevated style={{ backgroundColor: theme.colors.primary, marginBottom: theme.spacing.lg, overflow: 'hidden' }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -34, top: -42, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.15)' }} />
        <Text style={{ color: theme.colors.white, fontWeight: '900', fontSize: 24, letterSpacing: -0.5 }}>Your safety circle</Text>
        <Text style={{ color: 'rgba(255,255,255,0.82)', marginTop: 6, lineHeight: 20 }}>{contacts.length} saved contact(s), {primaryContacts} marked primary.</Text>
      </Card>

      <InfoBanner
        tone={contacts.length > 0 ? 'success' : 'warning'}
        title={contacts.length > 0 ? 'Emergency network ready' : 'Complete your safety setup'}
        message={contacts.length > 0 ? `${contacts.length} trusted contact(s) are available for emergency flows.` : 'Add at least one trusted contact before relying on SOS.'}
        style={{ marginBottom: theme.spacing.lg }}
      />

      {loadError ? <InfoBanner tone="warning" title="Using cached contacts if available" message={loadError} style={{ marginBottom: theme.spacing.lg }} /> : null}

      {contacts.length === 0 && loading ? <InlineLoader label="Loading contacts..." /> : null}

      {contacts.length === 0 && !loading ? (
        <EmptyState
          icon="people-outline"
          title="No trusted contacts yet"
          message="Add someone you trust so SafeHer can notify them during SOS and live sharing flows."
          actionLabel="Add contact"
          onAction={openCreateModal}
        />
      ) : contacts.map((contact) => (
        <TrustedContactCard key={contact.id} contact={contact} onEdit={openEditModal} onDelete={confirmDelete} />
      ))}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay }}>
            <View style={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 34, borderTopRightRadius: 34, maxHeight: '92%', overflow: 'hidden' }}>
              <View style={{ width: 46, height: 5, borderRadius: 3, backgroundColor: theme.colors.borderStrong, alignSelf: 'center', marginTop: theme.spacing.md }} />
              <View style={{ paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
                  <Text style={{ color: theme.colors.text, fontSize: 25, fontWeight: '900', letterSpacing: -0.5 }}>{modalTitle}</Text>
                  <Text style={{ color: theme.colors.textMuted, marginTop: 4 }}>Keep details clear and reachable.</Text>
                </View>
                <Pressable onPress={closeModal} accessibilityRole="button" accessibilityLabel="Close contact form" style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border }}>
                  <Ionicons name="close" size={21} color={theme.colors.text} />
                </Pressable>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.xl }}>
                <FormInput label="Name" value={form.name} onChangeText={(value) => updateForm('name', value)} placeholder="My husband" error={errors.name} leftIcon="person-outline" />
                <FormInput label="Phone" value={form.phone} onChangeText={(value) => updateForm('phone', value)} placeholder="+91 123456789" keyboardType="phone-pad" error={errors.phone || errors.contactMethod} leftIcon="call-outline" />
                <FormInput label="Email (optional)" value={form.email} onChangeText={(value) => updateForm('email', value)} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} error={errors.email} leftIcon="mail-outline" />
                <FormInput label="Relationship" value={form.relationship} onChangeText={(value) => updateForm('relationship', value)} placeholder="Family / Friend / Work" leftIcon="heart-outline" />
                <FormInput label="Notes" value={form.notes} onChangeText={(value) => updateForm('notes', value)} placeholder="Apartment number, office desk, preferred call time" multiline leftIcon="document-text-outline" />

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg, backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border }}>
                  <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '900' }}>Primary contact</Text>
                    <Text style={{ color: theme.colors.textMuted, marginTop: 4, lineHeight: 19 }}>Primary contacts are shown first and prioritized in the SOS delivery list.</Text>
                  </View>
                  <Switch value={form.isPrimary} onValueChange={(value) => updateForm('isPrimary', value)} />
                </View>

                <PrimaryButton title={editingContact ? 'Save changes' : 'Submit'} onPress={saveContact} loading={saving} />
                <PrimaryButton title="Cancel" variant="secondary" onPress={closeModal} style={{ marginTop: theme.spacing.md }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenWrapper>
  );
}
