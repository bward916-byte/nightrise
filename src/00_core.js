'use strict';
// ===== HIGHRISE — core =====
const TAU = Math.PI * 2;
const M = 32;                 // world px per metre
const FLOOR_H = 3.2 * M;      // one storey
const PLAYER_FLOOR = 83;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const sgn = v => v < 0 ? -1 : 1;

// Deterministic RNG so crowds are reproducible per seed
function RNG(seed) {
  let s = (seed >>> 0) || 1;
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b); s = Math.imul(s ^ (s >>> 16), 0x45d9f3b); s ^= s >>> 16; s = (s >>> 0) || 1;
  const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  r.range = (a, b) => a + r() * (b - a);
  r.int = (a, b) => Math.floor(r.range(a, b + 1));
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  r.chance = p => r() < p;
  // weighted pick: [[item, weight], ...]
  r.weighted = arr => { let t = 0; for (const a of arr) t += a[1]; let x = r() * t; for (const a of arr) { x -= a[1]; if (x <= 0) return a[0]; } return arr[arr.length - 1][0]; };
  for (let i = 0; i < 4; i++) r();
  return r;
}
const rng = RNG(Date.now() & 0x7fffffff);

// ---- colour helpers (ink palette is deliberately muted, comic-book paper feel)
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgbToHex(r, g, b) { return '#' + ((1 << 24) | (clamp(r | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(b | 0, 0, 255)).toString(16).slice(1); }
function mix(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)); }
function shade(h, k) { const [r, g, b] = hexToRgb(h); return rgbToHex(r * k, g * k, b * k); }
const INK = '#0b0e1c';
const PAPER = '#f2ecdf';
const SHADOW = 'rgba(6,8,20,.45)';
let PAPER_SHADOW = false;

// ---- always night. One fixed palette, tuned so lit windows carry the scene.
const NIGHT = { skyTop: '#070a18', skyBot: '#1b2446', tint: '#22284a', tintK: .35, glow: .19, night: 1, hour: 22 };
function dayPalette() { return NIGHT; }

// ---- tiny event bus
const Bus = { _h: {}, on(e, f) { (this._h[e] = this._h[e] || []).push(f); }, emit(e, d) { (this._h[e] || []).forEach(f => f(d)); } };
