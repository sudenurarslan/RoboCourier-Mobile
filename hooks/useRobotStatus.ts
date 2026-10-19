import { subscribeRosBridge, subscribeRobotStatus } from '@/src/services/ros';
import type {
  OfflineDetail,
  RobotOperationalStatus,
  RobotStatusPayload,
  RosBridgeConnection,
} from '@/src/types/robotStatus';
import { parseRobotStatusJson } from '@/src/utils/parseRobotStatus';
import { useEffect, useMemo, useState } from 'react';

/** Bağlıyken bu süre mesaj gelmezse veri "offline" sayılır */
const STALE_MS = 7500;

const TICK_MS = 500;

export type UseRobotStatusResult = {
  bridge: RosBridgeConnection;
  payload: RobotStatusPayload | null;
  effectiveStatus: RobotOperationalStatus;
  /** WS kopması mı, veri kesilmesi mi — çakışmayı önlemek için */
  offlineDetail: OfflineDetail;
  lastMessageAt: number | null;
  hadParseError: boolean;
};

function mapBridgeEvent(e: 'connected' | 'disconnected' | 'error'): RosBridgeConnection {
  if (e === 'connected') return 'connected';
  return 'disconnected';
}

export function useRobotStatus(): UseRobotStatusResult {
  const [bridge, setBridge] = useState<RosBridgeConnection>('connecting');
  const [hasEverConnected, setHasEverConnected] = useState(false);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [payload, setPayload] = useState<RobotStatusPayload | null>(null);
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(0);
  const [hadParseError, setHadParseError] = useState(false);

  useEffect(() => {
    const unsubBridge = subscribeRosBridge((ev: 'connected' | 'disconnected' | 'error') => {
      if (ev === 'connected') {
        setHasEverConnected(true);
        setConnectedAt(Date.now());
      } else {
        setConnectedAt(null);
      }
      setBridge(mapBridgeEvent(ev));
    });

    const unsubTopic = subscribeRobotStatus((raw: string) => {
      const parsed = parseRobotStatusJson(raw);
      if (parsed == null) {
        setHadParseError(true);
        return;
      }
      setHadParseError(false);
      setPayload(parsed);
      setLastMessageAt(Date.now());
    });

    const id = setInterval(() => setNowTick((n) => n + 1), TICK_MS);

    return () => {
      unsubBridge();
      unsubTopic();
      clearInterval(id);
    };
  }, []);

  const dataStale = useMemo(() => {
    if (bridge !== 'connected') return false;
    const now = Date.now();
    if (lastMessageAt != null) {
      return now - lastMessageAt > STALE_MS;
    }
    if (connectedAt == null) return false;
    return now - connectedAt > STALE_MS;
  }, [bridge, lastMessageAt, connectedAt, nowTick]);

  const offlineDetail: OfflineDetail = useMemo(() => {
    if (bridge === 'connecting') return hasEverConnected ? 'reconnecting' : null;
    if (bridge === 'disconnected') return 'websocket';
    if (bridge === 'connected' && dataStale) return 'stale';
    return null;
  }, [bridge, dataStale, hasEverConnected]);

  const effectiveStatus: RobotOperationalStatus = useMemo(() => {
    if (bridge === 'disconnected') return 'offline';
    // Bağlanma sürecinde "offline" demek kullanıcıya yanıltıcı oluyor;
    // özellikle ilk payload gelene kadar.
    if (bridge === 'connecting') return payload?.status ?? 'idle';
    if (bridge === 'connected' && dataStale) return 'offline';
    if (bridge === 'connected' && !dataStale && payload == null) return 'idle';
    return payload?.status ?? 'offline';
  }, [bridge, dataStale, payload]);

  return {
    bridge,
    payload,
    effectiveStatus,
    offlineDetail,
    lastMessageAt,
    hadParseError,
  };
}
