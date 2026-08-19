// Ícones SVG 24x24, paleta curta (ink / accent / gold / danger). Sem texto.
const INK = '#c8d0b8';
const ACCENT = '#6a8a48';
const GOLD = '#b49a48';
const DANGER = '#b05048';
const DARK = '#2a3220';

export const icons = {
  money: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="7" width="16" height="11" fill="${GOLD}"/>
  <rect x="6" y="9" width="12" height="7" fill="${DARK}"/>
  <rect x="10" y="11" width="4" height="3" fill="${GOLD}"/>
</svg>`,

  water: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 3L18 14H6Z" fill="${INK}"/>
  <rect x="7" y="15" width="10" height="5" fill="${ACCENT}"/>
</svg>`,

  sun: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="9" y="9" width="6" height="6" fill="${GOLD}"/>
  <rect x="11" y="3" width="2" height="4" fill="${GOLD}"/>
  <rect x="11" y="17" width="2" height="4" fill="${GOLD}"/>
  <rect x="3" y="11" width="4" height="2" fill="${GOLD}"/>
  <rect x="17" y="11" width="4" height="2" fill="${GOLD}"/>
  <rect x="5" y="5" width="2" height="2" fill="${GOLD}"/>
  <rect x="17" y="5" width="2" height="2" fill="${GOLD}"/>
  <rect x="5" y="17" width="2" height="2" fill="${GOLD}"/>
  <rect x="17" y="17" width="2" height="2" fill="${GOLD}"/>
</svg>`,

  moon: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M14 4A8 8 0 1 0 20 14A6.2 6.2 0 0 1 14 4Z" fill="${INK}"/>
</svg>`,

  plant: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="11" y="10" width="2" height="11" fill="${DARK}"/>
  <path d="M12 4L18 12H6Z" fill="${ACCENT}"/>
  <path d="M12 8L20 14H12Z" fill="${ACCENT}"/>
</svg>`,

  water_tool: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="7" width="11" height="4" fill="${INK}"/>
  <rect x="12" y="5" width="8" height="3" fill="${INK}"/>
  <rect x="9" y="13" width="2" height="3" fill="${ACCENT}"/>
  <rect x="12" y="16" width="2" height="3" fill="${ACCENT}"/>
  <rect x="7" y="18" width="2" height="3" fill="${ACCENT}"/>
</svg>`,

  harvest: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M5 5L19 8L13 20L4 10Z" fill="${INK}"/>
  <rect x="4" y="10" width="3" height="10" fill="${DARK}"/>
</svg>`,

  shop: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="10" width="16" height="10" fill="${INK}"/>
  <path d="M3 6H21L19 10H5Z" fill="${GOLD}"/>
  <rect x="10" y="14" width="4" height="6" fill="${DARK}"/>
</svg>`,

  upgrades: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 3L21 10V21H3V10Z" fill="${INK}"/>
  <rect x="10" y="13" width="4" height="8" fill="${DARK}"/>
  <rect x="11" y="5" width="2" height="4" fill="${GOLD}"/>
</svg>`,

  close: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="11" width="12" height="2" fill="${INK}" transform="rotate(45 12 12)"/>
  <rect x="6" y="11" width="12" height="2" fill="${INK}" transform="rotate(-45 12 12)"/>
</svg>`,

  carrot: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 8L18 20H6Z" fill="${GOLD}"/>
  <rect x="9" y="3" width="2" height="6" fill="${ACCENT}"/>
  <rect x="13" y="3" width="2" height="6" fill="${ACCENT}"/>
</svg>`,

  corn: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="9" y="4" width="6" height="14" fill="${GOLD}"/>
  <rect x="7" y="8" width="3" height="10" fill="${ACCENT}"/>
  <rect x="14" y="8" width="3" height="10" fill="${ACCENT}"/>
</svg>`,

  pumpkin: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="5" y="8" width="14" height="11" fill="${GOLD}"/>
  <rect x="11" y="4" width="2" height="5" fill="${ACCENT}"/>
</svg>`,

  house: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="11" width="12" height="9" fill="${INK}"/>
  <path d="M4 12L12 5L20 12Z" fill="${DANGER}"/>
  <rect x="10" y="14" width="4" height="6" fill="${DARK}"/>
</svg>`,

  droplet_full: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 3L19 14A7 7 0 1 1 5 14Z" fill="${ACCENT}"/>
</svg>`,

  car: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="11" width="18" height="6" fill="${ACCENT}"/>
  <rect x="7" y="7" width="10" height="4" fill="${INK}"/>
  <rect x="5" y="16" width="4" height="3" fill="${DARK}"/>
  <rect x="15" y="16" width="4" height="3" fill="${DARK}"/>
</svg>`,

  chicken: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="5" y="10" width="11" height="8" fill="${INK}"/>
  <rect x="14" y="6" width="5" height="6" fill="${INK}"/>
  <rect x="18" y="8" width="3" height="2" fill="${GOLD}"/>
  <rect x="15" y="7" width="2" height="2" fill="${DARK}"/>
</svg>`,

  cow: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="9" width="14" height="8" fill="${INK}"/>
  <rect x="15" y="7" width="6" height="6" fill="${INK}"/>
  <rect x="6" y="11" width="4" height="3" fill="${DARK}"/>
  <rect x="5" y="17" width="2" height="3" fill="${DARK}"/>
  <rect x="13" y="17" width="2" height="3" fill="${DARK}"/>
</svg>`,

  egg: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="12" cy="13" rx="5" ry="7" fill="${INK}"/>
</svg>`,

  milk: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="3" width="8" height="3" fill="${INK}"/>
  <path d="M8 6L6 10V20H18V10L16 6Z" fill="${INK}"/>
  <rect x="7" y="12" width="10" height="7" fill="${ACCENT}"/>
</svg>`,

  weed: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="11" y="8" width="2" height="13" fill="${DARK}"/>
  <path d="M12 6L4 12V8Z" fill="${ACCENT}"/>
  <path d="M12 6L20 12V8Z" fill="${ACCENT}"/>
</svg>`,

  wheat: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="11" y="4" width="2" height="17" fill="${GOLD}"/>
  <rect x="7" y="6" width="4" height="2" fill="${GOLD}"/>
  <rect x="13" y="6" width="4" height="2" fill="${GOLD}"/>
  <rect x="6" y="10" width="5" height="2" fill="${GOLD}"/>
  <rect x="13" y="10" width="5" height="2" fill="${GOLD}"/>
  <rect x="6" y="14" width="5" height="2" fill="${GOLD}"/>
  <rect x="13" y="14" width="5" height="2" fill="${GOLD}"/>
</svg>`,

  beet: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="10" width="8" height="10" fill="${DANGER}"/>
  <rect x="10" y="3" width="2" height="8" fill="${ACCENT}"/>
  <rect x="13" y="4" width="2" height="7" fill="${ACCENT}"/>
</svg>`,

  sheep: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="8" width="13" height="9" fill="${INK}"/>
  <rect x="15" y="10" width="5" height="5" fill="${DARK}"/>
  <rect x="6" y="17" width="2" height="3" fill="${DARK}"/>
  <rect x="13" y="17" width="2" height="3" fill="${DARK}"/>
</svg>`,

  wool: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="6" width="6" height="6" fill="${INK}"/>
  <rect x="12" y="7" width="6" height="6" fill="${INK}"/>
  <rect x="7" y="12" width="10" height="7" fill="${INK}"/>
</svg>`,

  well: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 8L12 3L20 8Z" fill="${INK}"/>
  <rect x="6" y="10" width="12" height="9" fill="${DARK}"/>
  <rect x="9" y="16" width="6" height="2" fill="${ACCENT}"/>
</svg>`,

  fertilizer: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="5" width="12" height="3" fill="${DARK}"/>
  <path d="M7 8H17L16 20H8Z" fill="${ACCENT}"/>
</svg>`,

  gov: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 3L20 7V13C20 18 12 21 12 21C12 21 4 18 4 13V7Z" fill="${INK}"/>
  <rect x="10" y="10" width="4" height="4" fill="${GOLD}"/>
</svg>`,

  wolf: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 14L7 6L12 10L17 6L21 14L12 18Z" fill="${DARK}"/>
  <rect x="8" y="11" width="2" height="2" fill="${GOLD}"/>
  <rect x="14" y="11" width="2" height="2" fill="${GOLD}"/>
</svg>`,

  play: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M8 5L19 12L8 19Z" fill="${ACCENT}"/>
</svg>`,

  settings: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="3" width="4" height="18" fill="${INK}"/>
  <rect x="3" y="10" width="18" height="4" fill="${INK}"/>
  <rect x="8" y="8" width="8" height="8" fill="${GOLD}"/>
</svg>`,

  save: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M5 4H16L20 8V20H5Z" fill="${INK}"/>
  <rect x="8" y="4" width="7" height="5" fill="${DARK}"/>
  <rect x="8" y="13" width="8" height="6" fill="${DARK}"/>
</svg>`,

  audio: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="9" width="5" height="6" fill="${INK}"/>
  <path d="M9 9L15 5V19L9 15Z" fill="${INK}"/>
  <rect x="17" y="8" width="2" height="8" fill="${GOLD}"/>
</svg>`,

  energy: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M13 2L6 13H12L11 22L18 10H12Z" fill="${GOLD}"/>
</svg>`,

  heart: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 20L4 12V8H9L12 11L15 8H20V12Z" fill="${DANGER}"/>
</svg>`,

  graphics: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="5" width="18" height="11" fill="${INK}"/>
  <rect x="5" y="7" width="14" height="7" fill="${DARK}"/>
  <path d="M5 14L9 10L12 13L15 10L19 14V15H5Z" fill="${ACCENT}"/>
  <rect x="9" y="16" width="6" height="3" fill="${DARK}"/>
</svg>`,

  keyboard: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="7" width="18" height="11" fill="${INK}"/>
  <rect x="5" y="9" width="2" height="2" fill="${DARK}"/>
  <rect x="8" y="9" width="2" height="2" fill="${DARK}"/>
  <rect x="11" y="9" width="2" height="2" fill="${DARK}"/>
  <rect x="14" y="9" width="2" height="2" fill="${DARK}"/>
  <rect x="17" y="9" width="2" height="2" fill="${DARK}"/>
  <rect x="6" y="13" width="12" height="2" fill="${DARK}"/>
</svg>`
};

export function svgIcon(name, extraClass) {
  const markup = icons[name] || '';
  return markup.replace('<svg ', `<svg class="icon-svg${extraClass ? ' ' + extraClass : ''}" `);
}
