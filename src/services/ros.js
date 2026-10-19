import * as ROSLIB from "roslib";
import Constants from "expo-constants";
import * as Device from "expo-device";

function getRosbridgeUrl() {
  const env = process.env.EXPO_PUBLIC_ROSBRIDGE_URL;

  if (env && Device.isDevice && /:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(env)) {
    const hostUri =
      Constants.expoConfig?.hostUri ??
      Constants.manifest?.hostUri ??
      Constants.manifest2?.extra?.expoClient?.hostUri;
    const host = typeof hostUri === "string" ? hostUri.split(":")[0] : null;
    if (host) return `ws://${host}:9090`;
  }

  if (env) return env;

  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.manifest?.hostUri ??
    Constants.manifest2?.extra?.expoClient?.hostUri;
  const host = typeof hostUri === "string" ? hostUri.split(":")[0] : null;
  if (host) return `ws://${host}:9090`;

  return "ws://192.168.1.116:9090";
}

/** Expo: kök `.env` içine `EXPO_PUBLIC_ROSBRIDGE_URL=ws://UBUNTU_IP:9090` */
export const ROSBRIDGE_URL = getRosbridgeUrl();

/** Yayınlanacak hedef topic (Nav2 / RViz genelde `/goal_pose`; move_base: `/move_base_simple/goal`) */
export const ROS_GOAL_TOPIC =
  process.env.EXPO_PUBLIC_ROS_GOAL_TOPIC || "/goal_pose";

/**
 * ROS2 json: stamp.sec / stamp.nanosec
 * ROS1 rosbridge: genelde stamp.secs / stamp.nsecs
 * `.env`: EXPO_PUBLIC_ROS_STAMP_ROS2=1 → ROS2 başlık alanları
 */
const STAMP_ROS2 = process.env.EXPO_PUBLIC_ROS_STAMP_ROS2 === "1";

export const ros = new ROSLIB.Ros({
  url: ROSBRIDGE_URL,
});

let coreHooksInstalled = false;

export function initRos({ onConnectionChange } = {}) {
  if (!coreHooksInstalled) {
    coreHooksInstalled = true;
    ros.on("connection", () => {
      console.log("✅ ROSBridge connected:", ROSBRIDGE_URL);
      onConnectionChange?.("connected");
    });
    ros.on("error", (error) => {
      console.log("❌ ROSBridge error:", error);
      onConnectionChange?.("error");
    });
    ros.on("close", () => {
      console.log("⚠️ ROSBridge closed");
      onConnectionChange?.("closed");
    });
  } else if (ros.isConnected) {
    onConnectionChange?.("connected");
  }
  return ros;
}

/** Z ekseni düzlemde 0; yaw radyan (map çerçevesinde baş yönü). */
export function yawToQuaternion(yaw) {
  const half = yaw / 2;
  return {
    x: 0,
    y: 0,
    z: Math.sin(half),
    w: Math.cos(half),
  };
}

function buildHeader(frameId) {
  const t = Date.now() / 1000;
  const sec = Math.floor(t);
  const nsec = Math.round((t - sec) * 1e9);
  if (STAMP_ROS2) {
    return {
      stamp: { sec, nanosec: nsec },
      frame_id: frameId,
    };
  }
  return {
    seq: 0,
    stamp: { secs: sec, nsecs: nsec },
    frame_id: frameId,
  };
}

/**
 * Haritada seçilen hedefi Ubuntu tarafına gönderir (rosbridge → ROS subscriber / Nav2 vb.).
 * @param {{ x: number, y: number, z?: number, yaw?: number, frameId?: string }} pose
 */
export function publishMapGoalPose(pose) {
  const { x, y, z = 0, yaw = 0, frameId = "map" } = pose;
  const topic = new ROSLIB.Topic({
    ros,
    name: ROS_GOAL_TOPIC,
    messageType: "geometry_msgs/PoseStamped",
  });

  const msg = {
    header: buildHeader(frameId),
    pose: {
      position: { x, y, z },
      orientation: yawToQuaternion(yaw),
    },
  };

  topic.publish(msg);
  console.log("📤 goal PoseStamped →", ROS_GOAL_TOPIC, msg.pose.position, "yaw", yaw);
}

export function subscribeChatter(onMessage) {
  const listener = new ROSLIB.Topic({
    ros,
    name: "/chatter",
    messageType: "std_msgs/String",
  });

  listener.subscribe((msg) => {
    console.log("📩 /chatter:", msg.data);
    onMessage?.(msg.data);
  });

  return () => listener.unsubscribe();
}

export function publishChatter(text) {
  const talker = new ROSLIB.Topic({
    ros,
    name: "/chatter",
    messageType: "std_msgs/String",
  });

  talker.publish({ data: text });
  console.log("📤 published to /chatter:", text);
}

/* ── /robot_status (std_msgs/String, JSON) ─────────────────────────────── */

export const ROS_TOPIC_ROBOT_STATUS = "/robot_status";

/**
 * ROSBridge bağlantı olaylarını tek yerden yönetir (singleton).
 * Aynı anda birden fazla component abone olursa duplicate event listener engellenir.
 */
let bridgeListenersAttached = false;
const bridgeCallbacks = new Set();

function emitBridge(event) {
  bridgeCallbacks.forEach((cb) => {
    try {
      cb(event);
    } catch (e) {
      console.warn("[ros] bridge callback error:", e);
    }
  });
}

const RECONNECT_MS = (() => {
  const raw = process.env?.EXPO_PUBLIC_ROSBRIDGE_RECONNECT_MS;
  const n = raw != null ? parseInt(String(raw), 10) : 4000;
  return Number.isFinite(n) ? n : 4000;
})();

let reconnectTimer = null;

// WebSocket "connecting"te takılı kalırsa (bazı cihazlarda close/error hiç gelmiyor)
// UI'nin sonsuza kadar "Bağlanıyor..." altında "offline" görünmesini engellemek için
// bir watchdog ekliyoruz.
const CONNECT_TIMEOUT_MS = (() => {
  const raw = process.env?.EXPO_PUBLIC_ROSBRIDGE_CONNECT_TIMEOUT_MS;
  const n = raw != null ? parseInt(String(raw), 10) : 12000;
  return Number.isFinite(n) ? n : 12000;
})();

let connectWatchdogTimer = null;

function clearConnectWatchdogTimer() {
  if (connectWatchdogTimer != null) {
    clearTimeout(connectWatchdogTimer);
    connectWatchdogTimer = null;
  }
}

function startConnectWatchdog() {
  clearConnectWatchdogTimer();
  connectWatchdogTimer = setTimeout(() => {
    if (!ros.isConnected) {
      console.warn("[ros] connect timeout; forcing reconnect");
      // Hook/UI state'ini güncelle
      emitBridge("disconnected");
      // Transport halen takılıysa yeniden connect dene
      scheduleReconnect();
    }
  }, CONNECT_TIMEOUT_MS);
}

function clearReconnectTimer() {
  if (reconnectTimer != null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect() {
  if (RECONNECT_MS <= 0) return;
  clearReconnectTimer();
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    console.warn("[ros] reconnecting to:", ROSBRIDGE_URL);
    ros.connect(ROSBRIDGE_URL).catch((e) => {
      console.warn("[ros] reconnect failed:", e);
      scheduleReconnect();
    });
  }, RECONNECT_MS);
}

function ensureBridgeListeners() {
  if (bridgeListenersAttached) return;
  bridgeListenersAttached = true;

  ros.on("connection", () => {
    clearReconnectTimer();
    clearConnectWatchdogTimer();
    emitBridge("connected");
  });

  ros.on("error", (error) => {
    console.warn("[ros] transport error:", error);
    emitBridge("error");
  });

  ros.on("close", () => {
    clearConnectWatchdogTimer();
    emitBridge("disconnected");
    scheduleReconnect();
  });
}

/**
 * Bridge olayları: 'connected' | 'disconnected' | 'error'
 * Üst katmanda birden fazla subscribe olursa yönetilir.
 */
export function subscribeRosBridge(callback) {
  ensureBridgeListeners();
  bridgeCallbacks.add(callback);

  if (ros.isConnected) {
    setTimeout(() => callback("connected"), 0);
  } else {
    // İlk bağlanma denemesi "connecting"te takılırsa yakala
    startConnectWatchdog();
  }

  return () => {
    bridgeCallbacks.delete(callback);
  };
}

/* ── /robot_status aboneliği (tek Topic instance) ───────────────────────── */
let robotStatusTopic = null;
const robotStatusHandlers = new Set();

function ensureRobotStatusTopic() {
  if (robotStatusTopic != null) return;

  robotStatusTopic = new ROSLIB.Topic({
    ros,
    name: ROS_TOPIC_ROBOT_STATUS,
    messageType: "std_msgs/String",
  });

  robotStatusTopic.subscribe((msg) => {
    const data = typeof msg?.data === "string" ? msg.data : "";
    robotStatusHandlers.forEach((fn) => {
      try {
        fn(data);
      } catch (e) {
        console.warn("[ros] /robot_status handler error:", e);
      }
    });
  });
}

/**
 * Aynı topic'e yalnızca bir kez abone olunur; her çağrı handler ekler.
 * Unmount'ta cleanup yapmayı unutma: geri dönen fonksiyonu çağır.
 */
export function subscribeRobotStatus(onMessage) {
  ensureBridgeListeners();
  ensureRobotStatusTopic();
  robotStatusHandlers.add(onMessage);

  return () => {
    robotStatusHandlers.delete(onMessage);
    if (robotStatusHandlers.size === 0 && robotStatusTopic != null) {
      try {
        robotStatusTopic.unsubscribe();
      } catch {
        /* ignore */
      }
      robotStatusTopic = null;
    }
  };
}

/* ── /expected_hex and /open_topbox (Topbox Hex Flow) ───────────────────────── */
export const EXPECTED_HEX_TOPIC = process.env.EXPO_PUBLIC_EXPECTED_HEX_TOPIC || "/expected_hex";
export const OPEN_TOPBOX_TOPIC = process.env.EXPO_PUBLIC_OPEN_TOPBOX_TOPIC || "/open_topbox";
export const STATUS_NOTE_TOPIC = process.env.EXPO_PUBLIC_STATUS_NOTE_TOPIC || "/qr_camera/status_note";

export function publishExpectedHex(hexStr) {
  const talker = new ROSLIB.Topic({
    ros,
    name: EXPECTED_HEX_TOPIC,
    messageType: "std_msgs/String",
  });
  talker.publish({ data: String(hexStr) });
  console.log("📤 published to", EXPECTED_HEX_TOPIC, ":", hexStr);
}

export function subscribeOpenTopbox(onMessage) {
  const listener = new ROSLIB.Topic({
    ros,
    name: OPEN_TOPBOX_TOPIC,
    messageType: "std_msgs/Bool",
  });
  listener.subscribe((msg) => {
    console.log(`${OPEN_TOPBOX_TOPIC}:`, msg.data);
    onMessage?.(Boolean(msg.data));
  });
  return () => listener.unsubscribe();
}

export function subscribeStatusNote(onMessage) {
  const listener = new ROSLIB.Topic({
    ros,
    name: STATUS_NOTE_TOPIC,
    messageType: "std_msgs/String",
  });
  listener.subscribe((msg) => {
    console.log(`${STATUS_NOTE_TOPIC}:`, msg.data);
    onMessage?.(msg.data);
  });
  return () => listener.unsubscribe();
}
