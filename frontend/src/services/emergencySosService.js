import { Linking, Platform } from 'react-native';
import * as SMS from 'expo-sms';

function cleanPhone(value) {
  return String(value || '').replace(/[^+0-9]/g, '');
}

export function getCallableContacts(contacts = []) {
  return contacts
    .map((contact) => ({ ...contact, phone: cleanPhone(contact.phone) }))
    .filter((contact) => contact.phone && contact.phone.length >= 7);
}

export function getPrimaryEmergencyContact(contacts = []) {
  const callable = getCallableContacts(contacts);
  return callable.find((contact) => contact.is_primary) || callable[0] || null;
}

export function buildEmergencySms({ userName = 'A SafeHer user', latitude, longitude, accuracy, shareUrl }) {
  const mapsUrl = latitude && longitude ? `https://maps.google.com/?q=${latitude},${longitude}` : 'Location unavailable';
  const accuracyText = accuracy ? `Accuracy: about ${Math.round(accuracy)}m.` : 'Accuracy unavailable.';
  return `${userName} triggered an SOS alert from SafeHer. ${accuracyText} GPS: ${mapsUrl}. Live link: ${shareUrl || 'not available'}. Please check on them immediately.`;
}

export async function sendEmergencySmsToContacts({ contacts, message }) {
  const recipients = getCallableContacts(contacts).map((contact) => contact.phone);
  if (recipients.length === 0) {
    return { status: 'skipped', reason: 'No phone numbers saved for SMS.', recipients: [] };
  }

  try {
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      return { status: 'unavailable', reason: 'SMS is not available on this device.', recipients };
    }

    const result = await SMS.sendSMSAsync(recipients, message);
    return { status: result?.result || 'opened', recipients };
  } catch (error) {
    return { status: 'failed', reason: error.message, recipients };
  }
}

export async function callPrimaryEmergencyContact(contacts = []) {
  const contact = getPrimaryEmergencyContact(contacts);
  if (!contact?.phone) {
    return { status: 'skipped', reason: 'No callable emergency contact saved.' };
  }

  try {
    const scheme = Platform.OS === 'android' ? 'tel' : 'telprompt';
    const url = `${scheme}:${contact.phone}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      return { status: 'unavailable', reason: 'Calling is not available on this device.', contact };
    }
    await Linking.openURL(url);
    return { status: 'opened', contact };
  } catch (error) {
    return { status: 'failed', reason: error.message, contact };
  }
}
