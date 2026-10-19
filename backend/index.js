import bcrypt from "bcryptjs";
import cors from "cors";
import crypto from "crypto"; // for hashing/secrets
import dotenv from "dotenv";
import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import pkg from "pg";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env"), override: true });

const { Pool } = pkg;
const app = express();

app.use(cors());
app.use(express.json());

// Simple connectivity check (useful from a physical phone browser)
app.get("/healthz", (req, res) => {
  res.json({ ok: true });
});

// ======================
// PUSH NOTIFICATIONS (Expo)
// ======================
// Keep DB unchanged: store tokens in-memory (reset on backend restart).
const pushTokensByUserId = new Map(); // userId(string) -> Set(expoPushToken)

async function sendExpoPush({ expoPushTokens, title, body, data }) {
  const tokens = (expoPushTokens ?? []).filter(Boolean);
  if (tokens.length === 0) return;
  if (typeof fetch !== "function") {
    console.warn("PUSH: global fetch is not available. Use Node 18+.");
    return;
  }

  const messages = tokens.map((to) => ({
    to,
    sound: "default",
    title,
    body,
    data: data ?? {},
  }));

  try {
    const resp = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok) {
      console.warn("PUSH SEND FAILED", resp.status, json);
      return;
    }
    const errors = (json?.data ?? []).filter((x) => x?.status && x.status !== "ok");
    if (errors.length) console.warn("PUSH SEND WARN", errors);
  } catch (e) {
    console.warn("PUSH SEND ERROR", e?.message ?? e);
  }
}

const DEFAULT_QR_TTL_SECONDS = 5 * 60; // 5 dakikalık tek kullanımlık QR süresi

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌ DATABASE_URL environment variable is not set!");
  process.exit(1);
}

// URL-encoded karakterleri decode et (pg modülü için)
dbUrl = decodeURIComponent(dbUrl);

// Lokal Postgres'te SSL kapatmak için ortam değişkeni; Supabase'de etkisi yok.
if (dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1")) {
  process.env.PGSSLMODE = "disable";
}

const pool = new Pool({
  // BURAYA LINK GELECEK
  connectionString: dbUrl,
  ssl: (() => {
    const url = dbUrl;
    const sslRequired =
      process.env.PGSSLMODE === "require" || url.includes("sslmode=require");
    const isSupabase = url.includes("supabase.co") || url.includes("supabase.com");
    if (sslRequired || isSupabase) return { rejectUnauthorized: false };
    return false;
  })(),
});

try {
  const safe = String(dbUrl ?? "").replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
  console.log(`DB: ${safe}`);
  console.log(`DB SSL: ${JSON.stringify(pool.options.ssl)}`);
} catch {
  // ignore
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function isBcryptHash(value) {
  return typeof value === "string" && /^\$2[aby]\$/.test(value);
}

function extractBcryptHash(value) {
  if (typeof value !== "string") return null;
  // Standard bcrypt hash length is 60 chars:
  // $2b$10$ + 53 chars => 60 total
  const m = value.match(/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/);
  return m ? m[0] : null;
}

function verifyPassword(storedHash, plainPassword) {
  if (!storedHash) return false;
  // If web stored the bcrypt hash with extra prefix/suffix, extract it.
  const bcryptHash = isBcryptHash(storedHash) ? storedHash : extractBcryptHash(storedHash);
  if (bcryptHash) {
    // Try plain password first
    if (bcrypt.compareSync(plainPassword, bcryptHash)) return true;
    // Compatibility: some clients hash the password before bcrypt (e.g., bcrypt(sha256(password))).
    const sha = sha256Hex(plainPassword);
    if (bcrypt.compareSync(sha, bcryptHash)) return true;
    return false;
  }
  return sha256Hex(plainPassword) === storedHash;
}

function verifyPasswordDebug(storedHash, plainPassword) {
  const result = { ok: false, method: "none" };
  if (!storedHash) return result;
  const bcryptHash = isBcryptHash(storedHash) ? storedHash : extractBcryptHash(storedHash);
  if (bcryptHash) {
    if (bcrypt.compareSync(plainPassword, bcryptHash)) return { ok: true, method: "bcrypt(plain)" };
    const sha = sha256Hex(plainPassword);
    if (bcrypt.compareSync(sha, bcryptHash)) return { ok: true, method: "bcrypt(sha256)" };
    return { ok: false, method: "bcrypt(mismatch)" };
  }
  const shaOk = sha256Hex(plainPassword) === storedHash;
  return { ok: shaOk, method: shaOk ? "sha256" : "sha256(mismatch)" };
}

function genTrackingCode() {
  return `RC-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
}

function generateQrToken(ttlSeconds = DEFAULT_QR_TTL_SECONDS) {
  const raw = crypto.randomBytes(24).toString("base64url"); // URL-safe
  const qrValue = `RCQR-${raw}`;
  const qrHash = sha256Hex(qrValue);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  return { qrValue, qrHash, expiresAt };
}

async function createEvent(deliveryId, eventType, eventData = null) {
  await pool.query(
    `INSERT INTO delivery_events (delivery_id, event_type, event_data) VALUES ($1, $2, $3)`,
    [deliveryId, eventType, eventData]
  );
}

// ✅ SADECE SERVER AYAKTA MI TESTİ (DB GEREKTİRMEZ)
app.get("/", (req, res) => {
  res.send("Backend is running ✅ (Once DB is configured, register/login will be available)");
});

// ======================
// ✅ QR TOKEN ÜRET (DB insert yok)
// ======================
app.post("/qr/generate", (req, res) => {
  const { ttlSeconds } = req.body || {};
  const ttl = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds : DEFAULT_QR_TTL_SECONDS;
  const payload = generateQrToken(ttl);
  res.json({
    qrValue: payload.qrValue,
    qrHash: payload.qrHash,
    expiresAt: payload.expiresAt.toISOString(),
  });
});

// ======================
// USERS (helper for mobile pickers)
// ======================
app.get("/users", async (req, res) => {
  console.log("GET /users requested from IP:", req.ip);
  const { role } = req.query;
  try {
    const params = [];
    const where = ["is_active = TRUE"];
    if (role) {
      params.push(role);
      where.push(`role = $${params.length}`);
    }
    const q = `
      SELECT id, full_name, email, role, phone_number, is_active, created_at
      FROM users
      WHERE ${where.join(" AND ")}
      ORDER BY full_name ASC
    `;
    const result = await pool.query(q, params);
    res.json(result.rows);
  } catch (err) {
    console.error("USERS ERROR:", err);
    res.status(500).json({ error: "Users fetch failed" });
  }
});

// ======================
// ROOMS
// ======================
app.get("/rooms", async (req, res) => {
  console.log("GET /rooms requested from IP:", req.ip);
  try {
    const result = await pool.query(
      `
      SELECT id, room_number, description, map_name, map_x, map_y, is_active, created_at
      FROM rooms
      WHERE is_active = TRUE
      ORDER BY room_number ASC
      `
    );
    res.json(result.rows);
  } catch (err) {
    console.error("ROOMS ERROR:", err);
    res.status(500).json({ error: "Rooms fetch failed" });
  }
});

// ======================
// ROBOTS
// ======================
app.get("/robots", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        r.id,
        r.name,
        r.status,
        r.battery_level,
        r.ip_address,
        r.last_heartbeat_at,
        cr.room_number AS current_room_number,
        ir.room_number AS initial_room_number
      FROM robots r
      LEFT JOIN rooms cr ON cr.id = r.current_room_id
      LEFT JOIN rooms ir ON ir.id = r.initial_room_id
      ORDER BY r.id ASC
      `
    );
    res.json(result.rows);
  } catch (err) {
    console.error("ROBOTS ERROR:", err);
    res.status(500).json({ error: "Robots fetch failed" });
  }
});


// ======================
// ✅ REGISTER (SENİN users TABLONA UYUMLU)
// ======================
app.post("/register", async (req, res) => {
  const { fullName, email, password, phoneNumber } = req.body;

  try {
    const normalizedEmail = String(email ?? "").trim().toLowerCase();

    // ✅ PASSWORD HASH (bcrypt)
    const passwordHash = bcrypt.hashSync(String(password ?? ""), 10);

    const result = await pool.query(
      `
      INSERT INTO users (full_name, email, password_hash, phone_number)
      VALUES ($1, $2, $3, $4)
      RETURNING id, full_name, email, role, phone_number, is_active, created_at
      `,
      [fullName, normalizedEmail, passwordHash, phoneNumber || null]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("REGISTER ERROR:", err);

    // ✅ Handle email UNIQUE violation
    if (err.code === "23505") {
      return res.status(400).json({ error: "This email is already registered" });
    }

    res.status(500).json({ error: "Register failed" });
  }
});

// ======================
// PUSH TOKEN REGISTER (Mobile -> Backend)
// ======================
app.post("/push/register", async (req, res) => {
  try {
    const { userId, expoPushToken } = req.body ?? {};
    if (!userId || !expoPushToken) return res.status(400).json({ error: "userId and expoPushToken required" });

    const uid = String(userId);
    const token = String(expoPushToken);

    let set = pushTokensByUserId.get(uid);
    if (!set) {
      set = new Set();
      pushTokensByUserId.set(uid, set);
    }
    set.add(token);
    console.log("PUSH REGISTER", { userId: uid, tokenPreview: `${token.slice(0, 12)}...`, tokenCount: set.size });
    res.json({ ok: true, userId: uid, tokenCount: set.size });
  } catch (e) {
    console.error("PUSH REGISTER ERROR", e);
    res.status(500).json({ error: "Push register failed" });
  }
});

// Manual push test: POST /push/test { userId, title?, body? }
app.post("/push/test", async (req, res) => {
  const { userId, title, body } = req.body ?? {};
  if (!userId) return res.status(400).json({ error: "userId required" });
  const uid = String(userId);
  const tokenSet = pushTokensByUserId.get(uid);
  const tokens = tokenSet ? Array.from(tokenSet) : [];
  if (!tokens.length) return res.status(404).json({ error: "No push tokens registered for this user" });

  await sendExpoPush({
    expoPushTokens: tokens,
    title: String(title ?? "Test notification"),
    body: String(body ?? "Hello from RoboCourier backend"),
    data: { type: "test" },
  });

  res.json({ ok: true, tokenCount: tokens.length });
});


// ======================
// ✅ LOGIN (password_hash İLE)
// ======================
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log("LOGIN ATTEMPT", { email });
    const result = await pool.query(
      `
      SELECT id, full_name, email, role, phone_number, is_active, created_at, password_hash
      FROM users
      WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))
        AND COALESCE(is_active, TRUE) = TRUE
      `,
      [String(email ?? "")]
    );

    if (result.rows.length === 0) {
      console.log("LOGIN USER NOT FOUND/INACTIVE", { email });
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];
    const plain = String(password ?? "");
    const dbg = verifyPasswordDebug(user.password_hash, plain);
    const ok = dbg.ok;
    console.log("LOGIN VERIFY", { email: String(email ?? ""), method: dbg.method, ok });
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    // Do not return password_hash
    const { password_hash, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ======================
// DELIVERIES
// ======================
app.get("/deliveries", async (req, res) => {
  const { sender_id, receiver_id } = req.query;
  try {
    const params = [];
    const where = ["1=1"];
    if (sender_id) {
      params.push(sender_id);
      where.push(`d.sender_id = $${params.length}`);
    }
    if (receiver_id) {
      params.push(receiver_id);
      where.push(`d.receiver_id = $${params.length}`);
    }

    const result = await pool.query(
      `
      SELECT
        d.id,
        d.tracking_code,
        d.status,
        d.description,
        d.created_at,
        d.accepted_at,
        d.pickup_completed_at,
        d.arrived_receiver_at,
        d.completed_at,
        s.full_name AS sender_full_name,
        r.full_name AS receiver_full_name,
        pr.room_number AS pickup_room_number,
        dr.room_number AS dropoff_room_number
      FROM deliveries d
      JOIN users s ON s.id = d.sender_id
      JOIN users r ON r.id = d.receiver_id
      JOIN rooms pr ON pr.id = d.pickup_room_id
      JOIN rooms dr ON dr.id = d.dropoff_room_id
      WHERE ${where.join(" AND ")}
      ORDER BY d.created_at DESC
      LIMIT 100
      `,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error("DELIVERIES LIST ERROR:", err);
    res.status(500).json({ error: "Deliveries fetch failed" });
  }
});

app.post("/deliveries", async (req, res) => {
  const { senderId, receiverId, pickupRoomId, dropoffRoomId, description } = req.body;
  if (!senderId || !receiverId || !pickupRoomId || !dropoffRoomId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const trackingCode = genTrackingCode();

  try {
    const result = await pool.query(
      `
      INSERT INTO deliveries (tracking_code, sender_id, receiver_id, pickup_room_id, dropoff_room_id, status, description)
      VALUES ($1, $2, $3, $4, $5, 'pending', $6)
      RETURNING id, tracking_code, status, created_at, pickup_room_id, dropoff_room_id
      `,
      [trackingCode, senderId, receiverId, pickupRoomId, dropoffRoomId, description || null]
    );
    const delivery = result.rows[0];

    const locResult = await pool.query(
      `
      SELECT
        pr.id   AS pickup_id,
        pr.room_number AS pickup_code,
        pr.description AS pickup_description,
        pr.map_name    AS pickup_map_name,
        pr.map_x       AS pickup_map_x,
        pr.map_y       AS pickup_map_y,
        dr.id   AS dropoff_id,
        dr.room_number AS dropoff_code,
        dr.description AS dropoff_description,
        dr.map_name    AS dropoff_map_name,
        dr.map_x       AS dropoff_map_x,
        dr.map_y       AS dropoff_map_y
      FROM rooms pr
      JOIN rooms dr ON dr.id = $2
      WHERE pr.id = $1
      LIMIT 1
      `,
      [delivery.pickup_room_id, delivery.dropoff_room_id]
    );

    const loc = locResult.rows[0] || null;

    await createEvent(delivery.id, "delivery_created", {
      tracking_code: delivery.tracking_code,
      pickup: loc
        ? {
          id: loc.pickup_id,
          code: loc.pickup_code,
          description: loc.pickup_description,
          map_name: loc.pickup_map_name,
          map_x: loc.pickup_map_x,
          map_y: loc.pickup_map_y,
        }
        : null,
      dropoff: loc
        ? {
          id: loc.dropoff_id,
          code: loc.dropoff_code,
          description: loc.dropoff_description,
          map_name: loc.dropoff_map_name,
          map_x: loc.dropoff_map_x,
          map_y: loc.dropoff_map_y,
        }
        : null,
    });

    // Notify receiver (in-app) so the delivery shows up in their "Notifications" immediately.
    try {
      await pool.query(
        `INSERT INTO notifications (user_id, delivery_id, channel, title, body)
         VALUES ($1, $2, 'in_app', $3, $4)`,
        [
          receiverId,
          delivery.id,
          "New delivery",
          `A new delivery (${delivery.tracking_code}) was created for you.`,
        ]
      );
    } catch (e) {
      // Non-fatal: delivery is created even if notification insert fails.
      console.warn("DELIVERY CREATE: notification insert failed", e?.message ?? e);
    }

    // Push notification (iOS banner) if receiver has registered Expo push tokens.
    try {
      const tokenSet = pushTokensByUserId.get(String(receiverId));
      const tokens = tokenSet ? Array.from(tokenSet) : [];
      await sendExpoPush({
        expoPushTokens: tokens,
        title: "New delivery",
        body: `Tracking: ${delivery.tracking_code}`,
        data: { type: "delivery_created", tracking_code: delivery.tracking_code, delivery_id: delivery.id },
      });
    } catch (e) {
      console.warn("DELIVERY CREATE: push send failed", e?.message ?? e);
    }

    res.json(delivery);
  } catch (err) {
    console.error("DELIVERY CREATE ERROR:", err);
    res.status(500).json({ error: "Delivery create failed" });
  }
});

app.get("/deliveries/:trackingCode", async (req, res) => {
  const { trackingCode } = req.params;
  try {
    const result = await pool.query(
      `
      SELECT
        d.id,
        d.tracking_code,
        d.status,
        d.description,
        d.created_at,
        d.accepted_at,
        d.pickup_completed_at,
        d.arrived_receiver_at,
        d.completed_at,
        d.cancelled_at,
        s.id AS sender_id,
        s.full_name AS sender_full_name,
        r.id AS receiver_id,
        r.full_name AS receiver_full_name,
        pr.id AS pickup_room_id,
        pr.room_number AS pickup_room_number,
        dr.id AS dropoff_room_id,
        dr.room_number AS dropoff_room_number,
        rb.id AS robot_id,
        rb.name AS robot_name,
        rb.status AS robot_status,
        rb.battery_level AS robot_battery_level,
        rb.last_heartbeat_at AS robot_last_heartbeat_at
      FROM deliveries d
      JOIN users s ON s.id = d.sender_id
      JOIN users r ON r.id = d.receiver_id
      JOIN rooms pr ON pr.id = d.pickup_room_id
      JOIN rooms dr ON dr.id = d.dropoff_room_id
      LEFT JOIN robots rb ON rb.id = d.robot_id
      WHERE d.tracking_code = $1
      LIMIT 1
      `,
      [trackingCode]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Delivery not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("DELIVERY DETAIL ERROR:", err);
    res.status(500).json({ error: "Delivery fetch failed" });
  }
});

app.get("/deliveries/:trackingCode/qr", async (req, res) => {
  const { trackingCode } = req.params;
  try {
    const dRes = await pool.query(`SELECT id FROM deliveries WHERE tracking_code=$1 LIMIT 1`, [trackingCode]);
    if (dRes.rows.length === 0) return res.status(404).json({ error: "Delivery not found" });
    const deliveryId = Number(dRes.rows[0].id);

    // NOTE: We store only qr_hash in DB (not qr_value). That means we can't re-serve the same QR value later.
    // So we generate a fresh one-time token on each request and return the raw qrValue for the mobile UI.
    const ttlSecondsRaw = req.query?.ttlSeconds;
    const ttlSeconds = Number.isFinite(Number(ttlSecondsRaw)) && Number(ttlSecondsRaw) > 0 ? Number(ttlSecondsRaw) : DEFAULT_QR_TTL_SECONDS;
    const { qrValue, qrHash, expiresAt } = generateQrToken(ttlSeconds);

    const inserted = await pool.query(
      `
      INSERT INTO delivery_qr_codes (delivery_id, qr_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, delivery_id, qr_hash, expires_at, used_at, created_at
      `,
      [deliveryId, qrHash, expiresAt]
    );

    await createEvent(deliveryId, "qr_created", { qr_hash: qrHash, expires_at: expiresAt.toISOString() });

    res.json({
      ...inserted.rows[0],
      tracking_code: trackingCode,
      qr_value: qrValue,
    });
  } catch (err) {
    console.error("DELIVERY QR ERROR:", err);
    res.status(500).json({ error: "QR fetch failed" });
  }
});

// ======================
// ROBOT COMMANDS (for Ubuntu/ROS bridge)
// ======================
app.get("/robot/commands", async (req, res) => {
  const { since_event_id } = req.query ?? {};
  const params = [];
  const where = [
    `event_type = 'delivery_created'`,
    `event_data ? 'pickup'`,
    `event_data ? 'dropoff'`
  ];

  if (since_event_id) {
    const n = Number(since_event_id);
    if (Number.isFinite(n) && n > 0) {
      params.push(n);
      where.push(`id > $${params.length}`);
    }
  }

  try {
    const result = await pool.query(
      `
      SELECT id, delivery_id, event_type, event_data, created_at
      FROM delivery_events
      WHERE ${where.join(" AND ")}
      ORDER BY id ASC
      LIMIT 100
      `
      ,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error("ROBOT COMMANDS ERROR:", err);
    res.status(500).json({ error: "Robot commands fetch failed" });
  }
});

app.get("/robot/last-event-id", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT COALESCE(MAX(id), 0) AS max_id
      FROM delivery_events
      WHERE event_type = 'delivery_created'
        AND event_data ? 'pickup'
        AND event_data ? 'dropoff'
      `
    );
    const maxId = Number(result.rows[0]?.max_id ?? 0);
    res.json({ max_id: maxId });
  } catch (err) {
    console.error("ROBOT LAST EVENT ID ERROR:", err);
    res.status(500).json({ error: "Robot last event id fetch failed" });
  }
});

app.post("/delivery_qr_codes/verify", async (req, res) => {
  const { qrHash, qrValue } = req.body;
  const hashToCheck = qrHash || (qrValue ? sha256Hex(String(qrValue)) : null);
  if (!hashToCheck) return res.status(400).json({ error: "qrHash or qrValue required" });
  try {
    const qrRes = await pool.query(
      `
      SELECT id, delivery_id, qr_hash, expires_at, used_at, created_at
      FROM delivery_qr_codes
      WHERE qr_hash = $1
      LIMIT 1
      `,
      [hashToCheck]
    );
    if (qrRes.rows.length === 0) return res.status(404).json({ error: "QR not found" });
    const qr = qrRes.rows[0];

    if (qr.used_at) return res.status(400).json({ error: "QR already used" });
    if (qr.expires_at && new Date(qr.expires_at).getTime() < Date.now()) return res.status(400).json({ error: "QR expired" });

    await pool.query(`UPDATE delivery_qr_codes SET used_at = NOW() WHERE id=$1`, [qr.id]);
    await pool.query(`UPDATE deliveries SET status='completed', completed_at=NOW() WHERE id=$1`, [qr.delivery_id]);

    await createEvent(qr.delivery_id, "delivery_completed", { by: "qr_verify" });

    const d = await pool.query(`SELECT receiver_id, tracking_code FROM deliveries WHERE id=$1 LIMIT 1`, [qr.delivery_id]);
    const receiverId = d.rows[0]?.receiver_id;
    const trackingCode = d.rows[0]?.tracking_code;
    if (receiverId) {
      await pool.query(
        `INSERT INTO notifications (user_id, delivery_id, channel, title, body) VALUES ($1,$2,'in_app',$3,$4)`,
        [receiverId, qr.delivery_id, "Delivery completed", `${trackingCode} completed successfully.`]
      );
    }

    res.json({ ok: true, deliveryId: qr.delivery_id });
  } catch (err) {
    console.error("QR VERIFY ERROR:", err);
    res.status(500).json({ error: "QR verify failed" });
  }
});

// ======================
// ✅ QR TOKEN ÜRET ve DB'ye YAZ (delivery_id ile)
// ======================
app.post("/deliveries/:deliveryId/qr", async (req, res) => {
  const { deliveryId } = req.params;
  const { ttlSeconds } = req.body || {};
  const ttl = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds : DEFAULT_QR_TTL_SECONDS;

  const id = Number(deliveryId);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid deliveryId" });

  const { qrValue, qrHash, expiresAt } = generateQrToken(ttl);

  try {
    await pool.query(
      `
      INSERT INTO delivery_qr_codes (delivery_id, qr_hash, expires_at)
      VALUES ($1, $2, $3)
      `,
      [id, qrHash, expiresAt]
    );
    res.json({ deliveryId: id, qrValue, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    console.error("QR GENERATION ERROR:", err);
    res.status(500).json({ error: "Failed to generate QR" });
  }
});

// ======================
// NOTIFICATIONS
// ======================
app.get("/notifications", async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: "user_id required" });
  try {
    const result = await pool.query(
      `
      SELECT id, user_id, delivery_id, channel, title, body, is_read, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100
      `,
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("NOTIFICATIONS ERROR:", err);
    res.status(500).json({ error: "Notifications fetch failed" });
  }
});

app.patch("/notifications/:id/read", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`UPDATE notifications SET is_read=TRUE WHERE id=$1 RETURNING id, is_read`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("NOTIFICATION READ ERROR:", err);
    res.status(500).json({ error: "Notification update failed" });
  }
});


// ======================
// ✅ FORGOT PASSWORD (Nodemailer)
// ======================
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const result = await pool.query(`SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1`, [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Kullanıcı bulunamadı." });
    }
    const userId = result.rows[0].id;

    // Rastgele 8 karakterli şifre oluştur
    const newPassword = crypto.randomBytes(4).toString("hex");
    const passwordHash = bcrypt.hashSync(newPassword, 10);

    await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, userId]);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"RoboCourier App" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Yeni Şifreniz (RoboCourier)",
      text: `Merhaba,\n\nHesabınız için yeni bir şifre talep ettiniz.\n\nYeni şifreniz: ${newPassword}\n\nLütfen giriş yaptıktan sonra şifrenizi değiştiriniz.\n\nİyi günler!`,
    };

    await transporter.sendMail(mailOptions);
    res.json({ ok: true, message: "Yeni şifreniz e-posta adresinize gönderildi." });

  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    res.status(500).json({ error: "Şifre yenileme işlemi başarısız oldu." });
  }
});

// ======================
// ✅ CHANGE PASSWORD
// ======================
app.post("/change-password", async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  if (!userId || !oldPassword || !newPassword) return res.status(400).json({ error: "Eksik bilgi" });

  try {
    const result = await pool.query(`SELECT password_hash FROM users WHERE id = $1 LIMIT 1`, [userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Kullanıcı bulunamadı" });

    const user = result.rows[0];
    const ok = verifyPassword(user.password_hash, oldPassword);
    if (!ok) return res.status(400).json({ error: "Mevcut şifreniz hatalı" });

    const passwordHash = bcrypt.hashSync(newPassword, 10);
    await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, userId]);

    res.json({ ok: true, message: "Şifreniz başarıyla değiştirildi." });
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    res.status(500).json({ error: "Şifre değiştirme başarısız oldu" });
  }
});

// ======================
// ✅ UPDATE PHONE NUMBER
// ======================
app.put("/users/:id/phone", async (req, res) => {
  const { id } = req.params;
  const { phone_number } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET phone_number = $1 WHERE id = $2 RETURNING id, phone_number`,
      [phone_number, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Kullanıcı bulunamadı" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE PHONE ERROR:", err);
    res.status(500).json({ error: "Telefon numarası güncellenemedi" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
