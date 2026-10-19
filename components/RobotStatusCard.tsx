import type { UseRobotStatusResult } from '@/hooks/useRobotStatus';
import { ROBOT_STATUS_COLORS } from '@/src/constants/robotStatusColors';
import { ROSBRIDGE_URL } from '@/src/services/ros';
import type { OfflineDetail, RobotOperationalStatus } from '@/src/types/robotStatus';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

function offlineHint(d: OfflineDetail): string | null {
  switch (d) {
    case 'websocket':
      return 'ROSBridge bağlantısı kapalı (yeniden bağlanma deneniyor)';
    case 'stale':
      return 'Bağlantı açık ama süre içinde veri gelmedi (timeout)';
    case 'reconnecting':
      return 'Yeniden bağlanıyor…';
    default:
      return null;
  }
}

function bridgeLabel(bridge: UseRobotStatusResult['bridge']): { text: string; color: string } {
  switch (bridge) {
    case 'connecting':
      return { text: 'Bağlanıyor…', color: '#fbbf24' };
    case 'connected':
      return { text: 'Bağlı (ROSBridge)', color: '#86efac' };
    default:
      return { text: 'Bağlantı kesildi', color: '#fca5a5' };
  }
}

function formatLastUpdate(
  payload: UseRobotStatusResult['payload'],
  lastMessageAt: number | null,
  bridge: UseRobotStatusResult['bridge']
): string {
  if (bridge !== 'connected') return '—';
  if (payload?.timestamp) return payload.timestamp;
  if (lastMessageAt != null) return new Date(lastMessageAt).toLocaleString();
  return '—';
}

export function RobotStatusCard({ status }: { status: UseRobotStatusResult }) {
  const { bridge, payload, effectiveStatus, offlineDetail, hadParseError } = status;
  const theme =
    ROBOT_STATUS_COLORS[effectiveStatus as RobotOperationalStatus] ?? ROBOT_STATUS_COLORS.offline;
  const conn = bridgeLabel(bridge);
  const hint = offlineHint(offlineDetail);

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={[styles.statusDot, { backgroundColor: theme.dot }]} />
          <Text style={styles.cardTitle}>Canlı robot durumu</Text>
        </View>
        <View style={[styles.connPill, { borderColor: conn.color + '55' }]}>
          <MaterialIcons
            name={bridge === 'connected' ? 'wifi' : bridge === 'connecting' ? 'sync' : 'wifi-off'}
            size={14}
            color={conn.color}
          />
          <Text style={[styles.connText, { color: conn.color }]}>{conn.text}</Text>
        </View>
      </View>

      <View style={[styles.statusBanner, { backgroundColor: theme.accent + '22', borderColor: theme.border }]}>
        <View style={styles.statusTextCol}>
          <View style={styles.statusTitleRow}>
            <Text style={[styles.statusMain, { color: theme.accent }]}>{theme.labelTr}</Text>
            <Text style={styles.statusRaw}>({effectiveStatus})</Text>
          </View>
          {hint ? <Text style={styles.offlineHint}>{hint}</Text> : null}
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.cell}>
          <Text style={styles.k}>Robot ID</Text>
          <Text style={styles.v}>{payload?.robot_id ?? '—'}</Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.k}>Batarya</Text>
          <Text style={styles.v}>{payload != null ? `${Math.round(payload.battery)}%` : '—'}</Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.k}>Konum</Text>
          <Text style={styles.v} numberOfLines={2}>
            {payload?.location ?? '—'}
          </Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.k}>Teslimat ID</Text>
          <Text style={styles.v}>{payload?.delivery_id != null ? String(payload.delivery_id) : '—'}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <MaterialIcons name="schedule" size={14} color="rgba(255,255,255,0.55)" />
        <Text style={styles.footerText}>
          Son güncelleme: {formatLastUpdate(payload, status.lastMessageAt, bridge)}
        </Text>
      </View>

      <Text style={styles.hint} numberOfLines={2}>
        ROSBridge: {ROSBRIDGE_URL}
      </Text>
      {hadParseError ? (
        <Text style={styles.warn}>Son mesaj geçersiz veya eksik alan içerdi; önceki geçerli veri korunur.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '900' },
  connPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  connText: { fontSize: 10, fontWeight: '800' },
  statusBanner: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  statusTextCol: { gap: 6 },
  statusTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  statusMain: { fontSize: 16, fontWeight: '900' },
  statusRaw: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '700' },
  offlineHint: { color: 'rgba(255,255,255,0.72)', fontSize: 11, fontWeight: '600', lineHeight: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  k: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '700' },
  v: { color: '#fff', fontSize: 13, fontWeight: '800' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  footerText: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600', flex: 1 },
  hint: { marginTop: 8, color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '600' },
  warn: { marginTop: 6, color: '#fcd34d', fontSize: 11, fontWeight: '600' },
});

