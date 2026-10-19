/** ROS map_server metadata for hoca_kati (must match assets/maps/hoca_kati.yaml + PNG size). */
export const HOCA_KATI_MAP = {
  resolution: 0.05,
  originX: -21.2,
  originY: -10.0,
  originYaw: 0,
  widthPx: 608,
  heightPx: 832,
} as const;

export type HocaKatiMapSpec = typeof HOCA_KATI_MAP;
