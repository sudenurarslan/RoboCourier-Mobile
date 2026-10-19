import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import { apiFetchJson, getApiBaseUrl } from './api';

// Show notifications while the app is in the foreground (useful for testing).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // SDK 54+: shouldShowAlert is deprecated; use banner/list flags.
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsIfPossible(userId: number) {
  // iOS Simulator cannot receive push notifications.
  if (!Device.isDevice) {
    console.log('PUSH: not a physical device, skipping');
    return { ok: false as const, reason: 'not_a_device' as const };
  }

  const perms = await Notifications.getPermissionsAsync();
  let status = perms.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') {
    console.log('PUSH: permission denied');
    return { ok: false as const, reason: 'permission_denied' as const };
  }

  // Expo Go generally works without projectId; standalone builds may require it.
  let token: string | null = null;
  try {
    const projectId: string | undefined =
      // Preferred: injected via app.config.js -> expo.extra.eas.projectId
      (Constants.expoConfig as any)?.extra?.eas?.projectId ??
      // Alternate: expo constants easConfig
      (Constants as any)?.easConfig?.projectId ??
      // As a last resort, allow reading from env
      process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

    if (!projectId) {
      throw new Error(
        'No projectId found. Set EXPO_PUBLIC_EAS_PROJECT_ID (EAS project UUID) and restart Expo with --clear.'
      );
    }

    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (e) {
    // Ignore; we still return failure so user can proceed without push.
    console.log('PUSH: getExpoPushTokenAsync failed', e);
    token = null;
  }
  if (!token) {
    console.log('PUSH: token error');
    return { ok: false as const, reason: 'token_error' as const };
  }
  console.log('PUSH: token acquired', token);

  // Register token with backend (stored server-side for sending push later).
  try {
    console.log('PUSH: registering token to', getApiBaseUrl());
    const resp = await apiFetchJson<{ ok: boolean; tokenCount?: number }>('/push/register', {
      method: 'POST',
      body: JSON.stringify({ userId, expoPushToken: token }),
    });
    console.log('PUSH: registered with backend', resp);
  } catch (e) {
    console.log('PUSH: backend register failed', e);
    return { ok: false as const, reason: 'backend_register_failed' as const };
  }

  return { ok: true as const, token };
}


