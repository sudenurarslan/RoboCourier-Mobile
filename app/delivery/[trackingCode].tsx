import { apiFetchJson } from '@/lib/api';
import { useAuth } from '@/providers/auth';
import { useAppTheme } from '@/providers/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLanguage } from '@/providers/language';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type DeliveryStatus =
  | 'pending'
  | 'waiting_pickup'
  | 'in_progress'
  | 'arrived_receiver'
  | 'completed'
  | 'cancelled'
  | 'failed';

type RobotStatus = 'idle' | 'moving' | 'waiting_qr' | 'returning' | 'charging' | 'error';

type DeliveryDetail = {
  trackingCode: string;
  status: DeliveryStatus;
  senderName: string;
  receiverName: string;
  pickupRoom: string;
  dropoffRoom: string;
  description?: string;
  robotName?: string;
  robotStatus?: RobotStatus;
  batteryLevel?: number;
  createdAt?: string;
  acceptedAt?: string;
  pickupCompletedAt?: string;
  arrivedReceiverAt?: string;
  completedAt?: string;
};

function mockDetail(trackingCode: string): DeliveryDetail {
  const base: DeliveryDetail = {
    trackingCode,
    status: 'in_progress',
    senderName: 'You',
    receiverName: 'Deniz Özsoyeller',
    pickupRoom: '505',
    dropoffRoom: '402',
    description: 'Signed document',
    robotName: 'RoboCourier-01',
    robotStatus: 'moving',
    batteryLevel: 87,
    createdAt: 'Today • 10:12',
    acceptedAt: 'Today • 10:13',
    pickupCompletedAt: 'Today • 10:16',
  };

  if (trackingCode.endsWith('81')) {
    return {
      ...base,
      status: 'arrived_receiver',
      robotStatus: 'waiting_qr',
      batteryLevel: 74,
      arrivedReceiverAt: 'Today • 10:22',
    };
  }
  if (trackingCode.endsWith('97')) {
    return {
      ...base,
      status: 'completed',
      robotStatus: 'returning',
      batteryLevel: 61,
      arrivedReceiverAt: 'Today • 10:22',
      completedAt: 'Today • 10:24',
    };
  }
  if (trackingCode.endsWith('00')) {
    return {
      ...base,
      status: 'waiting_pickup',
      robotStatus: 'moving',
      batteryLevel: 92,
      pickupCompletedAt: undefined,
    };
  }
  return base;
}

const STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: 'Pending',
  waiting_pickup: 'Waiting pickup',
  in_progress: 'In progress',
  arrived_receiver: 'Arrived (receiver)',
  completed: 'Completed',
  cancelled: 'Cancelled',
  failed: 'Failed',
};

function statusColor(status: DeliveryStatus) {
  switch (status) {
    case 'completed':
      return { bg: 'rgba(34,197,94,0.18)', border: 'rgba(34,197,94,0.45)' };
    case 'in_progress':
      return { bg: 'rgba(59,130,246,0.18)', border: 'rgba(59,130,246,0.45)' };
    case 'arrived_receiver':
      return { bg: 'rgba(168,85,247,0.18)', border: 'rgba(168,85,247,0.45)' };
    case 'failed':
      return { bg: 'rgba(239,68,68,0.18)', border: 'rgba(239,68,68,0.45)' };
    case 'cancelled':
      return { bg: 'rgba(148,163,184,0.18)', border: 'rgba(148,163,184,0.45)' };
    default:
      return { bg: 'rgba(255,255,255,0.14)', border: 'rgba(255,255,255,0.22)' };
  }
}

// ─── Cargo-style tracking steps ────────────────────────────────────────────
// Mirrors delivery_events event_type values + deliveries status column.
// Mock-friendly: timeKey maps to DeliveryDetail timestamp fields.
const TRACKING_STEPS: {
  key: string;
  label: string;
  sublabel: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  timeKey: keyof Pick<DeliveryDetail, 'createdAt' | 'acceptedAt' | 'pickupCompletedAt' | 'arrivedReceiverAt' | 'completedAt'>;
  forStatus: DeliveryStatus[];
}[] = [
    {
      key: 'ordered',
      label: 'requestReceived',
      sublabel: 'orderSublabel',
      icon: 'receipt-long',
      timeKey: 'createdAt',
      forStatus: ['pending', 'waiting_pickup', 'in_progress', 'arrived_receiver', 'completed'],
    },
    {
      key: 'preparing',
      label: 'preparingPickup',
      sublabel: 'preparingSublabel',
      icon: 'smart-toy',
      timeKey: 'acceptedAt',
      forStatus: ['waiting_pickup', 'in_progress', 'arrived_receiver', 'completed'],
    },
    {
      key: 'on_the_way',
      label: 'onTheWay',
      sublabel: 'onTheWaySublabel',
      icon: 'local-shipping',
      timeKey: 'pickupCompletedAt',
      forStatus: ['in_progress', 'arrived_receiver', 'completed'],
    },
    {
      key: 'arrived',
      label: 'arrivedRoom',
      sublabel: 'arrivedSublabel',
      icon: 'location-on',
      timeKey: 'arrivedReceiverAt',
      forStatus: ['arrived_receiver', 'completed'],
    },
    {
      key: 'delivered',
      label: 'deliveredStep',
      sublabel: 'deliveredSublabel',
      icon: 'check-circle',
      timeKey: 'completedAt',
      forStatus: ['completed'],
    },
  ];

// ─── Activity Log (mock — maps to delivery_events table) ────────────────────
type EventItem = {
  id: string;
  time: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  detail?: string;
  color: string;
};

function buildMockEvents(status: DeliveryStatus, d: DeliveryDetail): EventItem[] {
  const events: EventItem[] = [];

  if (d.createdAt) {
    events.push({ id: 'created', time: d.createdAt, icon: 'add-circle-outline', label: 'Delivery requested', detail: `From Room ${d.pickupRoom} → Room ${d.dropoffRoom}`, color: '#60a5fa' });
  }
  if (d.acceptedAt) {
    events.push({ id: 'assigned', time: d.acceptedAt, icon: 'smart-toy', label: 'Robot assigned', detail: `${d.robotName ?? 'RoboCourier-01'} is heading to your room`, color: '#a78bfa' });
  }
  if (d.pickupCompletedAt) {
    events.push({ id: 'loaded', time: d.pickupCompletedAt, icon: 'inventory-2', label: 'Document loaded', detail: 'Box closed, robot heading to receiver', color: '#34d399' });
  }
  if (d.arrivedReceiverAt) {
    events.push({ id: 'arrived', time: d.arrivedReceiverAt, icon: 'location-on', label: 'Arrived at receiver room', detail: `Waiting at Room ${d.dropoffRoom} — QR required`, color: '#f59e0b' });
  }
  if (d.completedAt) {
    events.push({ id: 'done', time: d.completedAt, icon: 'check-circle', label: 'Delivered', detail: 'QR scanned, lid opened, delivery complete', color: '#22c55e' });
  }

  if (status === 'cancelled') {
    events.push({ id: 'cancelled', time: '—', icon: 'cancel', label: 'Delivery cancelled', color: '#f87171' });
  }
  if (status === 'failed') {
    events.push({ id: 'failed', time: '—', icon: 'error', label: 'Delivery failed', color: '#f87171' });
  }

  return events.reverse(); // newest first
}

function ActivityLog({ status, detail, t }: { status: DeliveryStatus; detail: DeliveryDetail; t: any }) {
  const events = buildMockEvents(status, detail);
  return (
    <View style={logStyles.card}>
      <View style={logStyles.header}>
        <MaterialIcons name="history" size={18} color="#eaf2ff" />
        <Text style={logStyles.title}>{t('activityLog')}</Text>
        <Text style={logStyles.hint}>delivery_events</Text>
      </View>

      {events.length === 0 ? (
        <Text style={logStyles.empty}>{t('noEventsYet')}</Text>
      ) : (
        events.map((ev, idx) => (
          <View key={ev.id} style={logStyles.row}>
            <View style={logStyles.iconWrap}>
              <MaterialIcons name={ev.icon} size={16} color={ev.color} />
              {idx < events.length - 1 ? <View style={logStyles.connector} /> : null}
            </View>
            <View style={logStyles.content}>
              <View style={logStyles.labelRow}>
                <Text style={logStyles.label}>{ev.label}</Text>
                <Text style={logStyles.time}>{ev.time}</Text>
              </View>
              {ev.detail ? <Text style={logStyles.detail}>{ev.detail}</Text> : null}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const logStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    borderWidth: 1.25,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 16,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  title: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    flex: 1,
  },
  hint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  empty: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    minHeight: 44,
  },
  iconWrap: {
    width: 24,
    alignItems: 'center',
    paddingTop: 2,
  },
  connector: {
    width: 1.5,
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginTop: 6,
    borderRadius: 1,
  },
  content: {
    flex: 1,
    paddingBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  time: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  detail: {
    marginTop: 3,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
});

function getCurrentStepIndex(status: DeliveryStatus): number {
  switch (status) {
    case 'pending': return 0;
    case 'waiting_pickup': return 1;
    case 'in_progress': return 2;
    case 'arrived_receiver': return 3;
    case 'completed': return 4;
    default: return -1;
  }
}

function getStatusBanner(status: DeliveryStatus, dropoffRoom: string, t: any): { text: string; color: string } {
  switch (status) {
    case 'pending':
      return { text: t('bannerPending'), color: 'rgba(255,255,255,0.95)' };
    case 'waiting_pickup':
      return { text: t('bannerWaiting'), color: 'rgba(255,255,255,0.95)' };
    case 'in_progress':
      return { text: `${t('bannerInProgress')} ${dropoffRoom}.`, color: '#bfdbfe' };
    case 'arrived_receiver':
      return { text: `${t('bannerArrivedRec_1')} ${dropoffRoom}. ${t('bannerArrivedRec_2')}`, color: '#d8b4fe' };
    case 'completed':
      return { text: t('bannerCompleted'), color: '#bbf7d0' };
    case 'cancelled':
      return { text: t('bannerCancelled'), color: '#fca5a5' };
    case 'failed':
      return { text: t('bannerFailed'), color: '#fca5a5' };
    default:
      return { text: '', color: '#fff' };
  }
}

export default function DeliveryDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { trackingCode } = useLocalSearchParams<{ trackingCode: string }>();
  const code = trackingCode ?? 'RC-000123';

  const [detail, setDetail] = React.useState<DeliveryDetail>(() => mockDetail(code));
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>('');

  const { effectiveColorScheme } = useAppTheme();
  const isDarkMode = effectiveColorScheme === 'dark';

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const d = await apiFetchJson<{
          tracking_code: string;
          status: DeliveryStatus;
          description: string | null;
          created_at: string;
          accepted_at: string | null;
          pickup_completed_at: string | null;
          arrived_receiver_at: string | null;
          completed_at: string | null;
          sender_full_name: string;
          receiver_full_name: string;
          pickup_room_number: string;
          dropoff_room_number: string;
          robot_name: string | null;
          robot_status: RobotStatus | null;
          robot_battery_level: number | null;
        }>(`/deliveries/${encodeURIComponent(code)}`);
        if (cancelled) return;
        setDetail({
          trackingCode: d.tracking_code,
          status: d.status,
          senderName: d.sender_full_name,
          receiverName: d.receiver_full_name,
          pickupRoom: d.pickup_room_number,
          dropoffRoom: d.dropoff_room_number,
          description: d.description ?? undefined,
          robotName: d.robot_name ?? undefined,
          robotStatus: d.robot_status ?? undefined,
          batteryLevel: d.robot_battery_level ?? undefined,
          createdAt: d.created_at ? new Date(d.created_at).toLocaleString() : undefined,
          acceptedAt: d.accepted_at ? new Date(d.accepted_at).toLocaleString() : undefined,
          pickupCompletedAt: d.pickup_completed_at ? new Date(d.pickup_completed_at).toLocaleString() : undefined,
          arrivedReceiverAt: d.arrived_receiver_at ? new Date(d.arrived_receiver_at).toLocaleString() : undefined,
          completedAt: d.completed_at ? new Date(d.completed_at).toLocaleString() : undefined,
        });
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t('loadFailed'));
        // keep mock detail for preview
        setDetail(mockDetail(code));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const badge = statusColor(detail.status);

  const showSenderActions = detail.status === 'waiting_pickup' || detail.status === 'pending';
  const isReceiver = user?.role === 'receiver';
  // Demo-friendly: if you're logged in as receiver, allow showing QR for any active (non-terminal) delivery.
  // In a real robot flow you'd usually gate this by status (e.g. only when robot arrived to receiver).
  const showReceiverActions = Boolean(isReceiver) && !['completed', 'cancelled', 'failed'].includes(detail.status);

  return (
    <LinearGradient colors={isDarkMode ? ['#020617', '#0f172a', '#020617'] : ['#0b2a6a', '#2563eb', '#0ea5e9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => router.back()} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={18} color="#fff" />
              <Text style={styles.backText}>{t('back')}</Text>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{detail.trackingCode}</Text>
              <Text style={styles.subtitle}>
                {`${t('pickupRoom')} ${detail.pickupRoom} → ${t('dropoffRoom')} ${detail.dropoffRoom}`}
              </Text>
            </View>
          </View>

          <View style={[styles.card, styles.cardTight]}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>{t('status')}</Text>
                <Text style={styles.sectionBody}>{t(STATUS_LABEL[detail.status] as any)}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                <Text style={styles.pillText}>{t(STATUS_LABEL[detail.status] as any)}</Text>
              </View>
            </View>
            {loading ? <Text style={styles.noteText}>Loading…</Text> : null}
            {error ? <Text style={styles.noteText}>{error}</Text> : null}
            {detail.description ? <Text style={styles.noteText}>{detail.description}</Text> : null}
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <MaterialIcons name="smart-toy" size={18} color="#eaf2ff" />
              <Text style={styles.sectionTitle}>
                {detail.robotName ?? 'RoboCourier-01'}
              </Text>
            </View>
            <View style={styles.robotStatusRow}>
              <View style={[
                styles.robotStatusDot,
                { backgroundColor: detail.robotStatus === 'moving' ? '#22c55e' : detail.robotStatus === 'waiting_qr' ? '#a855f7' : detail.robotStatus === 'error' ? '#ef4444' : '#94a3b8' }
              ]} />
              <Text style={styles.smallText}>
                {detail.robotStatus === 'moving' ? t('robotMoving')
                  : detail.robotStatus === 'waiting_qr' ? t('robotWaitingQR')
                    : detail.robotStatus === 'returning' ? t('robotReturning')
                      : detail.robotStatus === 'idle' ? t('robotIdle')
                        : detail.robotStatus === 'charging' ? t('robotCharging')
                          : detail.robotStatus === 'error' ? t('robotError')
                            : t('robotStatusUnknown')}
              </Text>
            </View>
          </View>

          {/* ── Cargo-style tracking card ── */}
          <View style={styles.card}>
            <View style={styles.row}>
              <MaterialIcons name="local-shipping" size={18} color="#eaf2ff" />
              <Text style={styles.sectionTitle}>{t('deliveryTracking')}</Text>
            </View>

            {/* Status banner */}
            {getStatusBanner(detail.status, detail.dropoffRoom, t).text ? (
              <View style={[styles.banner, { borderColor: 'rgba(255,255,255,0.3)' }]}>
                <MaterialIcons
                  name={detail.status === 'completed' ? 'check-circle' : detail.status === 'arrived_receiver' ? 'notifications-active' : 'info-outline'}
                  size={16}
                  color="#0b2a6a"
                />
                <Text style={styles.bannerText}>
                  {getStatusBanner(detail.status, detail.dropoffRoom, t).text}
                </Text>
              </View>
            ) : null}

            {/* Steps */}
            <View style={styles.timeline}>
              {TRACKING_STEPS.map((step, idx) => {
                const currentIdx = getCurrentStepIndex(detail.status);
                const isCancelled = detail.status === 'cancelled' || detail.status === 'failed';
                const isDone = !isCancelled && currentIdx > idx;
                const isCurrent = !isCancelled && currentIdx === idx;
                const isUpcoming = isCancelled || currentIdx < idx;

                const dotStyle = isDone
                  ? styles.dotDone
                  : isCurrent
                    ? styles.dotCurrent
                    : styles.dotUpcoming;

                const labelStyle = isCurrent
                  ? styles.timelineTitleCurrent
                  : isUpcoming
                    ? styles.timelineTitleUpcoming
                    : styles.timelineTitle;

                const time = detail[step.timeKey];

                return (
                  <View key={step.key} style={styles.timelineRow}>
                    {/* Left: dot + connector line */}
                    <View style={styles.timelineLeft}>
                      <View style={[styles.dot, dotStyle]}>
                        <MaterialIcons
                          name={isDone ? 'check' : step.icon}
                          size={isDone ? 16 : 15}
                          color={isDone ? '#fff' : isCurrent ? '#0b2a6a' : 'rgba(255,255,255,0.4)'}
                        />
                      </View>
                      {idx < TRACKING_STEPS.length - 1 ? (
                        <View style={[styles.line, isDone && styles.lineDone]} />
                      ) : null}
                    </View>

                    {/* Right: text */}
                    <View style={styles.timelineContent}>
                      <Text style={[styles.timelineTitle, labelStyle]}>{t(step.label as any)}</Text>
                      <Text style={[styles.timelineSub, isUpcoming && styles.timelineTitleUpcoming]}>
                        {t(step.sublabel as any)}
                      </Text>
                      {time ? (
                        <Text style={styles.timelineTime}>{time}</Text>
                      ) : isCurrent ? (
                        <View style={styles.inProgressBadge}>
                          <Text style={styles.inProgressBadgeText}>{`● ${t('inProgressLabel')}`}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Activity Log ── */}
          <ActivityLog status={detail.status} detail={detail} t={t} />

          {showSenderActions ? (
            <View style={styles.card}>
              <View style={styles.row}>
                <MaterialIcons name="lock-open" size={18} color="#eaf2ff" />
                <Text style={styles.sectionTitle}>{t('senderActions')}</Text>
              </View>
              <Text style={styles.noteText}>
                {t('senderActionHint')}
              </Text>
              <TouchableOpacity activeOpacity={0.9} style={styles.primaryBtn}>
                <LinearGradient colors={['#22c55e', '#16a34a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradient}>
                  <MaterialIcons name="lock-open" size={18} color="#fff" />
                  <Text style={styles.primaryText}>{t('openBox')}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.9} style={styles.secondaryBtn}>
                <MaterialIcons name="play-arrow" size={18} color="#fff" />
                <Text style={styles.secondaryText}>{t('startDelivery')}</Text>
              </TouchableOpacity>
              {/* TODO(API): POST /deliveries/:id/events or PATCH /deliveries/:id status transition */}
            </View>
          ) : null}

          {showReceiverActions ? (
            <View style={styles.card}>
              <View style={styles.row}>
                <MaterialIcons name="qr-code" size={18} color="#eaf2ff" />
                <Text style={styles.sectionTitle}>{t('receiverActions')}</Text>
              </View>
              <Text style={styles.noteText}>
                {t('receiverActionHint')}
              </Text>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/show-qr', params: { trackingCode: detail.trackingCode } })}
                style={styles.primaryBtn}
              >
                <LinearGradient colors={['#a855f7', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradient}>
                  <MaterialIcons name="qr-code" size={18} color="#fff" />
                  <Text style={styles.primaryText}>{t('showQRtoRobot')}</Text>
                </LinearGradient>
              </TouchableOpacity>
              {/* TODO(API): after robot verification, set delivery_qr_codes.used_at + deliveries.completed_at */}
            </View>
          ) : null}

          <View style={[styles.card, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
            <View style={styles.row}>
              <MaterialIcons name="info-outline" size={18} color="#eaf2ff" />
              <Text style={styles.sectionTitle}>{t('notes')}</Text>
            </View>
            <Text style={styles.noteText}>
              {t('dbMappingHint')}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingBottom: 34,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  backText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gridCard: {
    flex: 1,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 18,
    borderWidth: 1.25,
    borderColor: 'rgba(255,255,255,0.22)',
    padding: 16,
    marginBottom: 10,
  },
  cardTight: {
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  sectionBody: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  smallText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  noteText: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 11,
    marginBottom: 14,
    borderWidth: 1,
  },
  bannerText: {
    flex: 1,
    color: '#0b2a6a',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  timeline: {
    marginTop: 4,
    gap: 0,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 60,
  },
  timelineLeft: {
    width: 30,
    alignItems: 'center',
    paddingTop: 2,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 14,
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: '#22c55e',
  },
  dotCurrent: {
    backgroundColor: '#fbbf24',
    borderWidth: 2.5,
    borderColor: '#f59e0b',
  },
  dotUpcoming: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 4,
    borderRadius: 2,
  },
  lineDone: {
    backgroundColor: 'rgba(34,197,94,0.6)',
  },
  timelineTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  timelineTitleCurrent: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '900',
  },
  timelineTitleUpcoming: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '700',
  },
  timelineSub: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  timelineTime: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '700',
  },
  inProgressBadge: {
    marginTop: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(251,191,36,0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.5)',
  },
  inProgressBadgeText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '900',
  },
  batteryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  batteryText: {
    fontSize: 11,
    fontWeight: '900',
  },
  robotStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 4,
  },
  robotStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  primaryBtn: {
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryGradient: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
  },
  secondaryBtn: {
    marginTop: 10,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
  },
});


