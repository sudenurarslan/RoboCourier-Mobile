import { apiFetchJson } from '@/lib/api';
import { useAuth } from '@/providers/auth';
import { useLanguage } from '@/providers/language';
import { useAppTheme } from '@/providers/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type NotificationItem = {
  id: number;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  channel: 'push' | 'in_app' | 'email' | 'sms';
};

type ApiNotification = {
  id: string;
  channel: string;
  title: string | null;
  body: string | null;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { effectiveColorScheme } = useAppTheme();
  const isDarkMode = effectiveColorScheme === 'dark';

  const [onlyUnread, setOnlyUnread] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useLanguage();

  const filtered = useMemo(() => {
    if (!onlyUnread) return notifications;
    return notifications.filter((n) => !n.isRead);
  }, [onlyUnread, notifications]);

  const load = React.useCallback(
    async ({ silent }: { silent: boolean }) => {
      if (!user) return;
      if (!silent) setRefreshing(true);
      try {
        setError('');
        const res = await apiFetchJson<ApiNotification[]>(`/notifications?user_id=${encodeURIComponent(String(user.id))}`);
        setNotifications(
          res.map((n) => ({
            id: Number(n.id),
            title: n.title ?? 'Notification',
            body: n.body ?? '',
            createdAt: new Date(n.created_at).toLocaleString(),
            isRead: n.is_read,
            channel: (n.channel as any) ?? 'in_app',
          }))
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : t('loadFailed'));
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [user]
  );

  React.useEffect(() => {
    let cancelled = false;
    let timer: any = null;
    (async () => {
      if (!user) return;
      await load({ silent: true });
      // Poll to show newly created notifications without requiring app restart.
      timer = setInterval(() => {
        if (cancelled) return;
        load({ silent: true }).catch(() => { });
      }, 10_000);
    })();
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [load, user]);

  return (
    <LinearGradient colors={isDarkMode ? ['#020617', '#0f172a', '#020617'] : ['#0b2a6a', '#2563eb', '#0ea5e9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ silent: false })} />}
        >
          <View style={styles.header}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => router.back()} style={styles.backBtn}>
              <MaterialIcons name="chevron-left" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t('notifications')}</Text>
              <Text style={styles.subtitle}>{t('notificationsSubtitle')}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={styles.row}>
                <MaterialIcons name="filter-list" size={18} color="#eaf2ff" />
                <Text style={styles.sectionTitle}>{t('filter')}</Text>
              </View>
              <TouchableOpacity activeOpacity={0.9} onPress={() => setOnlyUnread((v) => !v)} style={[styles.chip, onlyUnread && styles.chipSelected]}>
                <Text style={[styles.chipText, onlyUnread && styles.chipTextSelected]}>{onlyUnread ? t('unread') : t('filterAll')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.noteText}>
              {/* TODO(API): PATCH /notifications/:id read */}{"\n"}
              {t('notificationsDBHint')}
            </Text>
          </View>

          <View style={styles.list}>
            {error ? (
              <View style={styles.item}>
                <Text style={styles.itemBody}>{error}</Text>
              </View>
            ) : null}
            {filtered.map((n) => (
              <TouchableOpacity
                key={n.id}
                activeOpacity={0.9}
                onPress={() => {
                  if (n.isRead) return;
                  apiFetchJson(`/notifications/${n.id}/read`, { method: 'PATCH' })
                    .then(() => setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x))))
                    .catch(() => { });
                }}
                style={[styles.item, !n.isRead && styles.itemUnread]}
              >
                <View style={styles.itemTop}>
                  <Text style={styles.itemTitle}>{n.title}</Text>
                  {!n.isRead ? <View style={styles.unreadDot} /> : null}
                </View>
                <Text style={styles.itemBody}>{n.body}</Text>
                <Text style={styles.itemMeta}>{`${n.createdAt} • ${n.channel}`}</Text>
              </TouchableOpacity>
            ))}
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.3 },
  subtitle: { marginTop: 6, color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', lineHeight: 17 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 18,
    borderWidth: 1.25,
    borderColor: 'rgba(255,255,255,0.22)',
    padding: 16,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionTitle: { color: '#fff', fontSize: 13, fontWeight: '900' },
  noteText: { marginTop: 8, color: 'rgba(255,255,255,0.82)', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  chip: {
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  chipSelected: { backgroundColor: 'rgba(34,197,94,0.16)', borderColor: 'rgba(34,197,94,0.42)' },
  chipText: { color: 'rgba(255,255,255,0.82)', fontSize: 11, fontWeight: '800' },
  chipTextSelected: { color: '#fff' },
  list: { gap: 10 },
  item: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    borderWidth: 1.25,
    borderColor: 'rgba(255,255,255,0.20)',
    padding: 16,
  },
  itemUnread: {
    borderColor: 'rgba(59,130,246,0.45)',
    backgroundColor: 'rgba(59,130,246,0.14)',
  },
  itemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  itemTitle: { color: '#fff', fontSize: 13, fontWeight: '900', flex: 1 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#60a5fa' },
  itemBody: { color: 'rgba(255,255,255,0.82)', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  itemMeta: { marginTop: 8, color: 'rgba(255,255,255,0.68)', fontSize: 11, fontWeight: '700' },
});


