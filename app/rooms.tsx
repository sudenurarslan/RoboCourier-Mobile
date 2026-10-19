import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetchJson } from '@/lib/api';
import { useLanguage } from '@/providers/language';
import { useAppTheme } from '@/providers/theme';

type Room = {
  id: number;
  roomNumber: string;
  floor?: string;
  description?: string;
  mapX?: number;
  mapY?: number;
  isActive: boolean;
};

type ApiRoom = {
  id: string;
  room_number: string;
  floor: string | null;
  description: string | null;
  map_x: number | null;
  map_y: number | null;
  is_active: boolean;
};

export default function RoomsScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [roomsAll, setRoomsAll] = useState<Room[]>([]);
  const [error, setError] = useState<string>('');
  const { effectiveColorScheme } = useAppTheme();
  const isDarkMode = effectiveColorScheme === 'dark';
  const { t } = useLanguage();

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError('');
        const res = await apiFetchJson<ApiRoom[]>('/rooms');
        if (cancelled) return;
        setRoomsAll(
          res.map((r) => ({
            id: Number(r.id),
            roomNumber: r.room_number,
            floor: r.floor ?? undefined,
            description: r.description ?? undefined,
            mapX: r.map_x ?? undefined,
            mapY: r.map_y ?? undefined,
            isActive: r.is_active,
          }))
        );
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t('loadFailed'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roomsAll;
    return roomsAll.filter((r) => {
      return (
        r.roomNumber.toLowerCase().includes(q) ||
        (r.floor ?? '').toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [query, roomsAll]);

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
              <Text style={styles.title}>{t('rooms')}</Text>
              <Text style={styles.subtitle}>{t('roomsSubtitle')}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <MaterialIcons name="search" size={18} color="#eaf2ff" />
              <Text style={styles.sectionTitle}>{t('search')}</Text>
            </View>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('roomsSearchPlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.55)"
              style={styles.input}
            />
          </View>

          <View style={styles.list}>
            {error ? (
              <View style={styles.item}>
                <Text style={styles.itemBody}>{error}</Text>
              </View>
            ) : null}
            {rooms.map((r) => (
              <View key={r.id} style={styles.item}>
                <View style={styles.rowBetween}>
                  <Text style={styles.itemTitle}>{`${t('room')} ${r.roomNumber}`}</Text>
                  <View style={[styles.pill, r.isActive ? styles.pillActive : styles.pillInactive]}>
                    <Text style={styles.pillText}>{r.isActive ? t('active') : t('inactive')}</Text>
                  </View>
                </View>
                <Text style={styles.itemBody}>{r.description ?? '—'}</Text>
                <Text style={styles.itemMeta}>
                  {`${t('floor')} ${r.floor ?? '-'} • map_x=${r.mapX ?? '—'} • map_y=${r.mapY ?? '—'}`}
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.card, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
            <View style={styles.row}>
              <MaterialIcons name="info-outline" size={18} color="#eaf2ff" />
              <Text style={styles.sectionTitle}>{t('apiHookupLater')}</Text>
            </View>
            <Text style={styles.noteText}>
              {t('roomsDBHint')}
            </Text>
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
  backText: { color: '#fff', fontWeight: '900', fontSize: 12 },
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
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  sectionTitle: { color: '#fff', fontSize: 13, fontWeight: '900' },
  input: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  list: { gap: 10 },
  item: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    borderWidth: 1.25,
    borderColor: 'rgba(255,255,255,0.20)',
    padding: 16,
  },
  itemTitle: { color: '#fff', fontSize: 13, fontWeight: '900' },
  itemBody: { color: 'rgba(255,255,255,0.82)', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  itemMeta: { marginTop: 8, color: 'rgba(255,255,255,0.68)', fontSize: 11, fontWeight: '700' },
  pill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  pillActive: { backgroundColor: 'rgba(34,197,94,0.16)', borderColor: 'rgba(34,197,94,0.42)' },
  pillInactive: { backgroundColor: 'rgba(148,163,184,0.16)', borderColor: 'rgba(148,163,184,0.42)' },
  pillText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  noteText: { marginTop: 8, color: 'rgba(255,255,255,0.82)', fontSize: 12, lineHeight: 17, fontWeight: '600' },
});


