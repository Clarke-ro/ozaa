import type { Table } from '@/lib/api/types';
import { qrSvg } from '@/lib/qrSvg';

export type TableCardTemplate = 'folded_tent' | 'sticker' | 'acrylic_stand';

export type TableCardSettings = {
  template: TableCardTemplate;
  accentColor: string;
  ctaText: string;
};

export function generateTableCardHtml(
  tables: Table[],
  settings: TableCardSettings,
  venueName: string
): string {
  const cardsHtml = tables
    .map((table) => {
      const qr = table.qrUrl ? qrSvg(table.qrUrl, 200) : '';
      const label = table.label || `Table ${table.code}`;

      if (settings.template === 'sticker') {
        return `
        <div class="card sticker">
          <div class="header" style="background-color: ${settings.accentColor};">
            <h1>${venueName}</h1>
          </div>
          <div class="qr-box">${qr}</div>
          <div class="table-badge">${label}</div>
          <div class="cta">${settings.ctaText}</div>
        </div>
        `;
      }

      if (settings.template === 'acrylic_stand') {
        return `
        <div class="card acrylic">
          <div class="top-brand">
            <span class="dot" style="background-color: ${settings.accentColor};"></span>
            <h2>${venueName}</h2>
          </div>
          <div class="table-title">${label}</div>
          <div class="qr-box">${qr}</div>
          <div class="cta-pill" style="color: ${settings.accentColor}; border-color: ${settings.accentColor};">
            ${settings.ctaText}
          </div>
          <div class="footer-note">No app download required · Scan with camera</div>
        </div>
        `;
      }

      // Default: folded_tent (with fold line indicator)
      return `
      <div class="tent-card-page">
        <!-- Back Face (Inverted when folded) -->
        <div class="card tent-side back">
          <div class="header-band" style="background-color: ${settings.accentColor};"></div>
          <div class="brand">${venueName}</div>
          <div class="table-badge">${label}</div>
          <div class="qr-box">${qr}</div>
          <div class="cta">${settings.ctaText}</div>
        </div>

        <div class="fold-line">
          <span>✁ FOLD LINE ✁</span>
        </div>

        <!-- Front Face -->
        <div class="card tent-side front">
          <div class="header-band" style="background-color: ${settings.accentColor};"></div>
          <div class="brand">${venueName}</div>
          <div class="table-badge">${label}</div>
          <div class="qr-box">${qr}</div>
          <div class="cta">${settings.ctaText}</div>
          <div class="footer-note">Powered by Ozaa</div>
        </div>
      </div>
      `;
    })
    .join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${venueName} - Table Cards</title>
  <style>
    @page {
      size: A6;
      margin: 8mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #111111;
      background: #FFFFFF;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .card {
      border: 1.5px solid #E4E4E7;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      box-sizing: border-box;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .header-band {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      margin-bottom: 12px;
    }
    .brand {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }
    .table-badge {
      display: inline-block;
      font-size: 24px;
      font-weight: 800;
      background: #111111;
      color: #FFFFFF;
      padding: 4px 16px;
      border-radius: 8px;
      margin: 8px 0;
    }
    .qr-box {
      margin: 12px 0;
    }
    .cta {
      font-size: 14px;
      font-weight: 600;
      margin-top: 6px;
    }
    .cta-pill {
      font-size: 13px;
      font-weight: 700;
      border: 1.5px solid;
      padding: 6px 14px;
      border-radius: 20px;
      margin-top: 10px;
    }
    .footer-note {
      font-size: 10px;
      color: #71717A;
      margin-top: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .fold-line {
      border-top: 1px dashed #A1A1AA;
      text-align: center;
      margin: 20px 0;
      color: #71717A;
      font-size: 9px;
      letter-spacing: 1px;
    }
    .tent-card-page {
      page-break-after: always;
    }
    .tent-side {
      border: 1px solid #E4E4E7;
      border-radius: 8px;
      padding: 14px;
      margin: 6px 0;
    }
    .tent-side.back {
      transform: rotate(180deg);
    }
  </style>
</head>
<body>
  ${cardsHtml}
</body>
</html>
  `.trim();
}
