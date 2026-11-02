import QRCode from 'qrcode';

/** Quiet zone of 2 modules, black on white. Used for Wi-Fi join and table stickers. */
export function qrModules(text: string, size = 176): { path: string; size: number } {
  const code = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const count = code.modules.size;
  const quiet = 2;
  const moduleSize = size / (count + quiet * 2);
  let path = '';
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (!code.modules.get(row, column)) continue;
      const x = ((column + quiet) * moduleSize).toFixed(2);
      const y = ((row + quiet) * moduleSize).toFixed(2);
      path += `M${x} ${y}h${moduleSize.toFixed(2)}v${moduleSize.toFixed(2)}h-${moduleSize.toFixed(2)}z`;
    }
  }
  return { path, size };
}

export function qrSvg(text: string, size = 176): string {
  const drawn = qrModules(text, size);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${drawn.size}" height="${drawn.size}" viewBox="0 0 ${drawn.size} ${drawn.size}"><rect width="100%" height="100%" fill="#fff"/><path d="${drawn.path}" fill="#111"/></svg>`;
}
