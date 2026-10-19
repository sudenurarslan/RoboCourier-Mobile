/** ROS tarafından yayınlanan durumlar (offline istemcide üretilir) */
export type RosPublishedStatus = 'idle' | 'moving' | 'delivering' | 'arrived' | 'error';

export type RobotOperationalStatus = RosPublishedStatus | 'offline';

export type RosBridgeConnection = 'connecting' | 'connected' | 'disconnected';

/** Neden robot "offline" görünüyor — WS kopması ile veri kesilmesini ayırır */
export type OfflineDetail = null | 'websocket' | 'stale' | 'reconnecting';

export type RobotStatusPayload = {
  robot_id: string;
  status: RosPublishedStatus;
  battery: number;
  location: string;
  delivery_id: number | null;
  timestamp: string;
};

