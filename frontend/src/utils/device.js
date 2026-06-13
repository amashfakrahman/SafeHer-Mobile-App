import { Platform } from 'react-native';

export function getReadablePlatform() {
  return Platform.select({
    ios: 'ios',
    android: 'android',
    default: 'web',
  });
}
