import { Colors } from '@/constants/theme';
import { apiFetchJson, getApiBaseUrl } from '@/lib/api';
import { useAuth } from '@/providers/auth';
import { useLanguage } from '@/providers/language';
import { useAppTheme } from '@/providers/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HamburgerMenu from '@/components/HamburgerMenu';

const SCREEN_HEIGHT = Dimensions.get('window').height;
// BURAYA LINK GELECEK
const API_BASE_URL = getApiBaseUrl();

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const { effectiveColorScheme } = useAppTheme();
  const palette = Colors[effectiveColorScheme];
  const isDarkMode = effectiveColorScheme === 'dark';

  const roleLabel = useMemo(() => {
    if (!user) return '';
    if (user.role === 'sender') return t('roleSender');
    if (user.role === 'receiver') return t('roleReceiver');
    return t('roleAdmin');
  }, [user, t]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;
  const [isMenuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 35,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (user) {
    return (
      <LinearGradient
        colors={isDarkMode ? ['#020617', '#0f172a', '#020617'] : ['#0b2a6a', '#2563eb', '#0ea5e9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBg}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <StatusBar barStyle="light-content" />

          <View style={styles.backgroundLayer} pointerEvents="none">
            <View style={[styles.circle, styles.circleTopLeft]} />
            <View style={[styles.circle, styles.circleTopRight]} />
            <View style={[styles.circle, styles.circleCenterLeft]} />
            <View style={[styles.circle, styles.circleBottom]} />
          </View>

          <ScrollView contentContainerStyle={styles.dashboardContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.dashboardHeader}>
              <View style={[styles.dashboardHeaderLeft, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuToggleBtn}>
                  <MaterialIcons name="menu" size={26} color="#fff" />
                </TouchableOpacity>
                <View>
                  <Text style={styles.dashboardTitle}>RoboCourier</Text>
                  <Text style={styles.dashboardSubtitle}>
                    {t('welcomeBackDash')}, {user.fullName || user.email} • {roleLabel}
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.notificationBtn}>
                <MaterialIcons name="notifications-none" size={24} color="#fff" />
                <View style={styles.notificationBadge} />
              </TouchableOpacity>
            </View>

            {user.role === 'sender' ? (
              <SenderDashboard
                userId={String(user.id)}
                onNewDelivery={() => {
                  router.push('/new-delivery');
                }}
                onTrack={() => {
                  router.push('/deliveries');
                }}
                onOpenDelivery={(code) => {
                  router.push(`/delivery/${code}`);
                }}
              />
            ) : user.role === 'receiver' ? (
              <ReceiverDashboard
                onScanQr={() => {
                  router.push('/scan-qr');
                }}
                onMyDeliveries={() => {
                  router.push('/deliveries');
                }}
              />
            ) : (
              <AdminDashboard
                onOpenAdmin={() => {
                }}
                apiBaseUrl={API_BASE_URL ?? ''}
              />
            )}

            {/* ROS Test shortcut */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push('/ros-test')}
              style={styles.utilityCard}
            >
              <View style={styles.cardRow}>
                <MaterialIcons name="memory" size={16} color="#e0f2fe" />
                <Text style={styles.utilityTitle}>ROS Expected Hex Test</Text>
              </View>
              <Text style={styles.utilityBody}>
                Publish a hex payload like <Text style={styles.mono}>0x313233</Text> to <Text style={styles.mono}>/expected_hex</Text>.
              </Text>
            </TouchableOpacity>

            <View style={styles.utilityCard}>
              <View style={styles.cardRow}>
                <MaterialIcons name="info-outline" size={16} color="#eaf2ff" />
                <Text style={styles.utilityTitle}>{t('backendConnection')}</Text>
              </View>
              <Text style={styles.utilityBody}>
                API: <Text style={styles.mono}>{API_BASE_URL ?? '-'}</Text>
              </Text>
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>

          <HamburgerMenu visible={isMenuVisible} onClose={() => setMenuVisible(false)} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={isDarkMode ? ['#020617', '#0f172a', '#020617'] : ['#1e40af', '#3b82f6', '#0ea5e9']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.gradientBg}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.backgroundLayer} pointerEvents="none">
          <View style={[styles.circle, styles.circleTopLeft]} />
          <View style={[styles.circle, styles.circleTopRight]} />
          <View style={[styles.circle, styles.circleCenterLeft]} />
          <View style={[styles.circle, styles.circleBottom]} />
        </View>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Logo + Title */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Image source={require('@/assets/images/logoRobo.png')} style={styles.logoImg} />
            </View>
            <Text style={styles.appName}>RoboCourier</Text>
            <Text style={styles.tagline}>{t('smart') + ' delivery'}</Text>
          </View>
          {/* Sign Up Button and Footer Link */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.88} onPress={() => router.push('/register')}>
              <Text style={styles.primaryButtonText}>{t('signUp')}</Text>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>{t('alreadyHaveAccount')}</Text>
              <TouchableOpacity activeOpacity={0.88} onPress={() => router.push('/login')}>
                <Text style={styles.footerLink}> {t('signIn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.version}>{t('appVersion')}</Text>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Active delivery types ──────────────────────────────────────────────────
type ActiveDeliveryStatus = 'pending' | 'waiting_pickup' | 'in_progress' | 'arrived_receiver';
type TerminalStatus = 'completed' | 'cancelled' | 'failed';
type AnyDeliveryStatus = ActiveDeliveryStatus | TerminalStatus;

type ActiveDelivery = {
  trackingCode: string;
  status: AnyDeliveryStatus;
  receiverName: string;
  pickupRoom: string;
  dropoffRoom: string;
};

type ApiDeliveryListItem = {
  tracking_code: string;
  receiver_full_name: string;
  pickup_room_number: string;
  dropoff_room_number: string;
  status: AnyDeliveryStatus;
  created_at: string;
};

const ACTIVE_STATUSES: AnyDeliveryStatus[] = ['pending', 'waiting_pickup', 'in_progress', 'arrived_receiver'];

const MINI_STEPS: {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
}[] = [
    { key: 'requested', label: 'Requested', icon: 'receipt-long' },
    { key: 'pickup', label: 'Pickup', icon: 'smart-toy' },
    { key: 'on_way', label: 'On the way', icon: 'local-shipping' },
    { key: 'arrived', label: 'Arrived', icon: 'location-on' },
    { key: 'done', label: 'Delivered', icon: 'check-circle' },
  ];

function getStepIndex(status: AnyDeliveryStatus): number {
  const map: Record<AnyDeliveryStatus, number> = {
    pending: 0, waiting_pickup: 1, in_progress: 2, arrived_receiver: 3, completed: 4,
    cancelled: -1, failed: -1,
  };
  return map[status] ?? 0;
}

const ACTIVE_STATUS_LABEL: Record<AnyDeliveryStatus, string> = {
  pending: 'requestReceived',
  waiting_pickup: 'robotHeadingToYou',
  in_progress: 'onTheWayToReceiver',
  arrived_receiver: 'arrivedQRNeeded',
  completed: 'delivered',
  cancelled: 'cancelled',
  failed: 'failed',
};

function ActiveDeliveryCard({ delivery, onPress }: { delivery: ActiveDelivery; onPress: () => void }) {
  const { t } = useLanguage();
  const currentStep = getStepIndex(delivery.status);
  const isArrived = delivery.status === 'arrived_receiver';

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.35, duration: 750, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <View style={activeStyles.card}>
        <LinearGradient
          colors={isArrived ? ['rgba(168,85,247,0.15)', 'rgba(0,0,0,0)'] : ['rgba(59,130,246,0.15)', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        <View style={activeStyles.header}>
          <View style={activeStyles.liveBadge}>
            <Animated.View style={[activeStyles.liveDot, { opacity: pulseAnim, backgroundColor: isArrived ? '#c4b5fd' : '#93c5fd' }]} />
            <Text style={activeStyles.liveText}>{t('activeDelivery')}</Text>
          </View>
          <View style={activeStyles.codeChip}>
            <MaterialIcons name="tag" size={12} color="rgba(255,255,255,0.6)" />
            <Text style={activeStyles.codeText}>{delivery.trackingCode}</Text>
          </View>
        </View>

        <View style={activeStyles.routeContainer}>
          <View style={activeStyles.routeItem}>
            <Text style={activeStyles.routeLabel}>{t('pickupRoom')}</Text>
            <Text style={activeStyles.routeValue}>{delivery.pickupRoom}</Text>
          </View>
          <View style={activeStyles.routeDivider}>
            <MaterialIcons name="arrow-forward" size={18} color="rgba(255,255,255,0.2)" />
          </View>
          <View style={activeStyles.routeItem}>
            <Text style={activeStyles.routeLabel}>{t('dropoffRoom')}</Text>
            <Text style={activeStyles.routeValue}>{delivery.dropoffRoom}</Text>
          </View>
        </View>

        <View style={activeStyles.receiverRow}>
          <MaterialIcons name="person" size={14} color="rgba(255,255,255,0.5)" />
          <Text style={activeStyles.receiverText} numberOfLines={1}>{delivery.receiverName}</Text>
        </View>

        <View style={activeStyles.stepsRow}>
          {MINI_STEPS.map((step, idx) => {
            const done = idx < currentStep;
            const current = idx === currentStep;
            return (
              <React.Fragment key={step.key}>
                <View style={[
                  activeStyles.dot,
                  done && activeStyles.dotDone,
                  current && activeStyles.dotCurrent,
                ]}>
                  <MaterialIcons
                    name={done ? 'check' : step.icon}
                    size={10}
                    color={done || current ? '#fff' : 'rgba(255,255,255,0.3)'}
                  />
                </View>
                {idx < MINI_STEPS.length - 1 ? (
                  <View style={[activeStyles.line, done && activeStyles.lineDone]} />
                ) : null}
              </React.Fragment>
            );
          })}
        </View>

        <View style={activeStyles.labelsRow}>
          {MINI_STEPS.map((step, idx) => (
            <Text key={step.key} style={[activeStyles.stepLabel, idx === currentStep && activeStyles.stepLabelCurrent]} numberOfLines={1}>
              {t(step.label as any)}
            </Text>
          ))}
        </View>

        <View style={activeStyles.statusPillContainer}>
          <View style={[activeStyles.statusPill, isArrived && activeStyles.statusPillPurple]}>
            <MaterialIcons name={isArrived ? 'qr-code-scanner' : 'smart-toy'} size={16} color={isArrived ? '#e9d5ff' : '#bfdbfe'} />
            <Text style={[activeStyles.statusPillText, isArrived && activeStyles.statusPillTextPurple]}>
              {t(ACTIVE_STATUS_LABEL[delivery.status] as any)}
            </Text>
            <MaterialIcons name="chevron-right" size={16} color="rgba(255,255,255,0.4)" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const activeStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: 18,
    marginBottom: 20,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)'
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5, color: '#fff', textTransform: 'uppercase' },
  codeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  codeText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  routeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 },
  routeItem: { flex: 1 },
  routeLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  routeValue: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  routeDivider: { paddingHorizontal: 12, opacity: 0.5 },

  receiverRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, paddingHorizontal: 4 },
  receiverText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', flex: 1 },

  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 16, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 2 },

  stepsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingHorizontal: 4 },
  dot: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  dotDone: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  dotCurrent: { backgroundColor: '#60a5fa', borderColor: '#93c5fd', borderWidth: 2 },
  line: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.10)', marginHorizontal: 2 },
  lineDone: { backgroundColor: '#3b82f6' },
  labelsRow: { flexDirection: 'row', marginBottom: 16, paddingHorizontal: 4 },
  stepLabel: { flex: 1, color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: '700', textAlign: 'center' },
  stepLabelCurrent: { color: '#fff', fontWeight: '900' },

  statusPillContainer: { alignItems: 'center' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(59,130,246,0.2)',
    borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16,
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.4)',
    width: '100%',
  },
  statusPillPurple: { backgroundColor: 'rgba(168,85,247,0.2)', borderColor: 'rgba(168,85,247,0.4)' },
  statusPillText: { color: '#bfdbfe', fontSize: 13, fontWeight: '800', flex: 1, textAlign: 'center' },
  statusPillTextPurple: { color: '#e9d5ff' },
});

// ─── Sender Dashboard ───────────────────────────────────────────────────────
function SenderDashboard({
  userId,
  onNewDelivery,
  onTrack,
  onOpenDelivery,
}: {
  userId: string;
  onNewDelivery: () => void;
  onTrack: () => void;
  onOpenDelivery: (code: string) => void;
}) {
  const { t } = useLanguage();
  const [activeDelivery, setActiveDelivery] = React.useState<ActiveDelivery | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetchJson<ApiDeliveryListItem[]>(`/deliveries?sender_id=${encodeURIComponent(userId)}`);
        if (cancelled) return;
        const found = res.find((d) => (ACTIVE_STATUSES as string[]).includes(d.status));
        setActiveDelivery(found ? {
          trackingCode: found.tracking_code,
          status: found.status,
          receiverName: found.receiver_full_name,
          pickupRoom: found.pickup_room_number,
          dropoffRoom: found.dropoff_room_number,
        } : null);
      } catch {
        // API not connected yet — card stays hidden
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  return (
    <>
      {activeDelivery ? (
        <ActiveDeliveryCard
          delivery={activeDelivery}
          onPress={() => onOpenDelivery(activeDelivery.trackingCode)}
        />
      ) : null}

      <View style={styles.heroCard}>
        <LinearGradient
          colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="local-shipping" size={24} color="#0b2a6a" />
          </View>
          <Text style={styles.heroTitle}>New Delivery</Text>
        </View>
        <Text style={styles.heroSubtitle}>
          Call the robot, place your document, and track it in real time until the receiver confirms.
        </Text>

        <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.9} onPress={onNewDelivery}>
          <LinearGradient colors={['#3b82f6', '#1d4ed8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaGradient}>
            <MaterialIcons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.ctaText}>New Delivery</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <MaterialIcons name="track-changes" size={18} color="#eaf2ff" />
          <Text style={styles.cardTitle}>{t('allDeliveries')}</Text>
        </View>
        <Text style={styles.cardBody}>
          {t('allDeliveriesSubtitle')}
        </Text>
        <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.9} onPress={onTrack}>
          <Text style={styles.secondaryBtnText}>{t('openDeliveryList')}</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </>
  );
}

function ReceiverDashboard({
  onScanQr,
  onMyDeliveries,
}: {
  onScanQr: () => void;
  onMyDeliveries: () => void;
}) {
  const { t } = useLanguage();
  return (
    <>
      <View style={styles.heroCard}>
        <LinearGradient
          colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="qr-code-scanner" size={24} color="#0b2a6a" />
          </View>
          <Text style={styles.heroTitle}>{t('scanToUnlock')}</Text>
        </View>
        <Text style={styles.heroSubtitle}>
          {t('scanToUnlockSubtitle')}
        </Text>

        <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.9} onPress={onScanQr}>
          <LinearGradient colors={['#a855f7', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaGradient}>
            <MaterialIcons name="qr-code" size={20} color="#fff" />
            <Text style={styles.ctaText}>{t('scanQR')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <MaterialIcons name="notifications-active" size={18} color="#eaf2ff" />
          <Text style={styles.cardTitle}>Waiting pickup</Text>
        </View>
        <Text style={styles.cardBody}>
          {/* TODO: /deliveries?receiver_id=... + status='arrived_receiver' ile “robot arrived” kartı burada gösterilecek. */}
          No active pickup right now. When the robot arrives, you’ll see it here.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <MaterialIcons name="list-alt" size={18} color="#eaf2ff" />
          <Text style={styles.cardTitle}>My deliveries</Text>
        </View>
        <Text style={styles.cardBody}>
          {/* TODO: receiver geçmiş teslimatlar (completed/cancelled/failed) burada listelenecek. */}
          History of deliveries will appear here (tracking code, status, timestamps).
        </Text>
        <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.9} onPress={onMyDeliveries}>
          <Text style={styles.secondaryBtnText}>Open delivery history</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </>
  );
}

function AdminDashboard({ onOpenAdmin, apiBaseUrl }: { onOpenAdmin: () => void; apiBaseUrl: string }) {
  const { t } = useLanguage();
  return (
    <>
      <View style={styles.heroCard}>
        <LinearGradient
          colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="admin-panel-settings" size={24} color="#0b2a6a" />
          </View>
          <Text style={styles.heroTitle}>{t('adminOverview')}</Text>
        </View>
        <Text style={styles.heroSubtitle}>
          {t('adminOverviewSubtitle')}
        </Text>

        <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.9} onPress={onOpenAdmin}>
          <LinearGradient colors={['#f59e0b', '#b45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaGradient}>
            <MaterialIcons name="open-in-new" size={20} color="#fff" />
            <Text style={styles.ctaText}>{t('openAdmin')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.gridRow}>
        <View style={[styles.card, styles.gridCard]}>
          <View style={styles.cardRow}>
            <MaterialIcons name="smart-toy" size={18} color="#eaf2ff" />
            <Text style={styles.cardTitle}>{t('robot')}</Text>
          </View>
          <Text style={styles.bigNumber}>—</Text>
          <Text style={styles.cardHint}>{t('statusBattery')}</Text>
        </View>

        <View style={[styles.card, styles.gridCard]}>
          <View style={styles.cardRow}>
            <MaterialIcons name="local-shipping" size={18} color="#eaf2ff" />
            <Text style={styles.cardTitle}>{t('deliveries')}</Text>
          </View>
          <Text style={styles.bigNumber}>—</Text>
          <Text style={styles.cardHint}>{t('today')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <MaterialIcons name="cloud" size={18} color="#eaf2ff" />
          <Text style={styles.cardTitle}>{t('system')}</Text>
        </View>
        <Text style={styles.cardBody}>
          {/* TODO: /robots, /deliveries, /delivery_events endpointleri gelince burası gerçek veriye bağlanacak. */}
          API Base: <Text style={styles.mono}>{apiBaseUrl}</Text>
        </Text>
      </View>
    </>
  );
}



const styles = StyleSheet.create({
  gradientBg: { flex: 1 },
  safeArea: { flex: 1 },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
  },
  circleTopLeft: {
    width: 250,
    height: 250,
    top: -80,
    left: -90,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  circleTopRight: {
    width: 220,
    height: 220,
    top: -40,
    right: -70,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  circleCenterLeft: {
    width: 300,
    height: 300,
    top: SCREEN_HEIGHT * 0.4,
    left: -130,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  circleBottom: {
    width: 320,
    height: 320,
    bottom: -140,
    right: -120,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26, paddingBottom: 40 },
  logoSection: { alignItems: 'center', marginBottom: 30, marginTop: -18 },
  logoCircle: { width: 125, height: 125, borderRadius: 62.5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', shadowColor: '#2563eb', shadowOpacity: 0.09, shadowRadius: 16, elevation: 7, marginBottom: 9 },
  logoImg: { width: 85, height: 85, resizeMode: 'contain', borderRadius: 43 },
  appName: { fontSize: 29, fontWeight: "800", color: '#fff', letterSpacing: -0.9, marginBottom: 9 },
  tagline: { fontSize: 15, fontWeight: "400", color: '#c7e2fa', marginBottom: 3 },
  buttonsContainer: { width: '100%', gap: 13, marginTop: 10, marginBottom: 25, alignItems: 'center' },
  primaryButton: { borderRadius: 17, width: '100%', paddingVertical: 18, alignItems: 'center', backgroundColor: '#2563eb', shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.09, shadowRadius: 13 },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  footerText: { fontSize: 14, color: '#e0e7ef' },
  footerLink: { fontSize: 14, color: '#fff', fontWeight: '700' },
  version: { textAlign: 'center', color: '#c7e2fa', fontSize: 10, marginTop: 22, fontWeight: '500' },

  dashboardContainer: {
    paddingHorizontal: 18,
    paddingBottom: 36,
    paddingTop: 10,
  },
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  dashboardHeaderLeft: {
    flex: 1,
  },
  menuToggleBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  dashboardTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  dashboardSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  notificationBtn: {
    padding: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#1d4ed8',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
  },
  signOutText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  ctaBtn: {
    marginTop: 18,
    overflow: 'hidden',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaGradient: {
    paddingVertical: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  gridCard: {
    flex: 1,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 18,
    marginBottom: 14,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  cardBody: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  bigNumber: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
    marginTop: 2,
  },
  cardHint: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  secondaryBtn: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
  },
  mono: {
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    color: '#fff',
  },

  menuCard: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 18,
    borderWidth: 1.25,
    borderColor: 'rgba(255,255,255,0.22)',
    padding: 16,
    marginBottom: 12,
  },
  menuGrid: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  menuTile: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  menuTileIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  menuTileTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  menuTileSubtitle: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11,
    fontWeight: '700',
  },
  utilityCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    marginBottom: 8,
  },
  utilityTitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  utilityBody: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
});