/**
 * Genera logo.png (1024×1024) — el icono de Canvas, replicando el SVG inline
 * del editor: cuadrado redondeado con gradiente diagonal morado, marco blanco
 * interior y punto rosa. PNG escrito a mano con zlib (sin dependencias).
 *
 * Uso: node scripts/gen-logo.mjs  →  genera ./logo.png
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const S = 1024;

// Paleta de la marca
const C1 = [0x7c, 0x5c, 0xff]; // morado claro (arriba-izquierda)
const C2 = [0x4a, 0x33, 0xb8]; // morado oscuro (abajo-derecha)
const WHITE = [0xff, 0xff, 0xff];
const PINK = [0xff, 0x6b, 0x9d];

const lerp = (a, b, t) => a + (b - a) * t;

/** ¿Dentro del rectángulo redondeado [x0..x1]×[y0..y1] con radio r? */
function inRounded(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) {
    const cx = x < (x0 + x1) / 2 ? x0 : x1;
    const cy = y < (y0 + y1) / 2 ? y0 : y1;
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy > r * r) return false;
  }
  return true;
}

// Geometría (escala 32× del SVG original)
const CORNER = 220; // radio del cuadrado exterior
const FRAME = 224; // margen del marco blanco
const FRAME_W = 44; // grosor del marco
const INNER = FRAME + FRAME_W; // borde interior del marco
const DOT_C = 768; // centro del punto rosa (24*32)
const DOT_R = 128; // radio del punto (4*32)

const px = new Uint8Array(S * S * 4);

// Supersampling 2×2 por píxel para bordes suaves
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    let r = 0,
      g = 0,
      b = 0,
      a = 0;
    for (const sy of [0.25, 0.75]) {
      for (const sx of [0.25, 0.75]) {
        const X = x + sx;
        const Y = y + sy;
        let cr, cg, cb, ca;
        if (inRounded(X, Y, 0, 0, S, S, CORNER)) {
          const t = (X + Y) / (2 * S);
          cr = lerp(C1[0], C2[0], t);
          cg = lerp(C1[1], C2[1], t);
          cb = lerp(C1[2], C2[2], t);
          ca = 255;
          // Marco blanco interior
          if (
            inRounded(X, Y, FRAME, FRAME, S - FRAME, S - FRAME, 96) &&
            !inRounded(X, Y, INNER, INNER, S - INNER, S - INNER, 74)
          ) {
            cr = WHITE[0];
            cg = WHITE[1];
            cb = WHITE[2];
          }
          // Punto rosa (por encima del marco)
          const dx = X - DOT_C;
          const dy = Y - DOT_C;
          if (dx * dx + dy * dy <= DOT_R * DOT_R) {
            cr = PINK[0];
            cg = PINK[1];
            cb = PINK[2];
          }
        } else {
          ca = 0;
          cr = cg = cb = 0;
        }
        r += cr;
        g += cg;
        b += cb;
        a += ca;
      }
    }
    const i = (y * S + x) * 4;
    px[i] = Math.round(r / 4);
    px[i + 1] = Math.round(g / 4);
    px[i + 2] = Math.round(b / 4);
    px[i + 3] = Math.round(a / 4);
  }
}

// ---- Encoder PNG mínimo ----
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0); // width
ihdr.writeUInt32BE(S, 4); // height
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

// Scanlines con filtro 0
const raw = Buffer.alloc(S * (S * 4 + 1));
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0;
  Buffer.from(px.buffer, y * S * 4, S * 4).copy(raw, y * (S * 4 + 1) + 1);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

writeFileSync("logo.png", png);
console.log("logo.png generado:", png.length, "bytes");
