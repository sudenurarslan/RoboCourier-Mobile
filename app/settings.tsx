import { Colors } from '@/constants/theme';
import { useLanguage } from '@/providers/language';
import { useAppTheme, ThemeMode } from '@/providers/theme';
import { useAuth } from '@/providers/auth';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { themeMode, setThemeMode, effectiveColorScheme } = useAppTheme();
  const palette = Colors[effectiveColorScheme];

  const roleLabel =
    user?.role === 'sender'
      ? t('roleSender')
      : user?.role === 'receiver'
      ? t('roleReceiver')
      : t('roleAdmin');

  const initials = user
    ? user.fullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  function handleSignOut() {
    Alert.alert(t('signOutConfirmTitle'), t('signOutConfirmMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('confirm'),
        style: 'destructive',
        onPress: () => {
          signOut();
          router.replace('/');
        },
      },
    ]);
  }

  const THEME_OPTIONS: { label: string; value: ThemeMode; icon: React.ComponentProps<typeof MaterialIcons>['name'] }[] = [
    { label: t('themeSystem'), value: 'system', icon: 'brightness-auto' },
    { label: t('themeLight'), value: 'light', icon: 'wb-sunny' },
    { label: t('themeDark'), value: 'dark', icon: 'nights-stay' },
  ];

  return (
    <LinearGradient
      colors={['#0b2a6a', '#2563eb', '#0ea5e9']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientBg}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" />

        {/* Background circles */}
        <View style={styles.backgroundLayer} pointerEvents="none">
          <View style={[styles.circle, styles.circleTopLeft]} />
          <View style={[styles.circle, styles.circleTopRight]} />
          <View style={[styles.circle, styles.circleCenterLeft]} />
          <View style={[styles.circle, styles.circleBottom]} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <MaterialIcons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('settings')}</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
          {user && (
            <View style={styles.profileCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user.fullName}</Text>
                <Text style={styles.profileEmail}>{user.email}</Text>
                <View style={styles.roleBadge}>
                  <MaterialIcons
                    name={
                      user.role === 'admin'
                        ? 'admin-panel-settings'
                        : user.role === 'sender'
                        ? 'local-shipping'
                        : 'qr-code-scanner'
                    }
                    size={11}
                    color="#bfdbfe"
                  />
                  <Text style={styles.roleBadgeText}>{roleLabel}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Appearance Section */}
          <SectionHeader icon="palette" title={t('appearance')} />

          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <MaterialIcons name="nights-stay" size={16} color="#93c5fd" />
              <Text style={styles.cardLabel}>{t('darkMode')}</Text>
            </View>
            <View style={styles.segmentedRow}>
              {THEME_OPTIONS.map((opt) => {
                const active = themeMode === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    activeOpacity={0.8}
                    onPress={() => setThemeMode(opt.value)}
                    style={[styles.segment, active && styles.segmentActive]}
                  >
                    <MaterialIcons
                      name={opt.icon}
                      size={14}
                      color={active ? '#1e40af' : 'rgba(255,255,255,0.7)'}
                    />
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Language Section */}
          <SectionHeader icon="language" title={t('language')} />

          <View style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setLanguage('en')}
              style={styles.languageRow}
            >
              <View style={styles.languageLeft}>
                <Text style={styles.flagText}>🇬🇧</Text>
                <Text style={styles.languageLabel}>{t('english')}</Text>
              </View>
              {language === 'en' && (
                <View style={styles.checkCircle}>
                  <MaterialIcons name="check" size={14} color="#1e40af" />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setLanguage('tr')}
              style={styles.languageRow}
            >
              <View style={styles.languageLeft}>
                <Text style={styles.flagText}>🇹🇷</Text>
                <Text style={styles.languageLabel}>{t('turkish')}</Text>
              </View>
              {language === 'tr' && (
                <View style={styles.checkCircle}>
                  <MaterialIcons name="check" size={14} color="#1e40af" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Account Section */}
          <SectionHeader icon="manage-accounts" title={t('account')} />

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleSignOut}
            style={styles.signOutCard}
          >
            <View style={styles.signOutRow}>
              <View style={styles.signOutIconWrap}>
                <MaterialIcons name="logout" size={18} color="#fca5a5" />
              </View>
              <Text style={styles.signOutText}>{t('signOut')}</Text>
              <MaterialIcons name="chevron-right" size={20} color="rgba(252,165,165,0.6)" />
            </View>
          </TouchableOpacity>

          {/* Version */}
          <Text style={styles.versionText}>{t('appVersion')}</Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <MaterialIcons name={icon} size={13} color="rgba(255,255,255,0.55)" />
      <Text style={styles.sectionHeaderText}>{title.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gradientBg: { flex: 1 },
  safeArea: { flex: 1 },
  backgroundLayer: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  circle: { position: 'absolute', borderRadius: 999 },
  circleTopLeft: { width: 250, height: 250, top: -80, left: -90, backgroundColor: 'rgba(255,255,255,0.07)' },
  circleTopRight: { width: 220, height: 220, top: -40, right: -70, backgroundColor: 'rgba(255,255,255,0.05)' },
  circleCenterLeft: { width: 300, height: 300, top: SCREEN_HEIGHT * 0.4, left: -130, backgroundColor: 'rgba(255,255,255,0.04)' },
  circleBottom: { width: 320, height: 320, bottom: -140, right: -120, backgroundColor: 'rgba(255,255,255,0.06)' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: -0.3 },

  scrollContent: { paddingHorizontal: 18, paddingBottom: 40 },

  // Profile card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 20,
    borderWidth: 1.25,
    borderColor: 'rgba(255,255,255,0.22)',
    padding: 16,
    marginBottom: 22,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: -0.2 },
  profileEmail: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '600' },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(96,165,250,0.22)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.35)',
  },
  roleBadgeText: { color: '#bfdbfe', fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  sectionHeaderText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  // Generic card
  card: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    borderWidth: 1.25,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: 16,
    marginBottom: 18,
  },
  cardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardLabel: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Segmented control (theme)
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  segmentActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  segmentText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#1e40af',
  },

  // Language rows
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  languageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flagText: { fontSize: 22 },
  languageLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: 10,
  },

  // Sign out
  signOutCard: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 18,
    borderWidth: 1.25,
    borderColor: 'rgba(239,68,68,0.28)',
    padding: 16,
    marginBottom: 28,
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signOutIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: '900',
    flex: 1,
  },

  versionText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '500',
  },
});
