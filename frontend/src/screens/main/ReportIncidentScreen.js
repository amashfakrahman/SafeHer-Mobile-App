import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import * as incidentsApi from '../../api/incidentsApi';
import { getApiErrorMessage } from '../../api/client';
import { AppHeader } from '../../components/AppHeader';
import { FormInput } from '../../components/FormInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Card } from '../../components/Card';
import { InfoBanner } from '../../components/InfoBanner';
import { StatusPill } from '../../components/StatusPill';
import { useTheme } from '../../hooks/useTheme';
import { getBestEffortLocation, requestForegroundLocationPermission } from '../../services/locationService';
import { getCachedValue, removeCachedValue, setCachedValue } from '../../utils/cache';
import { STORAGE_KEYS } from '../../constants/storage';
import { cleanText, hasErrors, minLength } from '../../utils/validation';

const categories = [
  { label: 'Harassment', value: 'harassment', icon: 'hand-left-outline' },
  { label: 'Unsafe area', value: 'unsafe-area', icon: 'warning-outline' },
  { label: 'Suspicious', value: 'suspicious-activity', icon: 'eye-outline' },
  { label: 'Other', value: 'general', icon: 'ellipsis-horizontal-outline' },
];

export function ReportIncidentScreen({ navigation }) {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('harassment');
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const draft = await getCachedValue(STORAGE_KEYS.pendingIncidentDraft, null);
      if (mounted && draft?.title) {
        setTitle(draft.title || '');
        setDescription(draft.description || '');
        setCategory(draft.category || 'harassment');
        setImage(draft.image || null);
        setDraftRestored(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const validate = () => {
    const nextErrors = {
      title: minLength(title, 3, 'Title'),
      description: minLength(description, 10, 'Description'),
    };
    setErrors(nextErrors);
    return !hasErrors(nextErrors);
  };

  const clearError = (key) => {
    if (errors[key]) setErrors((current) => ({ ...current, [key]: '' }));
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library permission is required to attach image evidence.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.72,
      allowsEditing: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const getOptionalLocation = async () => {
    try {
      const permission = await requestForegroundLocationPermission();
      if (permission.status !== 'granted') {
        return null;
      }
      return getBestEffortLocation();
    } catch (_error) {
      return null;
    }
  };

  const saveDraft = async ({ silent = false } = {}) => {
    await setCachedValue(STORAGE_KEYS.pendingIncidentDraft, {
      title,
      description,
      category,
      image,
    });
    if (!silent) {
      Alert.alert('Draft saved', 'Your incident draft was saved on this device.');
    }
  };

  const submitIncident = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);

      const location = await getOptionalLocation();
      const formData = new FormData();
      formData.append('title', cleanText(title));
      formData.append('description', cleanText(description));
      formData.append('category', category);

      if (location?.coords) {
        formData.append('latitude', String(location.coords.latitude));
        formData.append('longitude', String(location.coords.longitude));
      }

      if (image) {
        formData.append('image', {
          uri: image.uri,
          name: image.fileName || 'incident-image.jpg',
          type: image.mimeType || 'image/jpeg',
        });
      }

      await incidentsApi.createIncident(formData);
      await removeCachedValue(STORAGE_KEYS.pendingIncidentDraft);
      Alert.alert('Incident submitted', location?.coords ? 'Your report was saved and now appears on the safety map.' : 'Your report was saved. Enable location next time to place it directly on the map.');
      navigation.goBack();
    } catch (error) {
      await saveDraft({ silent: true });
      Alert.alert('Submission failed', `${getApiErrorMessage(error)}\n\nA local draft was saved for retry.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenWrapper keyboardAware>
      <AppHeader eyebrow="Reports" title="Report incident" subtitle="Capture key details clearly. With location permission, this becomes a map safety marker." onBack={() => navigation.goBack()} />

      <Card elevated style={{ backgroundColor: theme.colors.primary, marginBottom: theme.spacing.lg, overflow: 'hidden' }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -42, top: -42, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.15)' }} />
        <Text style={{ color: theme.colors.white, fontWeight: '900', fontSize: 24, letterSpacing: -0.5 }}>Report your incidents</Text>
        <Text style={{ color: 'rgba(255,255,255,0.86)', marginTop: 7, lineHeight: 21 }}>Report your incidents to help solve a problem at a location. Add only what you feel comfortable saving.</Text>
      </Card>

      {draftRestored ? <InfoBanner tone="info" title="Draft restored" message="Your previous unsent report was restored on this device." style={{ marginBottom: theme.spacing.lg }} /> : null}

      <InfoBanner
        tone="info"
        icon="document-text-outline"
        title="Evidence is optional"
        message="Image evidence is optional. Location is attached only when permission is granted. Reports with GPS appear as map markers and heat zones."
        style={{ marginBottom: theme.spacing.lg }}
      />

      <Card elevated>
        <FormInput label="Title" value={title} onChangeText={(value) => { setTitle(value); clearError('title'); }} placeholder="What happened?" error={errors.title} leftIcon="alert-circle-outline" />
        <FormInput label="Description" value={description} onChangeText={(value) => { setDescription(value); clearError('description'); }} placeholder="Describe the situation clearly and calmly." multiline error={errors.description} leftIcon="document-text-outline" />

        <Text style={{ color: theme.colors.text, fontWeight: '900', marginBottom: 10 }}>Category</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: theme.spacing.lg }}>
          {categories.map((item) => {
            const selected = category === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => setCategory(item.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => ({
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  borderRadius: theme.radius.pill,
                  backgroundColor: selected ? theme.colors.primary : pressed ? theme.colors.primarySoft : theme.colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: selected ? theme.colors.primary : theme.colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 7,
                })}
              >
                <Ionicons name={item.icon} size={16} color={selected ? theme.colors.white : theme.colors.primary} />
                <Text style={{ color: selected ? theme.colors.white : theme.colors.text, fontWeight: '900' }}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={pickImage}
          accessibilityRole="button"
          accessibilityLabel="Attach image evidence"
          style={({ pressed }) => ({
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: pressed ? theme.colors.primary : theme.colors.borderStrong,
            backgroundColor: pressed ? theme.colors.primarySoft : theme.colors.primaryTint,
            borderRadius: theme.radius.xl,
            padding: theme.spacing.xl,
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="image-outline" size={30} color={theme.colors.primary} />
          </View>
          <Text style={{ color: theme.colors.text, fontWeight: '900', marginTop: 12 }}>Attach optional image</Text>
          <Text style={{ color: theme.colors.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>Add screenshots or photos as supporting evidence.</Text>
        </Pressable>
      </Card>

      {image ? (
        <Card padding="none" elevated style={{ marginTop: theme.spacing.lg, overflow: 'hidden' }}>
          <Image source={{ uri: image.uri }} style={{ width: '100%', height: 230, backgroundColor: theme.colors.surfaceAlt }} />
          <View style={{ padding: theme.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <StatusPill label="Image attached" tone="success" icon="checkmark-circle" />
            <PrimaryButton title="Remove" variant="ghost" onPress={() => setImage(null)} style={{ minHeight: 40, paddingVertical: 8 }} />
          </View>
        </Card>
      ) : null}

      <PrimaryButton title="Submit report" onPress={submitIncident} loading={submitting} style={{ marginTop: theme.spacing.xl }} />
      <PrimaryButton title="Save draft on this device" variant="secondary" onPress={saveDraft} style={{ marginTop: theme.spacing.md }} />
    </ScreenWrapper>
  );
}
