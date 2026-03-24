// Print utility for Tiempos Pro
// Supports: Web Bluetooth ESC/POS printers, browser print fallback

export interface TicketData {
  title: string;
  subtitle?: string;
  lines: { label: string; value: string; bold?: boolean }[];
  footer?: string;
  barcode?: string;
}

/**
 * Generates a printable HTML string for a ticket / report.
 */
export function buildTicketHTML(ticket: TicketData): string {
  const rows = ticket.lines.map(l =>
    `<tr>
      <td style="color:#aaa;font-size:11px;padding:2px 4px;">${l.label}</td>
      <td style="text-align:right;font-size:${l.bold ? '14px' : '12px'};font-weight:${l.bold ? '900' : '600'};padding:2px 4px;">${l.value}</td>
    </tr>`
  ).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Courier New', monospace; width: 80mm; padding: 6mm; background:#fff; color:#000; }
    .center { text-align:center; }
    .title { font-size:20px; font-weight:900; text-transform:uppercase; letter-spacing:2px; }
    .subtitle { font-size:10px; color:#666; text-transform:uppercase; letter-spacing:1px; margin-top:2px; }
    .divider { border:none; border-top:1px dashed #000; margin:8px 0; }
    table { width:100%; border-collapse:collapse; }
    .footer { font-size:9px; color:#888; text-align:center; margin-top:8px; }
    .barcode { font-size:9px; letter-spacing:3px; text-align:center; margin:6px 0; }
    @media print { @page { margin:0; size: 80mm auto; } }
  </style>
</head>
<body>
  <div class="center">
    <div class="title">${ticket.title}</div>
    ${ticket.subtitle ? `<div class="subtitle">${ticket.subtitle}</div>` : ''}
  </div>
  <hr class="divider">
  <table>${rows}</table>
  <hr class="divider">
  ${ticket.barcode ? `<div class="barcode">* ${ticket.barcode} *</div>` : ''}
  ${ticket.footer ? `<div class="footer">${ticket.footer}</div>` : ''}
</body>
</html>`;
}

/**
 * Print using browser's built-in print dialog (works on all devices).
 */
export function printWithBrowser(html: string, title?: string): void {
  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) {
    alert('Por favor, permita ventanas emergentes para imprimir.');
    return;
  }
  win.document.write(html);
  win.document.title = title || 'Tiempos Pro - Ticket';
  win.document.close();
  setTimeout(() => {
    win.focus();
    win.print();
    win.close();
  }, 500);
}

/**
 * Print via Web Bluetooth to ESC/POS thermal printer.
 * Returns true on success, false if Bluetooth not available or user cancelled.
 */
export async function printWithBluetooth(ticket: TicketData): Promise<boolean> {
  // Check if Web Bluetooth API is available
  if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
    return false;
  }

  try {
    // ESC/POS commands
    const ESC = 0x1B;
    const GS = 0x1D;

    const enc = new TextEncoder();

    const initPrinter = [ESC, 0x40]; // Initialize
    const cutPaper = [GS, 0x56, 0x42, 0x00]; // Full cut
    const alignCenter = [ESC, 0x61, 0x01];
    const alignLeft = [ESC, 0x61, 0x00];
    const boldOn = [ESC, 0x45, 0x01];
    const boldOff = [ESC, 0x45, 0x00];
    const nl = [0x0A]; // newline

    const buildBytes = (): Uint8Array => {
      const parts: number[] = [
        ...initPrinter,
        ...alignCenter,
        ...boldOn,
        ...Array.from(enc.encode(ticket.title.toUpperCase() + '\n')),
        ...boldOff,
      ];

      if (ticket.subtitle) {
        parts.push(...Array.from(enc.encode(ticket.subtitle + '\n')));
      }

      parts.push(...Array.from(enc.encode('--------------------------------\n')));
      parts.push(...alignLeft);

      for (const line of ticket.lines) {
        const label = line.label.padEnd(18, ' ').slice(0, 18);
        const value = line.value.padStart(13, ' ').slice(-13);
        if (line.bold) parts.push(...boldOn);
        parts.push(...Array.from(enc.encode(label + value + '\n')));
        if (line.bold) parts.push(...boldOff);
      }

      parts.push(...Array.from(enc.encode('--------------------------------\n')));

      if (ticket.footer) {
        parts.push(...alignCenter);
        parts.push(...Array.from(enc.encode(ticket.footer + '\n')));
      }

      parts.push(...nl, ...nl, ...nl, ...cutPaper);
      return new Uint8Array(parts);
    };

    // Request Bluetooth device
    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', 
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '0000fee7-0000-1000-8000-00805f9b34fb',
        '0000ff00-0000-1000-8000-00805f9b34fb'
      ]
    });

    const server = await device.gatt.connect();

    // Try common ESC/POS service UUIDs
    const serviceUUIDs = [
      '000018f0-0000-1000-8000-00805f9b34fb',
      '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
      '0000fee7-0000-1000-8000-00805f9b34fb',
      '0000ff00-0000-1000-8000-00805f9b34fb'
    ];

    let characteristic: any = null;
    for (const svcUUID of serviceUUIDs) {
      try {
        const service = await server.getPrimaryService(svcUUID);
        const chars = await service.getCharacteristics();
        for (const c of chars) {
          if (c.properties.write || c.properties.writeWithoutResponse) {
            characteristic = c;
            break;
          }
        }
        if (characteristic) break;
      } catch (_) { /* try next */ }
    }

    if (!characteristic) {
      throw new Error('No se encontró una característica de escritura compatible.');
    }

    const data = buildBytes();

    // Write in 512-byte chunks
    // Write in chunks to avoid GATT operation errors
    const CHUNK = 100; // Smaller chunk size helps prevent Windows buffer overflows
    for (let i = 0; i < data.length; i += CHUNK) {
      const chunk = data.slice(i, i + CHUNK);
      try {
          if (characteristic.properties.writeWithoutResponse) {
             await characteristic.writeValueWithoutResponse(chunk);
          } else {
             await characteristic.writeValue(chunk);
          }
          // Small delay to let the printer buffer digest the chunk
          await new Promise(r => setTimeout(r, 20));
      } catch (e) {
          console.warn("Retrying chunk after small error", e);
          await new Promise(r => setTimeout(r, 50));
          await characteristic.writeValue(chunk);
      }
    }

    return true;
  } catch (err: any) {
    console.error('Bluetooth print error:', err);
    if (err.name !== 'NotFoundError' && err.name !== 'NotSupportedError') {
      alert(`Error conectando a la impresora Bluetooth: ${err.message}. Revise que esté encendida y emparejada a este equipo.`);
    }
    return false;
  }
}

/**
 * Main print function: tries Bluetooth first if requested, falls back to browser print.
 */
export async function printTicket(ticket: TicketData, preferBluetooth = false): Promise<void> {
  if (preferBluetooth) {
    const btSuccess = await printWithBluetooth(ticket);
    if (btSuccess) return;
    // Fallback
    alert('Bluetooth no disponible o cancelado. Se usará la impresión del navegador.');
  }
  const html = buildTicketHTML(ticket);
  printWithBrowser(html, ticket.title);
}
