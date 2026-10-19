import { apiFetchJson } from '@/lib/api';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useLanguage } from '@/providers/language';
import { useAppTheme } from '@/providers/theme';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type QRStatus = 'idle' | 'verifying' | 'success' | 'error';

export default function ScanQrScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [qrInput, setQrInput] = useState('');
  const [status, setStatus] = useState<QRStatus>('idle');
  const [message, setMessage] = useState<string>('');

  const { effectiveColorScheme } = useAppTheme();
  const isDarkMode = effectiveColorScheme === 'dark';

  const canVerify = qrInput.trim().length > 6 && status !== 'verifying';

  const statusTone = useMemo(() => {
    if (status === 'success') return { bg: 'rgba(34,197,94,0.16)', border: 'rgba(34,197,94,0.42)' };
    if (status === 'error') return { bg: 'rgba(239,68,68,0.16)', border: 'rgba(239,68,68,0.42)' };
    return { bg: 'rgba(255,255,255,0.12)', border: 'rgba(255,255,255,0.20)' };
  }, [status]);

  const verify = async () => {
    setStatus('verifying');
    setMessage('');

    try {
      const trimmed = qrInput.trim();
      const isSha256Hex = /^[a-f0-9]{64}$/i.test(trimmed);
      await apiFetchJson<{ ok: boolean }>(`/delivery_qr_codes/verify`, {
        method: 'POST',
        // Backend supports either { qrHash } or { qrValue }.
        body: JSON.stringify(isSha256Hex ? { qrHash: trimmed } : { qrValue: trimmed }),
      });
      setStatus('success');
      setMessage(t('boxUnlocked'));
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : t('verificationFailed'));
    }
  };

  return (
    <LinearGradient colors={isDarkMode ? ['#020617', '#0f172a', '#020617'] : ['#0b2a6a', '#2563eb', '#0ea5e9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <TouchableOpacity activeOpacity={0.9} onPress={() => router.back()} style={styles.backBtn}>
                <MaterialIcons name="chevron-left" size={28} color="#fff" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{t('scanToUnlock')}</Text>
                <Text style={styles.subtitle}>
                  {t('scanToUnlockSubtitle')}
                </Text>
              </View>
            </View>

            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={styles.heroIcon}>
                  <MaterialIcons name="qr-code-scanner" size={20} color="#0b2a6a" />
                </View>
                <Text style={styles.heroTitle}>{t('qrVerification')}</Text>
              </View>
              <Text style={styles.heroSubtitle}>
                {/* PDF Figure 6: Receiver Pickup / Scan to Unlock */}
                {t('pasteQRValue')}
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.row}>
                <MaterialIcons name="qr-code" size={18} color="#eaf2ff" />
                <Text style={styles.sectionTitle}>{t('qrValue')}</Text>
              </View>
              <TextInput
                value={qrInput}
                onChangeText={setQrInput}
                autoCapitalize="none"
                placeholder={t('qrPlaceholder')}
                placeholderTextColor="rgba(255,255,255,0.55)"
                style={styles.input}
              />

              <TouchableOpacity
                activeOpacity={0.9}
                disabled={!canVerify}
                onPress={verify}
                style={[styles.primaryBtn, !canVerify && { opacity: 0.6 }]}
              >
                <LinearGradient colors={['#a855f7', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradient}>
                  <MaterialIcons name={status === 'verifying' ? 'hourglass-top' : 'verified'} size={18} color="#fff" />
                  <Text style={styles.primaryText}>{status === 'verifying' ? t('verifying') : t('verifyUnlock')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={[styles.card, { backgroundColor: statusTone.bg, borderColor: statusTone.border }]}>
              <View style={styles.row}>
                <MaterialIcons
                  name={status === 'success' ? 'check-circle-outline' : status === 'error' ? 'error-outline' : 'info-outline'}
                  size={18}
                  color="#eaf2ff"
                />
                <Text style={styles.sectionTitle}>{t('result')}</Text>
              </View>
              <Text style={styles.noteText}>
                {message || t('waitingForQR')}
              </Text>
              {status === 'success' ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => {
                    router.back();
                  }}
                  style={styles.secondaryBtn}
                >
                  <MaterialIcons name="check" size={18} color="#fff" />
                  <Text style={styles.secondaryText}>{t('done')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={[styles.card, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
              <View style={styles.row}>
                <MaterialIcons name="security" size={18} color="#eaf2ff" />
                <Text style={styles.sectionTitle}>{t('securityNotes')}</Text>
              </View>
              <Text style={styles.noteText}>
                {t('qrSecurityHint')}
              </Text>
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
  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.24)',
    padding: 18,
    marginBottom: 12,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  heroIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
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
  noteText: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
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


