// Generates an embossed leather book cover -> src/assets/cover.svg
// Grain via SVG turbulence; frame + 4 emblems "pressed" into leather using offset light/dark strokes.
import { writeFileSync } from 'node:fs';

const W = 600, H = 740;
const DARK = '#231307', LIGHT = '#c39a5e';        // groove shadow / lit lip
const OFF = 1.8;                                   // highlight offset (light catches lower lip)

// engrave(inner): inner is SVG geometry (fill:none strokes). Returns lit copy (offset) under a dark copy.
function engrave(inner, sw, op = 0.9) {
  return `<g stroke="${LIGHT}" stroke-width="${sw}" fill="none" opacity="0.5" transform="translate(0 ${OFF})">${inner}</g>`
       + `<g stroke="${DARK}" stroke-width="${sw}" fill="none" opacity="${op}">${inner}</g>`;
}

function heartEmblem(x, y, s) {
  const cx = x + s / 2, cy = y + s / 2, sc = s * 0.0066;
  const tx = (cx - 50 * sc).toFixed(1), ty = (cy - 46 * sc).toFixed(1);
  const heart = 'M50 84 C20 64 6 46 6 30 C6 16 17 8 28 8 C37 8 45 14 50 22 C55 14 63 8 72 8 C83 8 94 16 94 30 C94 46 80 64 50 84 Z';
  // stroke is scaled by sc inside the transform, so divide to keep a ~3.4px engraved line
  return engrave(`<path transform="translate(${tx} ${ty}) scale(${sc.toFixed(3)})" stroke-width="${(3.4 / sc).toFixed(1)}" d="${heart}"/>`, 3.4);
}

function crownEmblem(x, y, s) {
  const cx = x + s / 2, cy = y + s / 2, w = s * 0.56, h = s * 0.42;
  const left = cx - w / 2, right = cx + w / 2, top = cy - h / 2, bot = cy + h / 2;
  const mid = top + h * 0.58, peakSide = top + h * 0.2;
  const pL = cx - w * 0.3, pR = cx + w * 0.3;
  const body =
    `M${left} ${bot} L${left} ${mid} L${pL} ${peakSide} L${cx - w * 0.13} ${mid} ` +
    `L${cx} ${top} L${cx + w * 0.13} ${mid} L${pR} ${peakSide} L${right} ${mid} L${right} ${bot} Z`;
  const band = `<line x1="${left + 3}" y1="${bot - h * 0.16}" x2="${right - 3}" y2="${bot - h * 0.16}"/>`;
  const balls = `<circle cx="${pL}" cy="${peakSide - 4}" r="3"/><circle cx="${cx}" cy="${top - 4}" r="3.4"/><circle cx="${pR}" cy="${peakSide - 4}" r="3"/>`;
  return engrave(`<path d="${body}"/>${band}${balls}`, 3.2);
}

// emblem panels: subtle raised square (engraved border) holding a motif
function panel(x, y, s, motif) {
  return engrave(`<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="5"/>`, 4) + motif(x, y, s);
}

const s = 132, gap = 14;
const gx = (W - (s * 2 + gap)) / 2, gy = Math.round((H - (s * 2 + gap)) / 2) + 10;
const emblems =
  panel(gx, gy, s, heartEmblem) +
  panel(gx + s + gap, gy, s, crownEmblem) +
  panel(gx, gy + s + gap, s, crownEmblem) +
  panel(gx + s + gap, gy + s + gap, s, heartEmblem);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="hide" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7c5230"/><stop offset="0.5" stop-color="#603e20"/><stop offset="1" stop-color="#3c2410"/>
    </linearGradient>
    <radialGradient id="lit" cx="50%" cy="34%" r="72%">
      <stop offset="0" stop-color="#8a5c33" stop-opacity="0.85"/>
      <stop offset="55%" stop-color="#6a431f" stop-opacity="0"/>
      <stop offset="100%" stop-color="#160c05" stop-opacity="0.7"/>
    </radialGradient>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.86" numOctaves="2" seed="11" stitchTiles="stitch" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0"/></filter>
    <filter id="mottle"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="3" seed="4" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.7 0"/></filter>
  </defs>

  <rect width="${W}" height="${H}" rx="12" fill="url(#hide)"/>
  <rect width="${W}" height="${H}" rx="12" filter="url(#mottle)" opacity="0.22" fill="#3a2310"/>
  <rect width="${W}" height="${H}" rx="12" filter="url(#grain)" opacity="0.10" style="mix-blend-mode:multiply"/>
  <rect width="${W}" height="${H}" rx="12" fill="url(#lit)"/>

  ${engrave(`<rect x="34" y="42" width="${W-68}" height="${H-84}" rx="8"/>`, 5)}
  ${engrave(`<rect x="52" y="60" width="${W-104}" height="${H-120}" rx="6"/>`, 2.4, 0.7)}

  ${emblems}

  <rect width="${W}" height="${H}" rx="12" fill="none" stroke="#1a0e04" stroke-width="2" opacity="0.6"/>
</svg>`;

writeFileSync(new URL('./src/assets/cover.svg', import.meta.url), svg);
console.log('cover.svg written (' + Math.round(svg.length / 1024) + ' KB)');
