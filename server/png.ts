import { crc32, deflateSync } from "node:zlib";
import { hashName } from "../shared/avatar.ts";

function chunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

export function encodePng(width: number, height: number, rgba: Buffer): Buffer {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

type RGB = [number, number, number];

const SKIN: RGB[] = [
  [241, 194, 155],
  [224, 172, 125],
  [198, 134, 90],
  [141, 85, 54],
  [92, 56, 38],
  [255, 219, 188],
  [166, 110, 72],
];

const HAIR: RGB[] = [
  [32, 24, 20],
  [61, 40, 28],
  [120, 72, 40],
  [30, 30, 32],
  [90, 70, 50],
  [180, 140, 80],
  [70, 70, 75],
  [40, 28, 22],
];

const SHIRTS: RGB[] = [
  [32, 86, 120],
  [180, 130, 30],
  [90, 50, 110],
  [40, 90, 70],
  [160, 70, 50],
  [50, 60, 80],
  [120, 90, 50],
  [70, 90, 110],
];

const BACKGROUNDS: RGB[] = [
  [232, 224, 208],
  [214, 226, 232],
  [232, 220, 210],
  [220, 228, 218],
  [236, 228, 214],
  [224, 220, 228],
  [230, 226, 216],
];

function setPx(rgba: Buffer, size: number, x: number, y: number, rgb: RGB): void {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  rgba[i] = rgb[0];
  rgba[i + 1] = rgb[1];
  rgba[i + 2] = rgb[2];
  rgba[i + 3] = 255;
}

function fillCircle(rgba: Buffer, size: number, cx: number, cy: number, r: number, rgb: RGB): void {
  const r2 = r * r;
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(size - 1, Math.ceil(cy + r));
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(size - 1, Math.ceil(cx + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) setPx(rgba, size, x, y, rgb);
    }
  }
}

function fillEllipse(rgba: Buffer, size: number, cx: number, cy: number, rx: number, ry: number, rgb: RGB): void {
  const y0 = Math.max(0, Math.floor(cy - ry));
  const y1 = Math.min(size - 1, Math.ceil(cy + ry));
  const x0 = Math.max(0, Math.floor(cx - rx));
  const x1 = Math.min(size - 1, Math.ceil(cx + rx));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPx(rgba, size, x, y, rgb);
    }
  }
}

export function makeAvatarPng(name: string, size = 160): Buffer {
  const h = hashName(name);
  const bg = BACKGROUNDS[h % BACKGROUNDS.length]!;
  const skin = SKIN[(h >>> 3) % SKIN.length]!;
  const hair = HAIR[(h >>> 6) % HAIR.length]!;
  const shirt = SHIRTS[(h >>> 9) % SHIRTS.length]!;
  const style = (h >>> 12) % 4;
  const rgba = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    rgba[i * 4] = bg[0];
    rgba[i * 4 + 1] = bg[1];
    rgba[i * 4 + 2] = bg[2];
    rgba[i * 4 + 3] = 255;
  }
  const cx = size / 2;
  fillCircle(rgba, size, cx, size * 0.42, size * 0.36, [bg[0] - 12, bg[1] - 10, bg[2] - 8]);
  fillEllipse(rgba, size, cx, size * 1.02, size * 0.42, size * 0.32, shirt);
  fillCircle(rgba, size, cx, size * 0.46, size * 0.22, skin);
  if (style === 0) {
    fillEllipse(rgba, size, cx, size * 0.34, size * 0.22, size * 0.14, hair);
  } else if (style === 1) {
    fillEllipse(rgba, size, cx, size * 0.32, size * 0.24, size * 0.16, hair);
    fillCircle(rgba, size, cx + size * 0.16, size * 0.28, size * 0.07, hair);
  } else if (style === 2) {
    fillEllipse(rgba, size, cx, size * 0.33, size * 0.23, size * 0.15, hair);
    fillEllipse(rgba, size, cx - size * 0.18, size * 0.5, size * 0.06, size * 0.14, hair);
  } else {
    fillEllipse(rgba, size, cx, size * 0.36, size * 0.2, size * 0.1, hair);
  }
  return encodePng(size, size, rgba);
}
