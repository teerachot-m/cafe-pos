// Client-side thermal printing helpers (80mm roll).
// Prints via a hidden iframe that contains ONLY the slip markup, so the
// printed page height always fits the content (no full-screen-height paper).

interface PrintableOrderItem {
  productName: string;
  quantity: number;
  subtotal: number;
  selectedOptionsJson?: string | null;
}

export interface PrintableOrder {
  orderNo: string;
  externalOrderNo?: string | null;
  createdAt: string;
  channelGpPercent?: number;
  subtotal: number;
  pointDiscount?: number;
  netTotal: number;
  channel?: { name: string } | null;
  cashier?: { name: string } | null;
  items?: PrintableOrderItem[];
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const parseOptions = (json?: string | null): string[] => {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

// ponytail: Chrome's print dialog uses ONE paper size for a whole job — it
// does not honor different @page sizes for different pages within a single
// window.print() call, even with named pages. So each slip/label is printed
// as its own job (one .page per doc), sized to exactly that content. This
// means the printer sees a fresh document per slip and will cut (partial or
// full, per its own driver setting) after every one — verify on hardware.
function printSinglePage(bodyHtml: string): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    // Real (but invisible) size so the document lays out at true 80mm width —
    // required for measuring the slip's height before printing.
    Object.assign(iframe.style, {
      position: 'fixed',
      right: '0',
      bottom: '0',
      width: '340px',
      height: '10px',
      border: '0',
      opacity: '0',
      pointerEvents: 'none',
    });
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) return resolve();

    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;700&display=swap">
      <style>
      @page { size: 80mm auto; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; width: 80mm; background: #fff; color: #000; }
      body { font-family: 'Noto Sans Thai', sans-serif; font-size: 12px; line-height: 1.45; }
      .slip { width: 80mm; padding: 3mm; }
      .center { text-align: center; }
      .row { display: flex; justify-content: space-between; gap: 8px; }
      .dashed { border-top: 1px dashed #000; margin: 5px 0; }
      .solid { border-top: 1px solid #000; margin: 5px 0; }
      .cut { border-top: 1px dashed #000; margin: 7px 0 6px; text-align: center; font-size: 10px; }
      .logo { width: 32mm; display: block; margin: 0 auto 2mm; }
      .big { font-size: 15px; font-weight: bold; }
      .bold { font-weight: bold; }
      .sm { font-size: 10px; }
      .opt { padding-left: 10px; font-size: 10px; }
      .platform-no { font-size: 20px; font-weight: bold; }
      /* Compact cup label: 80mm wide, ~25mm tall */
      .label { min-height: 25mm; padding: 2mm 3mm; border-top: 1px dashed #000; }
      .label-logo { width: 18mm; display: block; margin: 0 auto 1mm; }
      .label-name { font-size: 15px; font-weight: bold; line-height: 1.25; }
      .label-cup { font-size: 11px; }
    </style></head><body>${bodyHtml}</body></html>`);
    doc.close();

    // Wait for the logo image and the web font before opening the print
    // dialog — printing before the font loads silently measures/prints with
    // the fallback font instead.
    const imgs = Array.from(doc.images);
    Promise.all([
      ...imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((res) => {
              img.onload = img.onerror = () => res(null);
            })
      ),
      doc.fonts.ready,
    ]).then(
      // Let layout/fonts settle before measuring
      () => new Promise((res) => setTimeout(res, 100))
    ).then(() => {
      const PX_PER_MM = 96 / 25.4;
      const page = doc.querySelector<HTMLElement>('.page') || doc.body;
      const hMm = Math.ceil(page.getBoundingClientRect().height / PX_PER_MM) + 2;
      const sizeStyle = doc.createElement('style');
      sizeStyle.textContent = `@page { size: 80mm ${hMm}mm; margin: 0; }`;
      doc.head.appendChild(sizeStyle);

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        iframe.remove();
        resolve();
      };
      win.addEventListener('afterprint', finish, { once: true });

      // Force layout to pick up the just-inserted @page rule before printing
      // — calling print() straight after appendChild can snapshot stale
      // page boxes and fall back to the default paper size.
      win.requestAnimationFrame(() => {
        win.requestAnimationFrame(() => {
          win.focus();
          win.print();
          // Fallback in case 'afterprint' never fires (e.g. dialog cancelled
          // in a way the browser doesn't report).
          setTimeout(finish, 5000);
        });
      });
    });
  });
}

/** Prints each body as its own print job, one after another. */
async function printSlips(bodies: string[]) {
  for (const body of bodies) {
    await printSinglePage(body);
  }
}

function receiptHtml(order: PrintableOrder): string {
  const dt = new Date(order.createdAt).toLocaleString('th-TH');

  const itemsHtml = (order.items || [])
    .map((it) => {
      const opts = parseOptions(it.selectedOptionsJson);
      return `
        <div class="row">
          <div>${esc(it.productName)} x${it.quantity}</div>
          <div class="bold">฿${it.subtotal.toFixed(2)}</div>
        </div>
        ${opts.map((o) => `<div class="opt">- ${esc(o)}</div>`).join('')}`;
    })
    .join('');

  const discountHtml =
    (order.pointDiscount ?? 0) > 0
      ? `<div class="row"><span>POINT DISCOUNT:</span><span>-฿${order.pointDiscount!.toFixed(2)}</span></div>`
      : '';

  const platformHtml = order.externalOrderNo
    ? `<div class="center">
        <div>${esc(order.channel?.name || '-')}</div>
        <div class="platform-no">${esc(order.externalOrderNo)}</div>
      </div>`
    : '';

  return `
    <div class="slip page">
      <div class="center">
        <img class="logo" src="/logo_single.png" alt="HAUS BLEND" />
        <div class="sm">Bond St. Muangthongthani</div>
      </div>
      ${platformHtml}
      <div class="dashed"></div>
      <div class="row sm"><span>${esc(dt)}</span><span>${esc(order.orderNo)}</span></div>
      <div class="sm">CHANNEL: ${esc(order.channel?.name || '-')}</div>
      <div class="dashed"></div>
      ${itemsHtml}
      <div class="dashed"></div>
      <div class="row bold"><span>SUBTOTAL:</span><span>฿${order.subtotal.toFixed(2)}</span></div>
      ${discountHtml}
      <div class="solid"></div>
      <div class="row big"><span>TOTAL NET:</span><span>฿${order.netTotal.toFixed(2)}</span></div>
      <div class="dashed"></div>
      <div class="center sm">We brew with ♡</div>
    </div>`;
}

function cupLabelsHtml(order: PrintableOrder): string[] {
  const channelAndPlatform = [order.channel?.name, order.externalOrderNo]
    .filter(Boolean)
    .join(' ');

  const labels: string[] = [];
  for (const it of order.items || []) {
    const opts = parseOptions(it.selectedOptionsJson);
    for (let cup = 1; cup <= it.quantity; cup++) {
      labels.push(`
        <div class="slip page label">
          <img class="label-logo" src="/logo_single.png" alt="HAUS BLEND" />
          <div class="row sm">
            <span>${esc(channelAndPlatform)}</span>
            <span>${esc(order.orderNo)}</span>
          </div>
          <div class="label-name">${esc(it.productName)} <span class="label-cup">(${cup}/${it.quantity})</span></div>
          ${opts.length ? `<div class="sm">${opts.map(esc).join(' · ')}</div>` : ''}
        </div>`);
    }
  }
  return labels;
}

/** Full receipt slip — one per order. */
export function printReceipt(order: PrintableOrder) {
  printSlips([receiptHtml(order)]);
}

/** Cup labels — one small slip per cup (quantity 2 → 2 labels). */
export function printCupLabels(order: PrintableOrder) {
  const labels = cupLabelsHtml(order);
  if (labels.length === 0) return;
  printSlips(labels);
}

/**
 * Receipt first, then every cup label — each printed as its own job so it
 * gets its own correctly-sized page (Citizen CT-D150 etc. cuts after each).
 */
export function printOrderSlips(order: PrintableOrder) {
  printSlips([receiptHtml(order), ...cupLabelsHtml(order)]);
}
