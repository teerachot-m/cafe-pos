// Direct ESC/POS printing over WebUSB (device.transferOut) or Web Serial
// (writer.write). Slips are rendered onto a canvas (full Thai + logo support,
// no printer codepages needed), converted to GS v 0 raster bitmaps and sent
// with a partial-cut command after every slip — so each slip is printed at
// exactly its content length and cut automatically.

import type { PrintableOrder } from './receipt';

const DOTS_PER_LINE = 576; // 80mm printer, 203dpi, 72mm printable
const ESC = 0x1b;
const GS = 0x1d;

const INIT = new Uint8Array([ESC, 0x40]); // ESC @ — reset
// GS V 66 0 — feed to cut position, then partial cut
const FEED_AND_CUT = new Uint8Array([GS, 0x56, 0x42, 0x00]);

// ---------------------------------------------------------------------------
// Transport (WebUSB / Web Serial)
// ---------------------------------------------------------------------------

interface Transport {
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
}

let activeTransport: Transport | null = null;

async function openUsbTransport(device: any): Promise<Transport> {
  await device.open();
  if (device.configuration === null) {
    await device.selectConfiguration(1);
  }
  // Find the first interface with an OUT endpoint (printer class = 7)
  let ifaceNum = -1;
  let endpointNum = -1;
  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      const out = alt.endpoints.find((e: any) => e.direction === 'out');
      if (out) {
        ifaceNum = iface.interfaceNumber;
        endpointNum = out.endpointNumber;
        break;
      }
    }
    if (ifaceNum >= 0) break;
  }
  if (ifaceNum < 0) throw new Error('ไม่พบ OUT endpoint บนเครื่องพิมพ์');
  await device.claimInterface(ifaceNum);

  return {
    async write(data: Uint8Array) {
      const CHUNK = 8192;
      for (let i = 0; i < data.length; i += CHUNK) {
        await device.transferOut(endpointNum, data.slice(i, i + CHUNK));
      }
    },
    async close() {
      try { await device.close(); } catch { /* already closed */ }
    },
  };
}

async function openSerialTransport(port: any): Promise<Transport> {
  if (!port.readable && !port.writable) {
    await port.open({ baudRate: 115200 });
  }
  return {
    async write(data: Uint8Array) {
      const writer = port.writable.getWriter();
      try {
        const CHUNK = 8192;
        for (let i = 0; i < data.length; i += CHUNK) {
          await writer.write(data.slice(i, i + CHUNK));
        }
      } finally {
        writer.releaseLock();
      }
    },
    async close() {
      try { await port.close(); } catch { /* already closed */ }
    },
  };
}

export function isDirectPrintSupported(): boolean {
  if (typeof navigator === 'undefined') return false;
  return 'usb' in navigator || 'serial' in navigator;
}

/** Interactive pairing (must be called from a click). USB first, then serial. */
export async function pairPrinter(): Promise<string> {
  const nav = navigator as any;
  if (nav.usb) {
    try {
      const device = await nav.usb.requestDevice({ filters: [] });
      activeTransport = await openUsbTransport(device);
      return `USB: ${device.productName || 'printer'}`;
    } catch (e: any) {
      // fall through to serial when the user cancelled or claim failed
      if (!nav.serial) throw e;
    }
  }
  if (nav.serial) {
    const port = await nav.serial.requestPort();
    activeTransport = await openSerialTransport(port);
    return 'Serial (COM)';
  }
  throw new Error('เบราว์เซอร์นี้ไม่รองรับ WebUSB / Web Serial (ใช้ Chrome หรือ Edge)');
}

/** Silent reconnect to a previously authorized device. */
async function getTransport(): Promise<Transport | null> {
  if (activeTransport) return activeTransport;
  const nav = navigator as any;
  try {
    if (nav.usb) {
      const devices = await nav.usb.getDevices();
      if (devices.length > 0) {
        activeTransport = await openUsbTransport(devices[0]);
        return activeTransport;
      }
    }
    if (nav.serial) {
      const ports = await nav.serial.getPorts();
      if (ports.length > 0) {
        activeTransport = await openSerialTransport(ports[0]);
        return activeTransport;
      }
    }
  } catch {
    activeTransport = null;
  }
  return null;
}

export async function hasPairedPrinter(): Promise<boolean> {
  return (await getTransport()) !== null;
}

// ---------------------------------------------------------------------------
// Canvas slip painter
// ---------------------------------------------------------------------------

const FONT = "'Courier New', 'Sarabun', monospace";

class SlipPainter {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  y = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = DOTS_PER_LINE;
    this.canvas.height = 4000;
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#000';
    this.y = 8;
  }

  space(px: number) {
    this.y += px;
  }

  text(
    str: string,
    opts: { size?: number; bold?: boolean; align?: 'left' | 'center' | 'right'; x?: number } = {}
  ) {
    const { size = 24, bold = false, align = 'left' } = opts;
    this.ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
    this.ctx.textBaseline = 'top';
    let x = opts.x ?? 0;
    if (align === 'center') {
      x = (DOTS_PER_LINE - this.ctx.measureText(str).width) / 2;
    } else if (align === 'right') {
      x = DOTS_PER_LINE - this.ctx.measureText(str).width;
    }
    this.ctx.fillText(str, Math.max(0, x), this.y);
    this.y += Math.round(size * 1.4);
  }

  /** left + right on the same line */
  row(left: string, right: string, opts: { size?: number; bold?: boolean } = {}) {
    const { size = 24, bold = false } = opts;
    this.ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(left, 0, this.y);
    const w = this.ctx.measureText(right).width;
    this.ctx.fillText(right, DOTS_PER_LINE - w, this.y);
    this.y += Math.round(size * 1.4);
  }

  /** three columns: left / center / right */
  row3(left: string, center: string, right: string, opts: { size?: number } = {}) {
    const { size = 20 } = opts;
    this.ctx.font = `${size}px ${FONT}`;
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(left, 0, this.y);
    const cw = this.ctx.measureText(center).width;
    this.ctx.fillText(center, (DOTS_PER_LINE - cw) / 2, this.y);
    const rw = this.ctx.measureText(right).width;
    this.ctx.fillText(right, DOTS_PER_LINE - rw, this.y);
    this.y += Math.round(size * 1.4);
  }

  line(dashed = true) {
    this.y += 6;
    this.ctx.save();
    this.ctx.beginPath();
    if (dashed) this.ctx.setLineDash([8, 6]);
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = '#000';
    this.ctx.moveTo(0, this.y);
    this.ctx.lineTo(DOTS_PER_LINE, this.y);
    this.ctx.stroke();
    this.ctx.restore();
    this.y += 10;
  }

  image(img: HTMLImageElement, targetW: number) {
    const w = Math.min(targetW, DOTS_PER_LINE);
    const h = Math.round((img.naturalHeight / img.naturalWidth) * w);
    this.ctx.drawImage(img, (DOTS_PER_LINE - w) / 2, this.y, w, h);
    this.y += h;
  }

  /** crop to content height */
  finish(): HTMLCanvasElement {
    const h = this.y + 8;
    const out = document.createElement('canvas');
    out.width = DOTS_PER_LINE;
    out.height = h;
    const octx = out.getContext('2d')!;
    octx.fillStyle = '#fff';
    octx.fillRect(0, 0, out.width, out.height);
    octx.drawImage(this.canvas, 0, 0, DOTS_PER_LINE, h, 0, 0, DOTS_PER_LINE, h);
    return out;
  }
}

let logoPromise: Promise<HTMLImageElement | null> | null = null;
function loadLogo(): Promise<HTMLImageElement | null> {
  if (!logoPromise) {
    logoPromise = new Promise((res) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = '/logo_single.png';
    });
  }
  return logoPromise;
}

// ---------------------------------------------------------------------------
// ESC/POS raster conversion
// ---------------------------------------------------------------------------

function canvasToRaster(canvas: HTMLCanvasElement): Uint8Array {
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;
  const img = ctx.getImageData(0, 0, width, height).data;
  const bytesPerRow = width >> 3; // width is a multiple of 8 (576)
  const bitmap = new Uint8Array(bytesPerRow * height);

  for (let yPix = 0; yPix < height; yPix++) {
    for (let xPix = 0; xPix < width; xPix++) {
      const i = (yPix * width + xPix) * 4;
      const a = img[i + 3];
      const lum = a === 0 ? 255 : img[i] * 0.299 + img[i + 1] * 0.587 + img[i + 2] * 0.114;
      if (lum < 160) {
        bitmap[yPix * bytesPerRow + (xPix >> 3)] |= 0x80 >> (xPix & 7);
      }
    }
  }

  // GS v 0 — print raster bit image
  const out = new Uint8Array(8 + bitmap.length);
  out.set([
    GS, 0x76, 0x30, 0x00,
    bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff,
    height & 0xff, (height >> 8) & 0xff,
  ]);
  out.set(bitmap, 8);
  return out;
}

// ---------------------------------------------------------------------------
// Slip renderers (mirror the HTML receipt/label layouts)
// ---------------------------------------------------------------------------

const parseOptions = (json?: string | null): string[] => {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

async function renderReceipt(order: PrintableOrder): Promise<HTMLCanvasElement> {
  const p = new SlipPainter();
  const logo = await loadLogo();
  if (logo) {
    p.image(logo, 300);
    p.space(4);
  }
  p.text('Bangkok, Thailand', { size: 20, align: 'center' });
  p.text('TEL: 02-123-4567', { size: 20, align: 'center' });
  p.line();
  p.text(`ORDER #: ${order.orderNo}`, { size: 20 });
  if (order.externalOrderNo) {
    p.text(`PLATFORM #: ${order.externalOrderNo}`, { size: 20, bold: true });
  }
  p.text(`DATE: ${new Date(order.createdAt).toLocaleString('th-TH')}`, { size: 20 });
  const gp = order.channelGpPercent ?? 0;
  p.text(`CHANNEL: ${order.channel?.name || '-'}${gp > 0 ? ` (GP ${gp}%)` : ''}`, { size: 20 });
  if (order.cashier?.name) p.text(`CASHIER: ${order.cashier.name}`, { size: 20 });
  p.line();
  for (const it of order.items || []) {
    p.row(`${it.productName} x${it.quantity}`, `฿${it.subtotal.toFixed(2)}`, { size: 24 });
    for (const o of parseOptions(it.selectedOptionsJson)) {
      p.text(`  - ${o}`, { size: 20 });
    }
  }
  p.line();
  p.row('SUBTOTAL:', `฿${order.subtotal.toFixed(2)}`, { size: 24, bold: true });
  if ((order.pointDiscount ?? 0) > 0) {
    p.row('POINT DISCOUNT:', `-฿${order.pointDiscount!.toFixed(2)}`, { size: 24 });
  }
  p.line(false);
  p.row('TOTAL NET:', `฿${order.netTotal.toFixed(2)}`, { size: 30, bold: true });
  p.line();
  p.text('THANK YOU FOR YOUR VISIT!', { size: 20, align: 'center' });
  return p.finish();
}

async function renderLabel(
  order: PrintableOrder,
  item: { productName: string; quantity: number; selectedOptionsJson?: string | null },
  cup: number
): Promise<HTMLCanvasElement> {
  const p = new SlipPainter();
  const logo = await loadLogo();
  if (logo) {
    p.image(logo, 170);
    p.space(4);
  }
  const time = new Date(order.createdAt).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
  p.row3(order.externalOrderNo || order.orderNo, time, order.channel?.name || '', { size: 20 });
  p.text(`${item.productName} (${cup}/${item.quantity})`, { size: 30, bold: true });
  const opts = parseOptions(item.selectedOptionsJson);
  if (opts.length > 0) {
    p.text(opts.join(' · '), { size: 20 });
  }
  return p.finish();
}

// ---------------------------------------------------------------------------
// Public print API
// ---------------------------------------------------------------------------

/**
 * Prints directly over USB/serial: each slip at exact content length,
 * partial-cut after every slip. Throws when no printer is paired —
 * callers should fall back to browser printing.
 */
export async function printOrderDirect(
  order: PrintableOrder,
  parts: { receipt?: boolean; labels?: boolean } = { receipt: true, labels: true }
): Promise<void> {
  const transport = await getTransport();
  if (!transport) throw new Error('NO_PRINTER');

  const chunks: Uint8Array[] = [INIT];

  if (parts.receipt) {
    chunks.push(canvasToRaster(await renderReceipt(order)));
    chunks.push(FEED_AND_CUT);
  }
  if (parts.labels) {
    for (const it of order.items || []) {
      for (let cup = 1; cup <= it.quantity; cup++) {
        chunks.push(canvasToRaster(await renderLabel(order, it, cup)));
        chunks.push(FEED_AND_CUT);
      }
    }
  }

  let total = 0;
  for (const c of chunks) total += c.length;
  const payload = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    payload.set(c, offset);
    offset += c.length;
  }

  try {
    await transport.write(payload);
  } catch (e) {
    // Connection likely stale (unplugged) — drop it so the next attempt re-pairs
    activeTransport = null;
    throw e;
  }
}
