import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import zlib from 'zlib'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'resources')

/** TodoAI 品牌色，与应用 --accent 一致 */
const BG = { r: 76, g: 139, b: 245 }
const BG_DARK = { r: 56, g: 112, b: 220 }

function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1)
}

function drawLogo(size) {
  const pixels = new Uint8ClampedArray(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.46

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const d = dist(x + 0.5, y + 0.5, cx, cy)
      if (d > radius) {
        pixels[i + 3] = 0
        continue
      }
      const t = d / radius
      pixels[i] = Math.round(BG.r * (1 - t * 0.35) + BG_DARK.r * t * 0.35)
      pixels[i + 1] = Math.round(BG.g * (1 - t * 0.35) + BG_DARK.g * t * 0.35)
      pixels[i + 2] = Math.round(BG.b * (1 - t * 0.35) + BG_DARK.b * t * 0.35)
      pixels[i + 3] = 255
    }
  }

  const stroke = Math.max(2, Math.round(size * 0.09))
  const check = [
    [0.32, 0.52],
    [0.44, 0.64],
    [0.72, 0.36]
  ].map(([px, py]) => [px * size, py * size])

  function drawThickLine(x0, y0, x1, y1) {
    const steps = Math.ceil(dist(x0, y0, x1, y1) * 2)
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      const x = x0 + (x1 - x0) * t
      const y = y0 + (y1 - y0) * t
      for (let dy = -stroke; dy <= stroke; dy++) {
        for (let dx = -stroke; dx <= stroke; dx++) {
          if (dx * dx + dy * dy > stroke * stroke + 0.5) continue
          const px = Math.round(x + dx)
          const py = Math.round(y + dy)
          if (px < 0 || py < 0 || px >= size || py >= size) continue
          const j = (py * size + px) * 4
          if (pixels[j + 3] === 0) continue
          pixels[j] = 255
          pixels[j + 1] = 255
          pixels[j + 2] = 255
          pixels[j + 3] = 255
        }
      }
    }
  }

  drawThickLine(check[0][0], check[0][1], check[1][0], check[1][1])
  drawThickLine(check[1][0], check[1][1], check[2][0], check[2][1])

  return pixels
}

function encodePng(size, rgbaPixels) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1)
    raw[rowStart] = 0
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4
      const dst = rowStart + 1 + x * 4
      raw[dst] = rgbaPixels[src]
      raw[dst + 1] = rgbaPixels[src + 1]
      raw[dst + 2] = rgbaPixels[src + 2]
      raw[dst + 3] = rgbaPixels[src + 3]
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 })

  function chunk(type, data) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const t = Buffer.from(type)
    const crcBuf = Buffer.concat([t, data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(zlib.crc32(crcBuf) >>> 0)
    return Buffer.concat([len, t, data, crc])
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function writeIcon(name, size) {
  const png = encodePng(size, drawLogo(size))
  const outFile = path.join(outDir, name)
  fs.writeFileSync(outFile, png)
  console.log('Wrote', outFile)
}

fs.mkdirSync(outDir, { recursive: true })
writeIcon('tray.png', 32)
writeIcon('icon.png', 256)
