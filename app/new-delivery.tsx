import { apiFetchJson } from '@/lib/api';
import { useAuth } from '@/providers/auth';
import { useLanguage } from '@/providers/language';
import { useAppTheme } from '@/providers/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Room = {
  id: number;
  roomNumber: string;
  floor?: string;
  description?: string;
};

type UserLite = {
  id: number;
  fullName: string;
  email: string;
  role: 'receiver' | 'sender' | 'admin';
};

type ApiRoom = {
  id: string;
  room_number: string;
  floor: string | null;
  description: string | null;
};

type ApiUser = {
  id: string;
  full_name: string;
  email: string;
  role: 'sender' | 'receiver' | 'admin';
};

export default function NewDeliveryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [receiverId, setReceiverId] = useState<number | null>(null);
  const [pickupRoomId, setPickupRoomId] = useState<number | null>(null);
  const [dropoffRoomId, setDropoffRoomId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [receivers, setReceivers] = useState<UserLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const { effectiveColorScheme } = useAppTheme();
  const isDarkMode = effectiveColorScheme === 'dark';

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const [roomsRes, usersRes] = await Promise.all([
          apiFetchJson<ApiRoom[]>('/rooms'),
          apiFetchJson<ApiUser[]>('/users?role=receiver'),
        ]);
        if (cancelled) return;
        const mappedRooms: Room[] = roomsRes.map((r) => ({
          id: Number(r.id),
          roomNumber: r.room_number,
          floor: r.floor ?? undefined,
          description: r.description ?? undefined,
        }));
        const mappedReceivers: UserLite[] = usersRes.map((u) => ({
          id: Number(u.id),
          fullName: u.full_name,
          email: u.email,
          role: u.role,
        }));
        setRooms(mappedRooms);
        setReceivers(mappedReceivers);
        setReceiverId((prev) => prev ?? mappedReceivers[0]?.id ?? null);
        setPickupRoomId((prev) => prev ?? mappedRooms[0]?.id ?? null);
        setDropoffRoomId((prev) => prev ?? mappedRooms[0]?.id ?? null);
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
  }, []);

  const receiver = useMemo(() => receivers.find((u) => u.id === receiverId) ?? null, [receivers, receiverId]);
  const pickupRoom = useMemo(() => rooms.find((r) => r.id === pickupRoomId) ?? null, [rooms, pickupRoomId]);
  const dropoffRoom = useMemo(() => rooms.find((r) => r.id === dropoffRoomId) ?? null, [rooms, dropoffRoomId]);

  const canContinue = Boolean(receiver && pickupRoom && dropoffRoom);

  return (
    <LinearGradient colors={isDarkMode ? ['#020617', '#0f172a', '#020617'] : ['#0b2a6a', '#2563eb', '#0ea5e9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <MaterialIcons name="chevron-left" size={28} color="#fff" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{t('newDelivery')}</Text>
                <Text style={styles.subtitle}>
                  {t('newDeliverySubtitle')}
                </Text>
              </View>
            </View>

            {loading ? (
              <View style={styles.card}>
                <Text style={styles.summaryText}>{t('loading')}</Text>
              </View>
            ) : null}

            {error ? (
              <View style={styles.card}>
                <Text style={styles.summaryText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.card}>
              <View style={styles.row}>
                <MaterialIcons name="person-outline" size={18} color="#eaf2ff" />
                <Text style={styles.cardTitle}>{t('receiver')}</Text>
              </View>

              <View style={styles.optionGroup}>
                {receivers.map((u) => {
                  const selected = u.id === receiverId;
                  return (
                    <TouchableOpacity
                      key={u.id}
                      activeOpacity={0.9}
                      onPress={() => setReceiverId(u.id)}
                      style={[
                        styles.option,
                        selected && (isDarkMode ? styles.optionSelectedDark : styles.optionSelected)
                      ]}
                    >
                      <Text style={styles.optionTitle}>{u.fullName}</Text>
                      <Text style={styles.optionHint}>{u.email}</Text>
                      {selected ? <MaterialIcons name="check-circle" size={18} color={isDarkMode ? '#3b82f6' : '#22c55e'} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={[styles.card, styles.gridCard]}>
                <View style={styles.row}>
                  <MaterialIcons name="place" size={18} color="#eaf2ff" />
                  <Text style={styles.cardTitle}>{t('pickupRoom')}</Text>
                </View>
                <View style={styles.optionGroup}>
                  {rooms.map((r) => {
                    const selected = r.id === pickupRoomId;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        activeOpacity={0.9}
                        onPress={() => setPickupRoomId(r.id)}
                        style={[
                          styles.optionCompact,
                          selected && (isDarkMode ? styles.optionSelectedDark : styles.optionSelected)
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.optionTitle}>{`${t('room')} ${r.roomNumber}`}</Text>
                          <Text style={styles.optionHint}>{r.description ?? `${t('floor')} ${r.floor ?? '-'}`}</Text>
                        </View>
                        {selected ? <MaterialIcons name="check" size={18} color={isDarkMode ? '#3b82f6' : '#22c55e'} /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={[styles.card, styles.gridCard]}>
                <View style={styles.row}>
                  <MaterialIcons name="flag" size={18} color="#eaf2ff" />
                  <Text style={styles.cardTitle}>{t('dropoffRoom')}</Text>
                </View>
                <View style={styles.optionGroup}>
                  {rooms.map((r) => {
                    const selected = r.id === dropoffRoomId;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        activeOpacity={0.9}
                        onPress={() => setDropoffRoomId(r.id)}
                        style={[
                          styles.optionCompact,
                          selected && (isDarkMode ? styles.optionSelectedDark : styles.optionSelected)
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.optionTitle}>{`${t('room')} ${r.roomNumber}`}</Text>
                          <Text style={styles.optionHint}>{r.description ?? `${t('floor')} ${r.floor ?? '-'}`}</Text>
                        </View>
                        {selected ? <MaterialIcons name="check" size={18} color={isDarkMode ? '#3b82f6' : '#22c55e'} /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.row}>
                <MaterialIcons name="description" size={18} color="#eaf2ff" />
                <Text style={styles.cardTitle}>{t('descriptionOptional')}</Text>
              </View>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder={t('descriptionPlaceholder')}
                placeholderTextColor="rgba(255,255,255,0.55)"
                style={styles.textArea}
                multiline
              />
            </View>

            <View style={styles.card}>
              <View style={styles.row}>
                <MaterialIcons name="checklist" size={18} color="#eaf2ff" />
                <Text style={styles.cardTitle}>{t('summary')}</Text>
              </View>
              <Text style={styles.summaryText}>
                {t('receiver')}: <Text style={styles.bold}>{receiver?.fullName ?? '-'}</Text>{'\n'}
                {t('pickupRoom')}: <Text style={styles.bold}>{pickupRoom ? `${t('room')} ${pickupRoom.roomNumber}` : '-'}</Text>{'\n'}
                {t('dropoffRoom')}: <Text style={styles.bold}>{dropoffRoom ? `${t('room')} ${dropoffRoom.roomNumber}` : '-'}</Text>
              </Text>
              <Text style={styles.summaryHint}>
                {t('summaryHint')}
              </Text>
            </View>

            <View style={styles.footerRow}>

              <TouchableOpacity
                activeOpacity={0.9}
                disabled={!canContinue}
                onPress={() => {
                  (async () => {
                    if (!user) return;
                    const created = await apiFetchJson<{ tracking_code: string }>(`/deliveries`, {
                      method: 'POST',
                      body: JSON.stringify({
                        senderId: user.id,
                        receiverId,
                        pickupRoomId,
                        dropoffRoomId,
                        description,
                      }),
                    });
                    router.push({ pathname: '/delivery/[trackingCode]', params: { trackingCode: created.tracking_code } });
                  })().catch((e) => setError(e instanceof Error ? e.message : t('createFailed')));
                }}
                style={[styles.primaryBtn, !canContinue && { opacity: 0.6 }]}
              >
                <LinearGradient
                  colors={isDarkMode ? ['#3b82f6', '#1d4ed8'] : ['#22c55e', '#16a34a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryGradient}
                >
                  <Text style={styles.primaryBtnText}>{t('continue')}</Text>
                  <MaterialIcons name="arrow-forward" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
    justifyContent: 'flex-start',
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
  row: {
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
  optionGroup: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  optionSelected: {
    borderColor: 'rgba(34,197,94,0.65)',
    backgroundColor: 'rgba(34,197,94,0.12)',
  },
  optionSelectedDark: {
    borderColor: 'rgba(59,130,246,0.65)',
    backgroundColor: 'rgba(59,130,246,0.2)',
  },
  optionTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    flex: 1,
  },
  optionHint: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  textArea: {
    minHeight: 84,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  summaryText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  bold: {
    color: '#fff',
    fontWeight: '900',
  },
  summaryHint: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
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
  primaryBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryGradient: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
  },
});


