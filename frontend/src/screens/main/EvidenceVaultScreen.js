import React, { useCallback, useState } from 'react';
import { Alert, Image, Pressable, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useFocusEffect } from '@react-navigation/native';

import * as evidenceApi from '../../api/evidenceApi';
import { getApiErrorMessage } from '../../api/client';
import { AppHeader } from '../../components/AppHeader';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { FormInput } from '../../components/FormInput';
import { InfoBanner } from '../../components/InfoBanner';
import { InlineLoader } from '../../components/InlineLoader';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { StatusPill } from '../../components/StatusPill';
import { useTheme } from '../../hooks/useTheme';
import { formatDateTime } from '../../utils/date';
import { addLocalVaultItem, copyFileIntoVault, getLocalVaultItems, updateLocalVaultItem } from '../../services/evidenceVaultService';

function inferEvidenceType(asset, fallback) {
  if (fallback) return fallback;
  if (asset?.type === 'video') return 'video';
  return 'photo';
}

function getEvidenceIcon(type) {
  const iconMap = {
    photo: 'image-outline',
    video: 'videocam-outline',
    audio: 'mic-outline',
    note: 'document-text-outline',
  };
  return iconMap[type] || 'document-attach-outline';
}

function getEvidenceLabel(type) {
  const labels = {
    photo: 'Photo selected',
    video: 'Video selected',
    audio: 'Audio recording ready',
    note: 'Private note',
  };
  return labels[type] || 'Evidence selected';
}

function EvidenceTypeButton({ icon, title, subtitle, onPress, danger = false, disabled = false }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flex: 1,
        minWidth: '47%',
        borderRadius: theme.radius.xl,
        padding: theme.spacing.md,
        backgroundColor: pressed ? theme.colors.primaryTint : theme.colors.surface,
        borderWidth: 1,
        borderColor: danger ? theme.colors.primary : theme.colors.border,
        marginBottom: theme.spacing.md,
        opacity: disabled ? 0.55 : 1,
      })}
    >
      <View style={{ width: 46, height: 46, borderRadius: 18, backgroundColor: danger ? theme.colors.primarySoft : theme.colors.infoSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={22} color={danger ? theme.colors.primary : theme.colors.info} />
      </View>
      <Text style={{ color: theme.colors.text, fontWeight: '900', marginTop: 12 }}>{title}</Text>
      <Text style={{ color: theme.colors.textMuted, marginTop: 4, lineHeight: 18 }}>{subtitle}</Text>
    </Pressable>
  );
}

function PendingEvidencePreview({ pendingEvidence, loading, onUpload, onClear }) {
  const { theme } = useTheme();
  if (!pendingEvidence) return null;
  const isImage = pendingEvidence.type === 'photo' && pendingEvidence.localUri;
  const typeColor = pendingEvidence.type === 'audio' ? theme.colors.info : pendingEvidence.type === 'video' ? theme.colors.warning : theme.colors.success;

  return (
    <Card elevated style={{ marginTop: theme.spacing.md, marginBottom: theme.spacing.md, borderColor: typeColor, backgroundColor: theme.colors.primaryTint }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <View style={{ width: 76, height: 76, borderRadius: 24, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border }}>
          {isImage ? (
            <Image source={{ uri: pendingEvidence.localUri }} style={{ width: 76, height: 76 }} />
          ) : (
            <Ionicons name={getEvidenceIcon(pendingEvidence.type)} size={32} color={typeColor} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 17 }}>{getEvidenceLabel(pendingEvidence.type)}</Text>
            <StatusPill label="Not uploaded" tone="warning" />
          </View>
          <Text style={{ color: theme.colors.textMuted, marginTop: 6, lineHeight: 20 }} numberOfLines={2}>
            {pendingEvidence.fileName || 'Selected evidence file'}
          </Text>
          <Text style={{ color: theme.colors.textSubtle, marginTop: 5, fontWeight: '800' }}>
            Tap the upload button below to save it locally and back it up securely.
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
        <PrimaryButton
          title={`Upload ${pendingEvidence.type}`}
          onPress={onUpload}
          loading={loading}
          style={{ flex: 1 }}
          icon={<Ionicons name="cloud-upload-outline" size={18} color={theme.colors.white} />}
        />
        <PrimaryButton
          title="Clear"
          variant="secondary"
          onPress={onClear}
          disabled={loading}
          style={{ minWidth: 96 }}
        />
      </View>
    </Card>
  );
}

function VaultItemCard({ item }) {
  const { theme } = useTheme();
  const isImage = item.type === 'photo' && item.localUri;
  return (
    <Card elevated style={{ marginBottom: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <View style={{ width: 58, height: 58, borderRadius: 22, backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {isImage ? <Image source={{ uri: item.localUri }} style={{ width: 58, height: 58 }} /> : <Ionicons name={getEvidenceIcon(item.type)} size={25} color={theme.colors.primary} />}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ flex: 1, color: theme.colors.text, fontWeight: '900', fontSize: 16 }} numberOfLines={1}>{item.title}</Text>
            <StatusPill label={item.cloudId ? 'Backed up' : 'Local'} tone={item.cloudId ? 'success' : 'warning'} />
          </View>
          <Text style={{ color: theme.colors.textMuted, marginTop: 5, lineHeight: 19 }} numberOfLines={2}>{item.note || 'No note added.'}</Text>
          <Text style={{ color: theme.colors.textSubtle, marginTop: 7, fontWeight: '700' }}>{item.type.toUpperCase()} • {formatDateTime(item.createdAt)}</Text>
        </View>
      </View>
      {item.panicUploaded ? <InfoBanner tone="danger" title="Panic uploaded" message="This item was included in an urgent evidence backup." style={{ marginTop: theme.spacing.md }} /> : null}
    </Card>
  );
}

export function EvidenceVaultScreen({ navigation }) {
  const { theme } = useTheme();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const [locked, setLocked] = useState(true);
  const [items, setItems] = useState([]);
  const [cloudItems, setCloudItems] = useState([]);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [pendingEvidence, setPendingEvidence] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const loadVault = useCallback(async () => {
    if (locked) return;
    setLoading(true);
    try {
      const [localItems, remoteItems] = await Promise.all([
        getLocalVaultItems(),
        evidenceApi.getEvidenceItems().catch(() => []),
      ]);
      setItems(localItems);
      setCloudItems(remoteItems);
    } finally {
      setLoading(false);
    }
  }, [locked]);

  useFocusEffect(
    useCallback(() => {
      loadVault();
    }, [loadVault])
  );

  const unlockVault = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHardware && enrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Unlock SafeHer evidence vault',
          cancelLabel: 'Cancel',
          disableDeviceFallback: false,
        });
        if (!result.success) return;
      } else {
        Alert.alert('Biometric lock unavailable', 'This device has no enrolled biometric lock. SafeHer will use your logged-in app session as fallback for development testing.');
      }
      setLocked(false);
      setStatusMessage('Vault unlocked. Private evidence stays behind this lock.');
    } catch (error) {
      Alert.alert('Unlock failed', error.message);
    }
  };

  const resetForm = () => {
    setTitle('');
    setNote('');
    setPendingEvidence(null);
  };

  const saveLocalAndBackup = async ({ type, localUri = null, mimeType = null, fileName = null, panicUploaded = false }) => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Add a short title so this evidence is easy to identify later.');
      return false;
    }

    try {
      setLoading(true);
      setStatusMessage('');
      const vaultUri = localUri ? await copyFileIntoVault(localUri, type) : null;
      const localItem = await addLocalVaultItem({
        type,
        title: title.trim(),
        note: note.trim(),
        localUri: vaultUri,
        mimeType,
        fileName,
        createdAt: new Date().toISOString(),
        panicUploaded,
      });

      setItems((current) => [localItem, ...current]);

      const uploaded = await evidenceApi.uploadEvidence({
        type,
        title: localItem.title,
        note: localItem.note,
        panicUploaded,
        file: vaultUri ? { uri: vaultUri, name: fileName || `${type}-${Date.now()}`, mimeType } : null,
      });

      await updateLocalVaultItem(localItem.id, { cloudId: uploaded.id, cloudStatus: uploaded.cloud_status, panicUploaded: Boolean(uploaded.panic_uploaded) });
      setItems(await getLocalVaultItems());
      setCloudItems((current) => [uploaded, ...current]);
      resetForm();
      setStatusMessage('Evidence saved locally and encrypted backup completed.');
      return true;
    } catch (error) {
      setStatusMessage(getApiErrorMessage(error, 'Evidence saved locally, but cloud backup failed. Try again later.'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const pickMedia = async (mediaKind) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission needed', 'Media library access is required to save evidence.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaKind === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
      quality: 0.72,
      allowsEditing: mediaKind === 'photo',
    });

    if (result.canceled) return;
    const asset = result.assets[0];
    const type = inferEvidenceType(asset, mediaKind);
    setPendingEvidence({
      type,
      localUri: asset.uri,
      mimeType: asset.mimeType || (type === 'video' ? 'video/mp4' : 'image/jpeg'),
      fileName: asset.fileName || `${type}-${Date.now()}`,
    });
    setStatusMessage(`${type === 'photo' ? 'Photo' : 'Video'} selected. Review it and tap Upload ${type}.`);
  };

  const startAudioRecording = async () => {
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Microphone permission needed', 'Microphone access is required for audio evidence.');
      return;
    }
    setPendingEvidence(null);
    setStatusMessage('Recording audio evidence...');
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
  };

  const stopAudioRecording = async () => {
    await audioRecorder.stop();
    if (!audioRecorder.uri) {
      Alert.alert('Recording unavailable', 'SafeHer could not access the recorded audio file.');
      return;
    }
    setPendingEvidence({ type: 'audio', localUri: audioRecorder.uri, mimeType: 'audio/m4a', fileName: `audio-${Date.now()}.m4a` });
    setStatusMessage('Audio recording is ready. Review it and tap Upload audio.');
  };

  const uploadPendingEvidence = async () => {
    if (!pendingEvidence) {
      Alert.alert('No media selected', 'Choose a photo, video, or audio recording first.');
      return;
    }
    await saveLocalAndBackup(pendingEvidence);
  };

  const saveNote = async () => {
    setPendingEvidence(null);
    await saveLocalAndBackup({ type: 'note' });
  };

  const panicUpload = async () => {
    if (items.length === 0) {
      Alert.alert('No evidence yet', 'Add evidence before using panic upload.');
      return;
    }
    try {
      setLoading(true);
      for (const item of items) {
        if (item.cloudId) {
          await evidenceApi.markEvidencePanicUploaded(item.cloudId);
          await updateLocalVaultItem(item.id, { panicUploaded: true });
        } else {
          const uploaded = await evidenceApi.uploadEvidence({
            type: item.type,
            title: item.title,
            note: item.note,
            panicUploaded: true,
            file: item.localUri ? { uri: item.localUri, name: item.fileName || `${item.type}-${Date.now()}`, mimeType: item.mimeType } : null,
          });
          await updateLocalVaultItem(item.id, { cloudId: uploaded.id, cloudStatus: uploaded.cloud_status, panicUploaded: true });
        }
      }
      setItems(await getLocalVaultItems());
      setStatusMessage('Panic upload completed for vault evidence.');
    } catch (error) {
      Alert.alert('Panic upload failed', getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (locked) {
    return (
      <ScreenWrapper scrollable={false} decorative={false} contentContainerStyle={{ justifyContent: 'center' }}>
        <Card elevated style={{ alignItems: 'center', paddingVertical: theme.spacing.xxxl }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.lg }}>
            <Ionicons name="lock-closed" size={42} color={theme.colors.white} />
          </View>
          <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 26, textAlign: 'center' }}>Smart Evidence Vault</Text>
          <Text style={{ color: theme.colors.textMuted, textAlign: 'center', lineHeight: 22, marginTop: 10 }}>Unlock with fingerprint or face lock before viewing private evidence.</Text>
          <PrimaryButton title="Unlock vault" onPress={unlockVault} style={{ marginTop: theme.spacing.xl, alignSelf: 'stretch' }} />
          <PrimaryButton title="Close" variant="secondary" onPress={() => navigation.goBack()} style={{ marginTop: theme.spacing.md, alignSelf: 'stretch' }} />
        </Card>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper refreshControl={<RefreshControl refreshing={loading} onRefresh={loadVault} tintColor={theme.colors.primary} />} keyboardAware>
      <AppHeader eyebrow="Private evidence" title="Smart Evidence Vault" subtitle="Select photo, video, or audio first, then review and upload it securely." onBack={() => navigation.goBack()} />

      {statusMessage ? <InfoBanner tone={statusMessage.toLowerCase().includes('failed') ? 'warning' : 'success'} message={statusMessage} style={{ marginBottom: theme.spacing.lg }} /> : null}

      <Card elevated style={{ backgroundColor: theme.colors.primary, marginBottom: theme.spacing.lg, overflow: 'hidden' }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -46, top: -46, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.16)' }} />
        <Text style={{ color: theme.colors.white, fontWeight: '900', fontSize: 24 }}>Encrypted private storage</Text>
        <Text style={{ color: 'rgba(255,255,255,0.84)', marginTop: 8, lineHeight: 21 }}>Pick evidence, check the preview, then tap Upload. Local files are isolated in the app vault and encrypted on backup.</Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.lg, flexWrap: 'wrap' }}>
          <StatusPill label={`${items.length} local`} tone="info" />
          <StatusPill label={`${cloudItems.length} backed up`} tone="success" />
          {pendingEvidence ? <StatusPill label="1 waiting upload" tone="warning" /> : null}
        </View>
      </Card>

      <Card elevated>
        <FormInput label="Evidence title" value={title} onChangeText={setTitle} placeholder="Taxi plate, street name, witness note" leftIcon="bookmark-outline" />
        <FormInput label="Private note" value={note} onChangeText={setNote} placeholder="Add context only you can see" multiline leftIcon="document-text-outline" />
        <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 16, marginBottom: theme.spacing.sm }}>Choose evidence type</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <EvidenceTypeButton icon="image-outline" title="Choose photo" subtitle="Select image proof" onPress={() => pickMedia('photo')} disabled={loading || recorderState.isRecording} />
          <EvidenceTypeButton icon="videocam-outline" title="Choose video" subtitle="Select clip proof" onPress={() => pickMedia('video')} disabled={loading || recorderState.isRecording} />
          <EvidenceTypeButton icon={recorderState.isRecording ? 'stop-circle-outline' : 'mic-outline'} title={recorderState.isRecording ? 'Stop audio' : 'Record audio'} subtitle={recorderState.isRecording ? 'Finish recording' : 'Voice proof'} onPress={recorderState.isRecording ? stopAudioRecording : startAudioRecording} danger={recorderState.isRecording} disabled={loading} />
          <EvidenceTypeButton icon="document-lock-outline" title="Save note" subtitle="Text-only proof" onPress={saveNote} disabled={loading || recorderState.isRecording} />
        </View>

        <PendingEvidencePreview
          pendingEvidence={pendingEvidence}
          loading={loading}
          onUpload={uploadPendingEvidence}
          onClear={() => {
            setPendingEvidence(null);
            setStatusMessage('Selected evidence cleared.');
          }}
        />

        {!pendingEvidence ? (
          <InfoBanner tone="info" title="New upload flow" message="After choosing a photo, video, or audio recording, an upload button will appear here before anything is saved." style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.md }} />
        ) : null}

        <PrimaryButton title="Panic upload all evidence" variant="danger" onPress={panicUpload} loading={loading && !pendingEvidence} style={{ marginTop: theme.spacing.sm }} />
      </Card>

      {loading && items.length === 0 ? <InlineLoader label="Loading vault..." /> : null}
      {items.length === 0 && !loading ? (
        <EmptyState icon="folder-open-outline" title="Vault is empty" message="Add private evidence when you need to protect proof for later." />
      ) : (
        <View style={{ marginTop: theme.spacing.xl }}>
          <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 18, marginBottom: theme.spacing.md }}>Vault items</Text>
          {items.map((item) => <VaultItemCard key={item.id} item={item} />)}
        </View>
      )}
    </ScreenWrapper>
  );
}
