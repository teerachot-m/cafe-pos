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

function printHtml(bodyHtml: string) {
  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
  });
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) return;

  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; width: 80mm; background: #fff; color: #000; }
    body { font-family: 'Courier New', 'Sarabun', monospace; font-size: 12px; line-height: 1.45; }
    .slip { width: 80mm; padding: 3mm; }
    /* Each .page ends with a page break → printers with an auto-cutter
       (e.g. Citizen CT-D150 with "cut per page" enabled) cut after every slip. */
    .page { break-after: page; page-break-after: always; }
    .page:last-child { break-after: auto; page-break-after: auto; }
    .center { text-align: center; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .dashed { border-top: 1px dashed #000; margin: 5px 0; }
    .solid { border-top: 1px solid #000; margin: 5px 0; }
    .cut { border-top: 1px dashed #000; margin: 7px 0 6px; text-align: center; font-size: 10px; }
    .logo { width: 32mm; display: block; margin: 0 auto 2mm; }
    .logo-sm { width: 22mm; display: block; margin: 0 auto 1mm; }
    .big { font-size: 15px; font-weight: bold; }
    .bold { font-weight: bold; }
    .sm { font-size: 10px; }
    .opt { padding-left: 10px; font-size: 10px; }
  </style></head><body>${bodyHtml}</body></html>`);
  doc.close();

  // Wait for the logo image before opening the print dialog
  const imgs = Array.from(doc.images);
  Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((res) => {
            img.onload = img.onerror = () => res(null);
          })
    )
  ).then(() => {
    win.focus();
    win.print();
    setTimeout(() => iframe.remove(), 3000);
  });
}

function receiptHtml(order: PrintableOrder): string {
  const dt = new Date(order.createdAt).toLocaleString('th-TH');
  const gp = order.channelGpPercent ?? 0;

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

  return `
    <div class="slip page">
      <div class="center">
        <img class="logo" src="/logo_single.png" alt="HAUS BLEND" />
        <div class="sm">Bangkok, Thailand</div>
        <div class="sm">TEL: 02-123-4567</div>
      </div>
      <div class="dashed"></div>
      <div class="sm">
        <div>ORDER #: ${esc(order.orderNo)}</div>
        <div>DATE: ${esc(dt)}</div>
        <div>CHANNEL: ${esc(order.channel?.name || '-')}${gp > 0 ? ` (GP ${gp}%)` : ''}</div>
        ${order.cashier?.name ? `<div>CASHIER: ${esc(order.cashier.name)}</div>` : ''}
      </div>
      <div class="dashed"></div>
      ${itemsHtml}
      <div class="dashed"></div>
      <div class="row bold"><span>SUBTOTAL:</span><span>฿${order.subtotal.toFixed(2)}</span></div>
      ${discountHtml}
      <div class="solid"></div>
      <div class="row big"><span>TOTAL NET:</span><span>฿${order.netTotal.toFixed(2)}</span></div>
      <div class="dashed"></div>
      <div class="center sm">THANK YOU FOR YOUR VISIT!</div>
    </div>`;
}

function cupLabelsHtml(order: PrintableOrder): string[] {
  const time = new Date(order.createdAt).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const labels: string[] = [];
  for (const it of order.items || []) {
    const opts = parseOptions(it.selectedOptionsJson);
    for (let cup = 1; cup <= it.quantity; cup++) {
      labels.push(`
        <div class="slip page">
          <img class="logo-sm" src="/logo_single.png" alt="HAUS BLEND" />
          <div class="row sm"><span>${esc(order.orderNo)}</span><span>${esc(time)}</span></div>
          <div class="big">${esc(it.productName)}</div>
          ${opts.map((o) => `<div class="opt">- ${esc(o)}</div>`).join('')}
          <div class="row sm">
            <span>แก้ว ${cup}/${it.quantity}</span>
            <span>${esc(order.channel?.name || '')}</span>
          </div>
          <div class="cut">✂ - - - - - - - - - - - - - - - - ✂</div>
        </div>`);
    }
  }
  return labels;
}

/** Full receipt slip — one per order. */
export function printReceipt(order: PrintableOrder) {
  printHtml(receiptHtml(order));
}

/** Cup labels — one small slip per cup (quantity 2 → 2 labels). */
export function printCupLabels(order: PrintableOrder) {
  const labels = cupLabelsHtml(order);
  if (labels.length === 0) return;
  printHtml(labels.join(''));
}

/**
 * One print job: receipt first, then every cup label.
 * Each slip is its own printed page, so printers with an auto-cutter
 * (Citizen CT-D150 etc., driver set to cut per page) cut between slips.
 */
export function printOrderSlips(order: PrintableOrder) {
  printHtml(receiptHtml(order) + cupLabelsHtml(order).join(''));
}
