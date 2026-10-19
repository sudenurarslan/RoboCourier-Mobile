import type { RobotStatusPayload, RosPublishedStatus } from '@/src/types/robotStatus';

const PUBLISHED: ReadonlySet<string> = new Set<RosPublishedStatus>([
  'idle',
  'moving',
  'delivering',
  'arrived',
  'error',
]);

function isPublishedStatus(s: string): s is RosPublishedStatus {
  return PUBLISHED.has(s);
}

/**
 * std_msgs/String içindeki JSON — zorunlu alanlar: robot_id, status, battery, location.
 * Geçersiz veya eksik veri güvenle yok sayılır (null).
 */
export function parseRobotStatusJson(raw: string): RobotStatusPayload | null {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  try {
    const o = JSON.parse(raw) as unknown;
    if (typeof o !== 'object' || o === null) return null;
    const rec = o as Record<string, unknown>;

    const robotIdRaw = rec.robot_id;
    if (
      !(
        typeof robotIdRaw === 'string' ||
        typeof robotIdRaw === 'number'
      )
    ) {
      return null;
    }
    const robot_id = String(robotIdRaw).trim();
    if (robot_id.length === 0) return null;

    const statusRaw = rec.status;
    if (!(typeof statusRaw === 'string' || typeof statusRaw === 'number')) return null;
    const statusTrim = String(statusRaw).trim();
    if (!isPublishedStatus(statusTrim)) return null;

    const locationRaw = rec.location;
    if (typeof locationRaw !== 'string' && typeof locationRaw !== 'number') return null;
    const location = String(locationRaw).trim();
    if (location.length === 0) return null;

    const batRaw = rec.battery;
    let battery: number | null = null;
    if (typeof batRaw === 'number' && Number.isFinite(batRaw)) {
      battery = batRaw;
    } else if (typeof batRaw === 'string') {
      const n = Number(batRaw);
      if (Number.isFinite(n)) battery = n;
    }
    if (battery == null || battery < 0 || battery > 100) return null;

    let delivery_id: number | null = null;
    const deliveryRaw = rec.delivery_id;
    if (deliveryRaw != null) {
      if (typeof deliveryRaw === 'number' && Number.isFinite(deliveryRaw)) {
        delivery_id = deliveryRaw;
      } else if (typeof deliveryRaw === 'string') {
        const n = Number(deliveryRaw);
        if (Number.isFinite(n)) delivery_id = n;
        else return null;
      } else {
        return null;
      }
    }

    // timestamp bazen string dışı gelebilir; UI sadece stringify gösterecek.
    if (rec.timestamp != null && typeof rec.timestamp !== 'string' && typeof rec.timestamp !== 'number') return null;

    return {
      robot_id,
      status: statusTrim,
      battery,
      location,
      delivery_id,
      timestamp: rec.timestamp == null ? '' : String(rec.timestamp),
    };
  } catch {
    return null;
  }
}

