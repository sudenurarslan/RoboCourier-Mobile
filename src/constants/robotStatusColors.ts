import type { RobotOperationalStatus } from '@/src/types/robotStatus';

/** Tek kaynak: durum → renk (UI + gelecekteki çoklu robot kartları için) */
export const ROBOT_STATUS_COLORS: Record<
  RobotOperationalStatus,
  { labelTr: string; accent: string; border: string; dot: string }
> = {
  idle: { labelTr: 'Beklemede', accent: '#9ca3af', border: 'rgba(156,163,175,0.45)', dot: '#9ca3af' },
  moving: { labelTr: 'Hareket', accent: '#3b82f6', border: 'rgba(59,130,246,0.45)', dot: '#3b82f6' },
  delivering: { labelTr: 'Teslimat', accent: '#f97316', border: 'rgba(249,115,22,0.45)', dot: '#f97316' },
  arrived: { labelTr: 'Varış', accent: '#22c55e', border: 'rgba(34,197,94,0.45)', dot: '#22c55e' },
  error: { labelTr: 'Hata', accent: '#ef4444', border: 'rgba(239,68,68,0.45)', dot: '#ef4444' },
  offline: { labelTr: 'Çevrimdışı', accent: '#1f2937', border: 'rgba(31,41,55,0.65)', dot: '#1f2937' },
};

