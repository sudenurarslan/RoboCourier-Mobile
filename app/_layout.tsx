import 'react-native-get-random-values';
import '@/polyfills/encoding';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import SplashScreen from '@/app/_splash';
import { AuthProvider } from '@/providers/auth';
import { LanguageProvider } from '@/providers/language';
import { AppThemeProvider, useAppTheme } from '@/providers/theme';
import { useEffect, useState } from 'react';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutInner() {
  const { effectiveColorScheme } = useAppTheme();
  const [splashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setSplashVisible(false), 3000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data: any = response?.notification?.request?.content?.data ?? {};
      const trackingCode = data?.tracking_code ?? data?.trackingCode;
      if (typeof trackingCode === 'string' && trackingCode.length > 0) {
        router.push({ pathname: '/delivery/[trackingCode]', params: { trackingCode } });
      } else {
        router.push('/notifications');
      }
    });
    return () => sub.remove();
  }, []);

  if (splashVisible) {
    return <SplashScreen />;
  }

  return (
    <ThemeProvider value={effectiveColorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="new-delivery" options={{ title: 'New Delivery' }} />
        <Stack.Screen name="deliveries" options={{ title: 'Deliveries' }} />
        <Stack.Screen name="scan-qr" options={{ title: 'Scan QR' }} />
        <Stack.Screen name="show-qr" options={{ title: 'Show QR' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="robot-status" options={{ title: 'Robot Status' }} />
        <Stack.Screen name="rooms" options={{ title: 'Rooms' }} />
        <Stack.Screen name="delivery/[trackingCode]" options={{ title: 'Delivery' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="profile-settings" options={{ headerShown: false, presentation: 'modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <RootLayoutInner />
        </AuthProvider>
      </LanguageProvider>
    </AppThemeProvider>
  );
}
