import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetchJson } from '@/lib/api';
import { RobotStatusCard } from '@/components/RobotStatusCard';
import { useRobotStatus } from '@/hooks/useRobotStatus';
import { useLanguage } from '@/providers/language';
import { useAppTheme } from '@/providers/theme';

type RobotStatus = 'idle' | 'moving' | 'waiting_qr' | 'returning' | 'charging' | 'error';

type Robot = {
  id: number;
  name: string;
  status: RobotStatus;
  batteryLevel?: number;
  currentRoom?: string;
  lastHeartbeatAt?: string;
};

type ApiRobot = {
  id: string;
  name: string;
  status: RobotStatus;
  battery_level: number | null;
  last_heartbeat_at: string | null;
  current_room_number: string | null;
};

// Mock global event feed (maps to delivery_events table)
type GlobalEvent = {
  id: string;
  time: string;
  trackingCode: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  detail?: string;
  color: string;
};

const MOCK_GLOBAL_EVENTS: GlobalEvent[] = [
  { id: '1', time: 'Today • 10:24', trackingCode: 'RC-A3F8D2', icon: 'check-circle', label: 'Delivered', detail: 'QR scanned, lid opened — Room 402', color: '#22c55e' },
  { id: '2', time: 'Today • 10:22', trackingCode: 'RC-A3F8D2', icon: 'location-on', label: 'Arrived at Room 402', detail: 'Waiting for receiver QR', color: '#f59e0b' },
  { id: '3', time: 'Today • 10:16', trackingCode: 'RC-A3F8D2', icon: 'inventory-2', label: 'Document loaded', detail: 'Box closed, heading to receiver', color: '#34d399' },
  { id: '4', time: 'Today • 10:13', trackingCode: 'RC-A3F8D2', icon: 'smart-toy', label: 'Robot assigned', detail: 'RoboCourier-01 heading to Room 505', color: '#a78bfa' },
  { id: '5', time: 'Today • 10:12', trackingCode: 'RC-A3F8D2', icon: 'add-circle-outline', label: 'Delivery requested', detail: 'Room 505 → Room 402', color: '#60a5fa' },
  { id: '6', time: 'Yesterday • 16:58', trackingCode: 'RC-9B1C97', icon: 'check-circle', label: 'Delivered', detail: 'QR scanned, lid opened — Room 301', color: '#22c55e' },
  { id: '7', time: 'Yesterday • 16:54', trackingCode: 'RC-9B1C97', icon: 'location-on', label: 'Arrived at Room 301', detail: 'Waiting for receiver QR', color: '#f59e0b' },
  { id: '8', time: 'Yesterday • 16:48', trackingCode: 'RC-9B1C97', icon: 'inventory-2', label: 'Document loaded', detail: 'Box closed, heading to receiver', color: '#34d399' },
  { id: '9', time: 'Yesterday • 11:20', trackingCode: 'RC-7E2A81', icon: 'error', label: 'Delivery failed', detail: 'Robot error — returned to base', color: '#f87171' },
];

function statusChip(status: RobotStatus, t: any) {
  switch (status) {
    case 'moving': return { bg: 'rgba(59,130,246,0.18)', border: 'rgba(59,130,246,0.45)', text: t('moving'), dot: '#3b82f6' };
    case 'waiting_qr': return { bg: 'rgba(168,85,247,0.18)', border: 'rgba(168,85,247,0.45)', text: t('waitingQR'), dot: '#a855f7' };
    case 'charging': return { bg: 'rgba(34,197,94,0.18)', border: 'rgba(34,197,94,0.45)', text: t('charging'), dot: '#22c55e' };
    case 'returning': return { bg: 'rgba(251,191,36,0.18)', border: 'rgba(251,191,36,0.45)', text: t('returning'), dot: '#fbbf24' };
    case 'error': return { bg: 'rgba(239,68,68,0.18)', border: 'rgba(239,68,68,0.45)', text: t('error'), dot: '#ef4444' };
    default: return { bg: 'rgba(255,255,255,0.14)', border: 'rgba(255,255,255,0.22)', text: t('idle'), dot: '#94a3b8' };
  }
}

export default function RobotStatusScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const liveRobot = useRobotStatus();
  const [robots, setRobots] = React.useState<Robot[]>([]);
  const [error, setError] = React.useState<string>('');
  const [showAllEvents, setShowAllEvents] = React.useState(false);

  const { effectiveColorScheme } = useAppTheme();
  const isDarkMode = effectiveColorScheme === 'dark';

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError('');
        const res = await apiFetchJson<ApiRobot[]>('/robots');
        if (cancelled) return;
        setRobots(
          res.map((r) => ({
            id: Number(r.id),
            name: r.name,
            status: r.status,
            batteryLevel: r.battery_level ?? undefined,
            currentRoom: r.current_room_number ?? undefined,
            lastHeartbeatAt: r.last_heartbeat_at ? new Date(r.last_heartbeat_at).toLocaleString() : undefined,
          }))
        );
      } catch (e) {
        if (cancelled) return;
        // Fallback to mock robot when DB not available
        setRobots([{
          id: 1,
          name: 'RoboCourier-01',
          status: 'idle',
          batteryLevel: 87,
          currentRoom: '—',
        }]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const visibleEvents = showAllEvents ? MOCK_GLOBAL_EVENTS : MOCK_GLOBAL_EVENTS.slice(0, 5);

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
              <Text style={styles.title}>{t('robotEvents')}</Text>
              <Text style={styles.subtitle}>{t('robotEventsSubtitle')}</Text>
            </View>
          </View>

          <RobotStatusCard status={liveRobot} />

          {/* ── Robot card ── */}
          {error ? (
            <View style={styles.card}>
              <Text style={styles.noteText}>{error}</Text>
            </View>
          ) : null}

          {robots.map((r) => {
            const chip = statusChip(r.status, t);
            return (
              <View key={r.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={styles.robotNameRow}>
                    <View style={[styles.statusDot, { backgroundColor: chip.dot }]} />
                    <Text style={styles.cardTitle}>{r.name}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: chip.bg, borderColor: chip.border }]}>
                    <Text style={styles.pillText}>{chip.text}</Text>
                  </View>
                </View>

                <View style={styles.kvRow}>
                  <View style={styles.kvItem}>
                    <MaterialIcons name="battery-full" size={14} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.k}>{t('battery')}</Text>
                    <Text style={styles.v}>{r.batteryLevel != null ? `${r.batteryLevel}%` : '—'}</Text>
                  </View>
                  <View style={styles.kvItem}>
                    <MaterialIcons name="location-on" size={14} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.k}>{t('location')}</Text>
                    <Text style={styles.v}>{r.currentRoom ?? '—'}</Text>
                  </View>
                  <View style={styles.kvItem}>
                    <MaterialIcons name="wifi" size={14} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.k}>{t('heartbeat')}</Text>
                    <Text style={styles.v}>{r.lastHeartbeatAt ?? '—'}</Text>
                  </View>
                </View>
              </View>
            );
          })}

          {/* ── Global Event Feed ── */}
          <View style={styles.card}>
            <View style={styles.feedHeader}>
              <MaterialIcons name="history" size={18} color="#eaf2ff" />
              <Text style={styles.cardTitle}>{t('deliveryEvents')}</Text>
              <Text style={styles.dbHint}>delivery_events</Text>
            </View>

            {visibleEvents.map((ev, idx) => (
              <View key={ev.id} style={styles.eventRow}>
                <View style={styles.eventLeft}>
                  <View style={[styles.eventDot, { backgroundColor: ev.color + '30', borderColor: ev.color }]}>
                    <MaterialIcons name={ev.icon} size={13} color={ev.color} />
                  </View>
                  {idx < visibleEvents.length - 1 ? <View style={styles.eventLine} /> : null}
                </View>
                <View style={styles.eventContent}>
                  <View style={styles.eventLabelRow}>
                    <Text style={styles.eventLabel}>{ev.label}</Text>
                    <Text style={styles.eventTime}>{ev.time}</Text>
                  </View>
                  <Text style={styles.eventTracking}>{ev.trackingCode}</Text>
                  {ev.detail ? <Text style={styles.eventDetail}>{ev.detail}</Text> : null}
                </View>
              </View>
            ))}

            {MOCK_GLOBAL_EVENTS.length > 5 ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowAllEvents(!showAllEvents)}
                style={styles.showMoreBtn}
              >
                <Text style={styles.showMoreText}>
                  {showAllEvents ? t('showLess') : `${t('showAll')} ${MOCK_GLOBAL_EVENTS.length} ${t('events')}`}
                </Text>
                <MaterialIcons name={showAllEvents ? 'expand-less' : 'expand-more'} size={16} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 34, paddingTop: 10 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8,
  },
  backText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  title: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.3 },
  subtitle: { marginTop: 6, color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', lineHeight: 17 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 18,
    borderWidth: 1.25, borderColor: 'rgba(255,255,255,0.20)',
    padding: 16, marginBottom: 10,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  robotNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  cardTitle: { color: '#fff', fontSize: 14, fontWeight: '900' },
  pill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  kvRow: { flexDirection: 'row', gap: 8 },
  kvItem: {
    flex: 1, flexDirection: 'column', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 6, gap: 3,
  },
  k: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700' },
  v: { color: '#fff', fontSize: 12, fontWeight: '900' },
  noteText: { color: 'rgba(255,255,255,0.78)', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  feedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  dbHint: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700', fontStyle: 'italic', marginLeft: 'auto' },
  eventRow: { flexDirection: 'row', gap: 10, minHeight: 52 },
  eventLeft: { width: 26, alignItems: 'center', paddingTop: 2 },
  eventDot: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  eventLine: { width: 1.5, flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 4, borderRadius: 1 },
  eventContent: { flex: 1, paddingBottom: 12 },
  eventLabelRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 },
  eventLabel: { color: '#fff', fontSize: 13, fontWeight: '800', flex: 1 },
  eventTime: { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '700', marginTop: 1 },
  eventTracking: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800', marginTop: 1, letterSpacing: 0.3 },
  eventDetail: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600', marginTop: 3, lineHeight: 15 },
  showMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    marginTop: 8, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10,
  },
  showMoreText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '800' },
});


