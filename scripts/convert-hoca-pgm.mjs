/**
 * One-off: ROS map .pgm (P5) → PNG for React Native Image.
 * Usage: node scripts/convert-hoca-pgm.mjs <input.pgm> <output.png>
 */
import fs from "fs";
import path from "path";
import { PNG } from "pngjs";

const [,, inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error("Usage: node scripts/convert-hoca-pgm.mjs <in.pgm> <out.png>");
  process.exit(1);
}

const b = fs.readFileSync(inPath);
let i = 0;
function skipWs() {
  while (i < b.length && b[i] <= 32) i++;
}
function readToken() {
  skipWs();
  if (b[i] === 35) {
    while (i < b.length && b[i] !== 10) i++;
    return readToken();
  }
  const start = i;
  while (i < b.length && b[i] > 32) i++;
  return b.slice(start, i).toString();
}

readToken(); // P5
const w = parseInt(readToken(), 10);
const h = parseInt(readToken(), 10);
const maxv = parseInt(readToken(), 10);
if (!Number.isFinite(w) || !Number.isFinite(h) || maxv !== 255) {
  throw new Error(`Unexpected PGM header w=${w} h=${h} max=${maxv}`);
}

const png = new PNG({ width: w, height: h });
const raw = b.subarray(i, i + w * h);
if (raw.length < w * h) {
  throw new Error("PGM file truncated");
}
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const v = raw[y * w + x];
    const idx = (w * y + x) << 2;
    png.data[idx] = v;
    png.data[idx + 1] = v;
    png.data[idx + 2] = v;
    png.data[idx + 3] = 255;
  }
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });

png.pack().pipe(fs.createWriteStream(outPath));
