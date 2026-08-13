// Ícones SVG desenhados à mão (flat colorido), 24x24, sem dependências externas.
export const icons = {
  money: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="12" cy="13" rx="9" ry="7" fill="#e0a83a"/>
  <ellipse cx="12" cy="12" rx="9" ry="7" fill="#f4c04a"/>
  <ellipse cx="12" cy="12" rx="6.2" ry="4.6" fill="#e0a83a"/>
  <text x="12" y="14.6" font-family="Arial, sans-serif" font-size="7" font-weight="700" text-anchor="middle" fill="#f4c04a">$</text>
</svg>`,

  water: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2C12 2 5 11.2 5 15.5C5 19.6 8.1 22 12 22C15.9 22 19 19.6 19 15.5C19 11.2 12 2 12 2Z" fill="#2f8fd8"/>
  <path d="M12 5.2C12 5.2 7.3 12 7.3 15.6C7.3 18.4 9.4 20.2 12 20.2C14.6 20.2 16.7 18.4 16.7 15.6C16.7 12 12 5.2 12 5.2Z" fill="#5bb3ec"/>
  <ellipse cx="9.6" cy="15.6" rx="1.7" ry="2.4" fill="#bfe6fa" opacity="0.7"/>
</svg>`,

  sun: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="5.2" fill="#ffc93c"/>
  <circle cx="12" cy="12" r="5.2" fill="none"/>
  <g stroke="#ffc93c" stroke-width="2" stroke-linecap="round">
    <line x1="12" y1="1.5" x2="12" y2="4.3"/>
    <line x1="12" y1="19.7" x2="12" y2="22.5"/>
    <line x1="1.5" y1="12" x2="4.3" y2="12"/>
    <line x1="19.7" y1="12" x2="22.5" y2="12"/>
    <line x1="4.4" y1="4.4" x2="6.3" y2="6.3"/>
    <line x1="17.7" y1="17.7" x2="19.6" y2="19.6"/>
    <line x1="4.4" y1="19.6" x2="6.3" y2="17.7"/>
    <line x1="17.7" y1="6.3" x2="19.6" y2="4.4"/>
  </g>
</svg>`,

  moon: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M20.5 14.5A9 9 0 1 1 9.5 3.5C8 6 8.4 10 11.2 12.8C14 15.6 18 16 20.5 14.5Z" fill="#cdd6f0"/>
  <circle cx="10.5" cy="9" r="0.9" fill="#a9b4dc"/>
  <circle cx="14.5" cy="14" r="1.1" fill="#a9b4dc"/>
</svg>`,

  plant: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 21C4 21 3.3 14 8.4 11.3C13.5 8.6 20 9 20 9C20 9 19.6 15.5 14.5 18.2C10.5 20.3 4 21 4 21Z" fill="#4caf50"/>
  <path d="M4 21C4 21 4.7 15.4 9 12.5" stroke="#2e7d32" stroke-width="1.3" fill="none" stroke-linecap="round"/>
  <path d="M4 21C4 21 4.6 17.5 3.2 13.8C1.8 10.1 -1 8 -1 8" stroke="#2e7d32" stroke-width="0" fill="none"/>
  <path d="M4 21C4 21 4.9 16.2 3 12.6C2 10.6 0.2 9.3 0.2 9.3" stroke="#66bb6a" stroke-width="1.3" fill="none" stroke-linecap="round" transform="translate(3.4 0)"/>
  <circle cx="4" cy="21.3" r="1.6" fill="#6b4a2e"/>
</svg>`,

  water_tool: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 8.5C3 8.5 4 7 6.5 7C9 7 9.5 8.6 11.8 8.6C13.4 8.6 14 7.7 14 7.7L15 9.6C15 9.6 14 10.6 11.8 10.6C9.5 10.6 9 9 6.5 9C4.6 9 3.6 9.8 3.6 9.8L3 8.5Z" fill="#8aa1ad"/>
  <path d="M14 6.2L20.5 4.6C20.9 4.5 21.3 4.8 21.2 5.2L20.6 8.1C20.5 8.5 20.1 8.7 19.7 8.6L13.4 8.1L14 6.2Z" fill="#c7ced1"/>
  <path d="M12.8 9L15 9.6L14.3 12.3L12 11.7L12.8 9Z" fill="#9aa5a9"/>
  <g fill="#5bb3ec">
    <circle cx="10" cy="14" r="1"/>
    <circle cx="13" cy="16.3" r="0.8"/>
    <circle cx="8" cy="17.2" r="0.7"/>
    <circle cx="11.5" cy="19.3" r="0.6"/>
  </g>
</svg>`,

  harvest: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M5 4L19 6.5C19.6 6.6 20 7.2 19.7 7.8L14 18.5C13.7 19.1 12.9 19.2 12.4 18.7L4.4 10.7C3.9 10.2 4 9.4 4.6 9L5 4Z" fill="#c9c9c9"/>
  <path d="M5 4L19 6.5C19.6 6.6 20 7.2 19.7 7.8L18.7 9.7L4.6 7.2L5 4Z" fill="#8a8a8a"/>
  <path d="M4.3 9.6L3 20.5C2.95 20.9 3.3 21.2 3.7 21.1L6.2 20.3L4.3 9.6Z" fill="#8a5a35"/>
</svg>`,

  shop: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="3.5" y="10.5" width="17" height="9.5" rx="1" fill="#e8dcc0"/>
  <rect x="5" y="13" width="4.2" height="7" fill="#8a5a35"/>
  <rect x="14.8" y="13" width="4.2" height="4.2" fill="#5bb3ec"/>
  <path d="M2.5 6L4 10.8C4.1 11.6 5.4 11.6 5.6 10.8L6.2 6.3H3.2L2.5 6Z" fill="#c94c3f"/>
  <path d="M6.2 6.3L6.9 10.8C7.1 11.6 8.4 11.6 8.5 10.8L9 6.3H6.2Z" fill="#f4f0e6"/>
  <path d="M9 6.3L9.5 10.8C9.7 11.6 11 11.6 11.1 10.8L11.6 6.3H9Z" fill="#c94c3f"/>
  <path d="M11.6 6.3L12.1 10.8C12.2 11.6 13.6 11.6 13.7 10.8L14.2 6.3H11.6Z" fill="#f4f0e6"/>
  <path d="M14.2 6.3L14.7 10.8C14.9 11.6 16.2 11.6 16.4 10.8L17 6.3H14.2Z" fill="#c94c3f"/>
  <path d="M17 6.3L17.6 10.8C17.8 11.6 19 11.6 19.2 10.8L21.5 6L17 6.3Z" fill="#f4f0e6"/>
  <rect x="2.3" y="4.6" width="19.4" height="2" rx="0.6" fill="#a83232"/>
</svg>`,

  upgrades: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 3L21 9.5V20.5H3V9.5L12 3Z" fill="#f2e6c4"/>
  <path d="M12 3L21 9.5H3L12 3Z" fill="#b23b2e"/>
  <rect x="10" y="14" width="4" height="6.5" fill="#8a5a35"/>
  <rect x="5.5" y="11.5" width="3" height="3" fill="#9fd8f5"/>
  <rect x="15.5" y="11.5" width="3" height="3" fill="#9fd8f5"/>
  <g fill="#f4c04a" stroke="#e0a83a" stroke-width="0.6">
    <path d="M17.5 3.2l0.7 1.4 1.5 0.2-1.1 1.1 0.3 1.5-1.4-0.7-1.4 0.7 0.3-1.5-1.1-1.1 1.5-0.2z"/>
  </g>
</svg>`,

  close: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="10" fill="#d9534f"/>
  <g stroke="#ffffff" stroke-width="2.4" stroke-linecap="round">
    <line x1="8" y1="8" x2="16" y2="16"/>
    <line x1="16" y1="8" x2="8" y2="16"/>
  </g>
</svg>`,

  carrot: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M9.5 3.5C9.5 3.5 11.5 4.5 12 6.2C12.5 4.5 14.5 3.5 14.5 3.5C14.5 3.5 14 6 13 7C15.2 6.4 17 8 17 8C17 8 15 8.6 13.5 8.2C14.3 9 14.6 10.6 14.6 10.6C14.6 10.6 12.8 9.8 12 8.6C11.2 9.8 9.4 10.6 9.4 10.6C9.4 10.6 9.7 9 10.5 8.2C9 8.6 7 8 7 8C7 8 8.8 6.4 11 7C10 6 9.5 3.5 9.5 3.5Z" fill="#4caf50"/>
  <path d="M12 9.5L18 15C18.6 18 15.5 21.5 12.6 21.8C11.4 21.9 10.7 20.8 10.9 19.6C11.3 17.3 9.2 15.6 9.2 15.6L12 9.5Z" fill="#ff7b1c"/>
  <path d="M12 9.5L9.2 15.6C9.2 15.6 8 14.6 7.8 12.8C7.6 11 9 9.6 9 9.6L12 9.5Z" fill="#ff9142"/>
</svg>`,

  corn: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M9 4C9 4 13 3 15.5 5.5C18 8 17.5 12.5 17.5 12.5L7.5 14C7.5 14 6.5 9.5 7.5 7C8 5.7 9 4 9 4Z" fill="#6fae2e"/>
  <ellipse cx="12.3" cy="9.2" rx="4.3" ry="6" transform="rotate(15 12.3 9.2)" fill="#ffd54a"/>
  <g fill="#e8b923">
    <circle cx="10.3" cy="6.2" r="0.55"/><circle cx="12.1" cy="6" r="0.55"/><circle cx="13.9" cy="6.4" r="0.55"/>
    <circle cx="9.7" cy="8" r="0.55"/><circle cx="11.6" cy="7.8" r="0.55"/><circle cx="13.5" cy="8.2" r="0.55"/><circle cx="15.1" cy="8.8" r="0.55"/>
    <circle cx="9.6" cy="9.9" r="0.55"/><circle cx="11.5" cy="9.7" r="0.55"/><circle cx="13.4" cy="10.1" r="0.55"/><circle cx="15.1" cy="10.7" r="0.55"/>
    <circle cx="10" cy="11.7" r="0.55"/><circle cx="11.9" cy="11.6" r="0.55"/><circle cx="13.7" cy="12" r="0.55"/>
  </g>
  <path d="M8 13.5L15.8 12.2L17.2 14.6C17.2 14.6 15.2 15.4 12 15.6C8.8 15.8 7 14.9 7 14.9L8 13.5Z" fill="#6fae2e"/>
</svg>`,

  pumpkin: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M11.5 4.5C11.5 4.5 11.2 2.6 12.3 2C12.6 2.6 12.6 3.6 12.3 4.4" stroke="#4caf50" stroke-width="1.2" fill="none" stroke-linecap="round"/>
  <path d="M8.5 5.5C6 5.7 3.8 8.2 3.8 12C3.8 16.4 7.4 19.6 12 19.6C16.6 19.6 20.2 16.4 20.2 12C20.2 8.2 18 5.7 15.5 5.5C14 5.35 13 6.2 12 6.2C11 6.2 10 5.35 8.5 5.5Z" fill="#ff8a1e"/>
  <path d="M12 6.2C12 6.2 11.3 9.5 11.3 12.5C11.3 15.5 12 19.6 12 19.6" stroke="#e8730a" stroke-width="1" fill="none"/>
  <path d="M8.7 5.9C8.7 5.9 8.1 9.5 8.1 12.5C8.1 15.5 8.9 18.8 8.9 18.8" stroke="#e8730a" stroke-width="1" fill="none" opacity="0.8"/>
  <path d="M15.3 5.9C15.3 5.9 15.9 9.5 15.9 12.5C15.9 15.5 15.1 18.8 15.1 18.8" stroke="#e8730a" stroke-width="1" fill="none" opacity="0.8"/>
</svg>`,

  house: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="5" y="11" width="14" height="9" fill="#f4efe0"/>
  <path d="M3 12L12 4L21 12L19 12L12 6.6L5 12Z" fill="#b23b2e"/>
  <rect x="10.3" y="14.5" width="3.4" height="5.5" fill="#8a5a35"/>
  <rect x="6.5" y="13.2" width="2.2" height="2.2" fill="#9fd8f5"/>
  <rect x="15.3" y="13.2" width="2.2" height="2.2" fill="#9fd8f5"/>
</svg>`,

  droplet_full: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2C12 2 5 11.2 5 15.5C5 19.6 8.1 22 12 22C15.9 22 19 19.6 19 15.5C19 11.2 12 2 12 2Z" fill="#2f8fd8"/>
</svg>`,

  car: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 15.5L4.3 10.8C4.6 9.7 5.6 9 6.7 9H17.3C18.4 9 19.4 9.7 19.7 10.8L21 15.5V18C21 18.6 20.6 19 20 19H19C18.4 19 18 18.6 18 18V17H6V18C6 18.6 5.6 19 5 19H4C3.4 19 3 18.6 3 18V15.5Z" fill="#2e7d32"/>
  <path d="M6 10L7 9H17L18 10L17.2 13H6.8L6 10Z" fill="#9fd8f5"/>
  <circle cx="7" cy="17.5" r="1.7" fill="#222"/>
  <circle cx="17" cy="17.5" r="1.7" fill="#222"/>
</svg>`,

  chicken: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="11" cy="15" rx="7" ry="5.5" fill="#f5f0e0"/>
  <circle cx="16.5" cy="9.5" r="3.4" fill="#f5f0e0"/>
  <path d="M15 6.6C15 6.6 14.6 5 15.6 4.4C16 5.2 16 6 15.7 6.8" fill="#c9403a"/>
  <path d="M19.5 9L22 8.6C22.3 8.55 22.5 8.85 22.35 9.1L21 11.2L19.5 9Z" fill="#e8a83a"/>
  <circle cx="17.6" cy="8.9" r="0.5" fill="#2b2118"/>
  <path d="M4 15C4 15 2 16.5 2.2 19C3.4 18.6 4.6 17.3 4.9 16" fill="#e8dcc0"/>
  <rect x="9.5" y="20" width="0.7" height="2" fill="#e8a83a"/>
  <rect x="12" y="20" width="0.7" height="2" fill="#e8a83a"/>
</svg>`,

  cow: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="9" width="15" height="9" rx="2" fill="#f2ede0"/>
  <ellipse cx="8" cy="12.5" rx="2" ry="1.4" fill="#35302a"/>
  <ellipse cx="13.5" cy="15.5" rx="1.6" ry="1.2" fill="#35302a"/>
  <rect x="15" y="6" width="6" height="6" rx="1.5" fill="#f2ede0"/>
  <path d="M16 5.5C16 5.5 15.6 4 16.4 3.5C16.8 4 16.7 4.8 16.4 5.3" fill="#d8cba0"/>
  <path d="M19.4 5.5C19.4 5.5 19.8 4 19 3.5C18.6 4 18.7 4.8 19 5.3" fill="#d8cba0"/>
  <rect x="19.5" y="8.5" width="3" height="2" rx="0.5" fill="#dcb8a8"/>
  <rect x="4" y="18" width="1.4" height="3" fill="#f2ede0"/>
  <rect x="15" y="18" width="1.4" height="3" fill="#f2ede0"/>
</svg>`,

  egg: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2.5C15 6.5 17.5 12.5 17.5 16C17.5 19.6 15 21.5 12 21.5C9 21.5 6.5 19.6 6.5 16C6.5 12.5 9 6.5 12 2.5Z" fill="#f5eddb"/>
  <path d="M12 2.5C15 6.5 17.5 12.5 17.5 16C17.5 17.6 16.9 18.8 16 19.6C16.6 18.2 16 15.8 14.5 12.8C13.2 10.2 12.3 6.7 12 2.5Z" fill="#e8d9b8" opacity="0.6"/>
</svg>`,

  milk: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M9 2H15V5.5L17 8.5V20.5C17 21.3 16.3 22 15.5 22H8.5C7.7 22 7 21.3 7 20.5V8.5L9 5.5V2Z" fill="#e8f0f5"/>
  <path d="M7 11H17V20.5C17 21.3 16.3 22 15.5 22H8.5C7.7 22 7 21.3 7 20.5V11Z" fill="#dcecf5"/>
  <rect x="9" y="2" width="6" height="2" fill="#5bb3ec"/>
  <text x="12" y="17.5" font-family="Arial, sans-serif" font-size="6" font-weight="700" text-anchor="middle" fill="#7bb8d8">M</text>
</svg>`,

  weed: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 21C12 21 11.5 14 8 11.5C4.5 9 2 9.5 2 9.5C2 9.5 3 13.5 6.5 15.5C9.2 17 12 21 12 21Z" fill="#5c6e34"/>
  <path d="M12 21C12 21 12.5 13.5 16 11C19.5 8.5 22 9.5 22 9.5C22 9.5 21 13.8 17.5 16C14.8 17.7 12 21 12 21Z" fill="#4a5a2a"/>
  <path d="M12 21C12 21 11.7 9.5 12 5C12.3 9.5 12 21 12 21Z" fill="#3d4a24"/>
</svg>`,

  wheat: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 3V21" stroke="#c9b64a" stroke-width="1.4" stroke-linecap="round"/>
  <g fill="#e0c848">
    <ellipse cx="9.5" cy="6" rx="1.6" ry="1" transform="rotate(-30 9.5 6)"/>
    <ellipse cx="14.5" cy="6" rx="1.6" ry="1" transform="rotate(30 14.5 6)"/>
    <ellipse cx="9" cy="9.5" rx="1.7" ry="1.05" transform="rotate(-30 9 9.5)"/>
    <ellipse cx="15" cy="9.5" rx="1.7" ry="1.05" transform="rotate(30 15 9.5)"/>
    <ellipse cx="8.6" cy="13" rx="1.8" ry="1.1" transform="rotate(-30 8.6 13)"/>
    <ellipse cx="15.4" cy="13" rx="1.8" ry="1.1" transform="rotate(30 15.4 13)"/>
  </g>
  <circle cx="12" cy="4" r="1" fill="#e0c848"/>
</svg>`,

  beet: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M9 5C9 5 8.3 3 9.3 2.3C9.8 3 9.8 4 9.4 4.8" stroke="#7bb04a" stroke-width="1.1" fill="none" stroke-linecap="round"/>
  <path d="M13 5C13 5 12.6 3 13.8 2.3C14.1 3.1 14 4 13.5 4.7" stroke="#7bb04a" stroke-width="1.1" fill="none" stroke-linecap="round"/>
  <path d="M6.5 7C6.5 7 7 5.3 8.5 5.6" stroke="#a8304a" stroke-width="1" fill="none" stroke-linecap="round"/>
  <path d="M15.5 7C15.5 7 15 5.3 13.5 5.6" stroke="#a8304a" stroke-width="1" fill="none" stroke-linecap="round"/>
  <ellipse cx="11" cy="14" rx="6.4" ry="6.6" fill="#8a2050"/>
  <path d="M9.5 20.3C9.5 20.3 8.8 16 11 14C13.2 16 12.5 20.3 12.5 20.3" stroke="#6a1440" stroke-width="1" fill="none"/>
</svg>`,

  sheep: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="10" cy="12" rx="7.5" ry="5.6" fill="#f5f2e8"/>
  <circle cx="6" cy="9" r="2.6" fill="#f5f2e8"/>
  <circle cx="10" cy="8" r="2.8" fill="#f5f2e8"/>
  <circle cx="14" cy="9.5" r="2.4" fill="#f5f2e8"/>
  <rect x="16.5" y="9.5" width="4.5" height="4.2" rx="1.4" fill="#3a342c"/>
  <circle cx="19.6" cy="10.9" r="0.5" fill="#000"/>
  <rect x="5" y="17" width="1.4" height="3" fill="#2b2620"/>
  <rect x="14" y="17" width="1.4" height="3" fill="#2b2620"/>
</svg>`,

  wool: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <circle cx="9" cy="9" r="4" fill="#f5f2e8"/>
  <circle cx="14.5" cy="8.5" r="3.6" fill="#f5f2e8"/>
  <circle cx="11.5" cy="13" r="4.4" fill="#f0ece0"/>
  <circle cx="8" cy="14" r="3.2" fill="#f5f2e8"/>
  <circle cx="15" cy="14.5" r="3" fill="#f5f2e8"/>
</svg>`,

  well: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 8L12 3L20 8L17 8L12 5.4L7 8Z" fill="#4d5b66"/>
  <rect x="5" y="13" width="14" height="7" rx="1" fill="#a3a39a"/>
  <ellipse cx="12" cy="13" rx="7" ry="1.6" fill="#8a8a80"/>
  <rect x="11.3" y="8.5" width="1.4" height="5" fill="#8f6038"/>
  <rect x="9" y="17.5" width="6" height="1.6" fill="#2f8fd8"/>
</svg>`,

  fertilizer: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M6 8H18L17 21H7L6 8Z" fill="#6b8f3a"/>
  <rect x="5.5" y="5" width="13" height="3.4" rx="0.6" fill="#4a7a2a"/>
  <text x="12" y="15" font-family="Arial, sans-serif" font-size="6.5" font-weight="700" text-anchor="middle" fill="#eaf3c8">NPK</text>
</svg>`,

  gov: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2L20 5.5V11C20 16.2 16.5 20.3 12 22C7.5 20.3 4 16.2 4 11V5.5L12 2Z" fill="#4c5eac"/>
  <path d="M12 2L20 5.5V11C20 16.2 16.5 20.3 12 22V2Z" fill="#3a4890"/>
  <circle cx="12" cy="9.5" r="2.6" fill="#f4c04a"/>
  <path d="M8.3 15.5C8.3 13.2 9.9 11.8 12 11.8C14.1 11.8 15.7 13.2 15.7 15.5C13.9 16.7 10.1 16.7 8.3 15.5Z" fill="#f4c04a"/>
</svg>`,

  wolf: `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 14L6 9L9 11L12 8L15 11L18 9L21 14L17 16L12 15L7 16Z" fill="#2b2822"/>
  <circle cx="9.5" cy="12" r="0.6" fill="#ffcf3a"/>
  <circle cx="14.5" cy="12" r="0.6" fill="#ffcf3a"/>
  <path d="M12 13.5L10.5 15.5H13.5Z" fill="#4a453c"/>
</svg>`
};

export function svgIcon(name, extraClass) {
  const markup = icons[name] || '';
  return markup.replace('<svg ', `<svg class="icon-svg${extraClass ? ' ' + extraClass : ''}" `);
}
