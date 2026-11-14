import type { Table } from '@/lib/api/types';
import { qrSvg } from '@/lib/qrSvg';

export type TableCardTemplate = 'folded_tent' | 'sticker' | 'acrylic_stand';

export type TableCardSettings = {
  template: TableCardTemplate;
  accentColor: string;
  ctaText: string;
  /** The short line on stands and stickers, such as "Scan to order". */
  shortText: string;
  /** The venue's logo; the card leaves the space out when there is none. */
  logoUrl?: string | null;
};

/** The paper each style prints on (canvas notes): tent A5 folded, stand A6, sticker 10 cm round. */
export const PAGE_SIZE: Record<TableCardTemplate, string> = {
  folded_tent: 'A5',
  acrylic_stand: 'A6',
  sticker: '110mm 110mm',
};

const FALLBACK = '#D24000';
const HEX = /^#[0-9A-Fa-f]{6}$/;

// Names come from the owner and are printed as HTML, so escape them before they go in.
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** One face of a tent card: logo, venue, black table pill, QR, the line under it. */
function tentFace(
  venue: string,
  label: string,
  qr: string,
  cta: string,
  logo: string,
  accent: string,
) {
  return `<div class="tent" style="border-top-color:${accent}">${logo}<div class="venue">${venue}</div><div class="pill">${label}</div><div class="qr">${qr}</div><div class="cta">${cta}</div></div>`;
}

/**
 * Print-ready table cards in the canvas styles. A QR code must stay black on white for phone
 * cameras, so only the accent bar, header or ring takes the colour.
 */
export function generateTableCardHtml(
  tables: Table[],
  rawSettings: TableCardSettings,
  rawVenueName: string,
): string {
  const venue = escapeHtml(rawVenueName);
  const cta = escapeHtml(rawSettings.ctaText);
  const short = escapeHtml(rawSettings.shortText);
  // The colour goes into CSS, so only a plain hex code is let through.
  const accent = HEX.test(rawSettings.accentColor) ? rawSettings.accentColor : FALLBACK;
  const template = rawSettings.template;
  const logo = rawSettings.logoUrl
    ? `<img class="logo" src="${escapeHtml(rawSettings.logoUrl)}" alt="">`
    : '';

  const cards = tables
    .map((table) => {
      const qr = table.qrUrl ? qrSvg(table.qrUrl, 220) : '';
      const label = escapeHtml(table.label || `Table ${table.code}`);
      if (template === 'sticker') {
        return `<div class="page"><div class="sticker" style="border-color:${accent}"><div class="kicker">${short}</div><div class="qr">${qr}</div><div class="big">${label}</div><div class="small">${venue}</div></div></div>`;
      }
      if (template === 'acrylic_stand') {
        return `<div class="page"><div class="stand"><div class="head" style="background:${accent}"><div class="venue">${venue}</div><div class="big">${label}</div></div><div class="qr">${qr}</div><div class="small">${short}</div></div></div>`;
      }
      // A tent folds in half, so the top face is printed upside down to read right once folded.
      const face = tentFace(venue, label, qr, cta, logo, accent);
      return `<div class="page fold"><div class="flip">${face}</div><div class="line"></div>${face}</div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${venue} - Table cards</title>
<style>
@page { size: ${PAGE_SIZE[template]}; margin: 0; }
body { margin: 0; font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #111111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; box-sizing: border-box; padding: 6mm; }
.fold { justify-content: space-around; }
.flip { transform: rotate(180deg); }
.line { width: 100%; border-top: 1px dashed #A1A1AA; }
.tent { width: 100mm; background: #FFFFFF; border-top: 6px solid; border-radius: 4px; padding: 6mm; display: flex; flex-direction: column; align-items: center; gap: 3mm; text-align: center; }
.logo { width: 12mm; height: 12mm; object-fit: contain; }
.venue { font-size: 16pt; font-weight: 600; }
.pill { font-size: 13pt; font-weight: 600; color: #FFFFFF; background: #111111; padding: 1mm 4mm; border-radius: 4mm; }
.qr svg { width: 60mm; height: 60mm; display: block; }
.cta { font-size: 9pt; color: #52525B; }
.stand { width: 90mm; border: 1px solid #E4E4E7; border-radius: 4mm; overflow: hidden; display: flex; flex-direction: column; align-items: center; text-align: center; }
.stand .head { align-self: stretch; padding: 5mm 4mm; color: #FFFFFF; }
.stand .venue { font-size: 13pt; } .stand .big { font-size: 20pt; font-weight: 600; }
.stand .qr { margin: 5mm 0 3mm; } .stand .qr svg { width: 55mm; height: 55mm; }
.small { font-size: 8pt; color: #52525B; margin-bottom: 5mm; }
.sticker { width: 100mm; height: 100mm; box-sizing: border-box; border-radius: 50%; border: 7mm solid; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5mm; text-align: center; }
.kicker { font-size: 8pt; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #52525B; }
.sticker .qr svg { width: 45mm; height: 45mm; }
.sticker .big { font-size: 15pt; font-weight: 600; } .sticker .small { margin: 0; }
</style>
</head>
<body>
${cards}
</body>
</html>`;
}
