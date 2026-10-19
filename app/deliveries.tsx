import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetchJson } from '@/lib/api';
import { useAuth } from '@/providers/auth';
import { useLanguage } from '@/providers/language';
import { useAppTheme } from '@/providers/theme';

type DeliveryStatus =
  | 'pending'
  | 'waiting_pickup'
  | 'in_progress'
  | 'arrived_receiver'
  | 'completed'
  | 'cancelled'
  | 'failed';

type DeliveryListItem = {
  trackingCode: string;
  receiverName: string;
  pickupRoom: string;
  dropoffRoom: string;
  status: DeliveryStatus;
  createdAt: string;
};

type ApiDeliveryListItem = {
  tracking_code: string;
  receiver_full_name: string;
  pickup_room_number: string;
  dropoff_room_number: string;
  status: DeliveryStatus;
  created_at: string;
};

const STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: 'pendingStatus',
  waiting_pickup: 'waitingPickupStatus',
  in_progress: 'inProgressStatus',
  arrived_receiver: 'arrivedReceiverStatus',
  completed: 'completedStatus',
  cancelled: 'cancelledStatus',
  failed: 'failedStatus',
};

function statusColor(status: DeliveryStatus) {
  switch (status) {
    case 'completed':
      return { bg: 'rgba(34,197,94,0.18)', border: 'rgba(34,197,94,0.45)', text: '#eafff2' };
    case 'in_progress':
      return { bg: 'rgba(59,130,246,0.18)', border: 'rgba(59,130,246,0.45)', text: '#eaf2ff' };
    case 'arrived_receiver':
      return { bg: 'rgba(168,85,247,0.18)', border: 'rgba(168,85,247,0.45)', text: '#f4e9ff' };
    case 'failed':
      return { bg: 'rgba(239,68,68,0.18)', border: 'rgba(239,68,68,0.45)', text: '#ffecec' };
    case 'cancelled':
      return { bg: 'rgba(148,163,184,0.18)', border: 'rgba(148,163,184,0.45)', text: '#f1f5f9' };
    default:
      return { bg: 'rgba(255,255,255,0.14)', border: 'rgba(255,255,255,0.22)', text: '#eaf2ff' };
  }
}

export default function DeliveriesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [filter, setFilter] = useState<'all' | DeliveryStatus>('all');
  const [items, setItems] = useState<DeliveryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const { effectiveColorScheme } = useAppTheme();
  const isDarkMode = effectiveColorScheme === 'dark';

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((d) => d.status === filter);
  }, [filter, items]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const qs =
          user?.role === 'sender'
            ? `?sender_id=${encodeURIComponent(String(user.id))}`
            : user?.role === 'receiver'
              ? `?receiver_id=${encodeURIComponent(String(user.id))}`
              : '';
        const res = await apiFetchJson<ApiDeliveryListItem[]>(`/deliveries${qs}`);
        if (cancelled) return;
        setItems(
          res.map((d) => ({
            trackingCode: d.tracking_code,
            receiverName: d.receiver_full_name,
            pickupRoom: d.pickup_room_number,
            dropoffRoom: d.dropoff_room_number,
            status: d.status,
            createdAt: new Date(d.created_at).toLocaleString(),
          }))
        );
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t('loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  return (
    <LinearGradient colors={isDarkMode ? ['#020617', '#0f172a', '#020617'] : ['#0b2a6a', '#2563eb', '#0ea5e9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <MaterialIcons name="chevron-left" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t('deliveries')}</Text>
              <Text style={styles.subtitle}>{t('deliveriesSubtitle')}</Text>
            </View>
            {user?.role !== 'receiver' ? (
              <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/new-delivery')} style={styles.headerBtn}>
                <MaterialIcons name="add" size={18} color="#fff" />
                <Text style={styles.headerBtnText}>{t('newBtn')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.filters}>
            <FilterChip label={t('filterAll')} selected={filter === 'all'} onPress={() => setFilter('all')} />
            <FilterChip label={t('inProgressStatus')} selected={filter === 'in_progress'} onPress={() => setFilter('in_progress')} />
            <FilterChip label={t('arrivedReceiverStatus')} selected={filter === 'arrived_receiver'} onPress={() => setFilter('arrived_receiver')} />
            <FilterChip label={t('completedStatus')} selected={filter === 'completed'} onPress={() => setFilter('completed')} />
          </View>

          <View style={styles.list}>
            {loading ? (
              <View style={styles.item}>
                <Text style={styles.itemBody}>{t('loading')}</Text>
              </View>
            ) : null}
            {error ? (
              <View style={styles.item}>
                <Text style={styles.itemBody}>{error}</Text>
              </View>
            ) : null}
            {filtered.map((d) => {
              const c = statusColor(d.status);
              return (
                <TouchableOpacity
                  key={d.trackingCode}
                  activeOpacity={0.9}
                  onPress={() => router.push({ pathname: '/delivery/[trackingCode]', params: { trackingCode: d.trackingCode } })}
                  style={styles.item}
                >
                  <View style={styles.itemTop}>
                    <Text style={styles.tracking}>{d.trackingCode}</Text>
                    <View style={[styles.pill, { backgroundColor: c.bg, borderColor: c.border }]}>
                      <Text style={[styles.pillText, { color: c.text }]}>{t(STATUS_LABEL[d.status] as any)}</Text>
                    </View>
                  </View>
                  <Text style={styles.itemBody}>
                    {t('receiver')}: <Text style={styles.bold}>{d.receiverName}</Text> • {d.createdAt}
                  </Text>
                  <Text style={styles.itemBody}>
                    {`${t('pickupRoom')} ${d.pickupRoom} → ${t('dropoffRoom')} ${d.dropoffRoom}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.noteCard}>
            <View style={styles.row}>
              <MaterialIcons name="info-outline" size={18} color="#eaf2ff" />
              <Text style={styles.noteTitle}>{t('apiHookupLater')}</Text>
            </View>
            <Text style={styles.noteText}>
              {t('dbWarningLabel')}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
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
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  headerBtn: {
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
  headerBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  chipSelected: {
    backgroundColor: 'rgba(34,197,94,0.16)',
    borderColor: 'rgba(34,197,94,0.42)',
  },
  chipText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    fontWeight: '800',
  },
  chipTextSelected: {
    color: '#fff',
  },
  list: {
    gap: 10,
  },
  item: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 18,
    borderWidth: 1.25,
    borderColor: 'rgba(255,255,255,0.22)',
    padding: 16,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  tracking: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '900',
  },
  itemBody: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  bold: {
    color: '#fff',
    fontWeight: '900',
  },
  noteCard: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    borderWidth: 1.25,
    borderColor: 'rgba(255,255,255,0.20)',
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  noteTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  noteText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
});


