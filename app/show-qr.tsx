import { apiFetchJson } from '@/lib/api';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useAppTheme } from '@/providers/theme';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type QRStatus = 'ready' | 'shown' | 'error';

const QRCodeComponent: null | React.ComponentType<{ value: string; size?: number; backgroundColor?: string; color?: string }> = (() => {
  try {
    // Optional dependency. If not installed, we fall back to a text placeholder.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-qrcode-svg');
    return (mod?.default ?? mod) as any;
  } catch {
    return null;
  }
})();

export default function ShowQrToRobotScreen() {
  const router = useRouter();
  const { trackingCode } = useLocalSearchParams<{ trackingCode?: string }>();
  const [status, setStatus] = useState<QRStatus>('ready');
  const { effectiveColorScheme } = useAppTheme();
  const isDarkMode = effectiveColorScheme === 'dark';

  const [qrValue, setQrValue] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const deliveryCode = useMemo(() => (trackingCode ? trackingCode.trim() : ''), [trackingCode]);

  const fetchQr = React.useCallback(async () => {
    const code = deliveryCode.trim();
    if (!code) {
      setStatus('error');
      setError('Please open this screen from a delivery (tracking code missing).');
      setQrValue('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Backend returns { qr_value } (raw, one-time) + qr_hash, expires_at ...
      const qr = await apiFetchJson<{ qr_value: string }>(
        `/deliveries/${encodeURIComponent(code)}/qr?ttlSeconds=300`
      );
      setQrValue(qr.qr_value);
      setStatus('ready');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'QR load failed');
      setQrValue('');
    } finally {
      setLoading(false);
    }
  }, [deliveryCode]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      // Only auto-fetch when this screen is opened from a delivery (trackingCode param provided).
      if (trackingCode) await fetchQr();
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchQr, trackingCode]);

  return (
    <LinearGradient colors={isDarkMode ? ['#020617', '#0f172a', '#020617'] : ['#0b2a6a', '#2563eb', '#0ea5e9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => router.back()} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={18} color="#fff" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Show QR to Robot</Text>
              <Text style={styles.subtitle}>
                Receiver flow: the robot’s camera scans the QR displayed on your phone to unlock/confirm delivery.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <MaterialIcons name="qr-code" size={18} color="#eaf2ff" />
              <Text style={styles.sectionTitle}>One‑time QR</Text>
            </View>

            {!trackingCode ? (
              <View style={styles.missingContextCard}>
                <Text style={styles.helpText}>
                  Select a delivery first, then open “Show QR to Robot” from its detail screen.
                </Text>
                <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/deliveries')} style={styles.secondaryBtn}>
                  <MaterialIcons name="list-alt" size={18} color="#fff" />
                  <Text style={styles.secondaryText}>Go to Deliveries</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.qrBox}>
              {loading ? (
                <ActivityIndicator size="large" color="#0b2a6a" />
              ) : error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : qrValue ? (
                <>
                  {QRCodeComponent ? (
                    <QRCodeComponent value={qrValue} size={220} backgroundColor="#ffffff" color="#0b2a6a" />
                  ) : (
                    <>
                      <Text style={styles.qrPlaceholderTitle}>QR PLACEHOLDER</Text>
                      <Text style={styles.qrValue}>{qrValue}</Text>
                      <Text style={styles.qrHint}>(Install `react-native-qrcode-svg` to render QR)</Text>
                    </>
                  )}
                  <Text style={styles.qrHint}>Displayed code: one-time use, time-limited</Text>
                  <Text selectable style={styles.qrValueInline}>{qrValue}</Text>
                </>
              ) : (
                <Text style={styles.errorText}>No QR available</Text>
              )}
            </View>

            <Text style={styles.helpText}>
              - Increase your screen brightness{'\n'}
              - Hold the phone steady ~20–30cm from the robot camera{'\n'}
              - If QR expires, request a new one
            </Text>

            {trackingCode ? (
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => {
                    fetchQr();
                  }}
                  style={styles.secondaryBtn}
                >
                  <MaterialIcons name="refresh" size={18} color="#fff" />
                  <Text style={styles.secondaryText}>Refresh</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => {
                    // TODO(API): polling/WS: robot confirmed scan -> mark used_at/completed_at
                    setStatus('shown');
                  }}
                  style={styles.primaryBtn}
                >
                  <LinearGradient colors={['#22c55e', '#16a34a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradient}>
                    <MaterialIcons name="check" size={18} color="#fff" />
                    <Text style={styles.primaryText}>Robot scanned</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <View
            style={[
              styles.card,
              status === 'shown'
                ? { backgroundColor: 'rgba(34,197,94,0.16)', borderColor: 'rgba(34,197,94,0.42)' }
                : status === 'error'
                  ? { backgroundColor: 'rgba(239,68,68,0.16)', borderColor: 'rgba(239,68,68,0.42)' }
                  : { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.20)' },
            ]}
          >
            <View style={styles.row}>
              <MaterialIcons
                name={status === 'shown' ? 'check-circle-outline' : status === 'error' ? 'error-outline' : 'info-outline'}
                size={18}
                color="#eaf2ff"
              />
              <Text style={styles.sectionTitle}>Status</Text>
            </View>
            <Text style={styles.helpText}>
              {status === 'shown'
                ? 'Waiting for backend confirmation (delivery completed).'
                : status === 'error'
                  ? 'QR invalid/expired.'
                  : 'Ready to show QR.'}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
            <View style={styles.row}>
              <MaterialIcons name="security" size={18} color="#eaf2ff" />
              <Text style={styles.sectionTitle}>DB mapping</Text>
            </View>
            <Text style={styles.helpText}>
              {/* schema refs: delivery_qr_codes(qr_value, hashed_value, expires_at, used_at) */}
              This screen will use `delivery_qr_codes` with one-time & expirable QR values.
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
    alignItems: 'flex-start',
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
    fontSize: 22,
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
  sectionTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  missingContextCard: {
    marginTop: 10,
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  qrBox: {
    marginTop: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  qrPlaceholderTitle: {
    color: '#0b2a6a',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 10,
    letterSpacing: 0.4,
  },
  qrValue: {
    color: '#0b2a6a',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  qrHint: {
    color: '#0b2a6a',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
  },
  qrValueInline: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(11,42,106,0.08)',
    color: '#0b2a6a',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  errorText: {
    color: '#b91c1c',
    fontWeight: '800',
    textAlign: 'center',
  },
  helpText: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
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
  primaryBtn: {
    flex: 1,
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
});


