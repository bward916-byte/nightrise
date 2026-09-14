// ===== world: the city =====
const GROUND = 0;            // sidewalk back edge (buildings sit here)
const WALK_DEPTH = 42;       // sidewalk depth the player can move within
const ROAD_Y = GROUND + WALK_DEPTH + 6, ROAD_H = 96;
const TOWER = { x: -320, w: 640, floors: 92, name: 'Meridian Tower' };
TOWER.h = TOWER.floors * FLOOR_H;
// night cutout facades: each building is a dark paper shape; windows do the talking
const FACADE = {
  glass:    { base: '#1d2a4a', win: '#2b3d63', lit: '#ffe2a0' },
  concrete: { base: '#232838', win: '#151a28', lit: '#ffd58a' },
  brick:    { base: '#3a2430', win: '#1a1420', lit: '#ffc985' },
  stone:    { base: '#2c2f40', win: '#161826', lit: '#ffe6b0' },
  dark:     { base: '#141828', win: '#20283e', lit: '#a9d8ff' },
  tan:      { base: '#33302e', win: '#1a1816', lit: '#ffd08a' },
};
const NEON = ['#ff4fb8', '#33e9ff', '#ffdf5a', '#7dff7a', '#ff7a4a', '#b47cff'];
const SHOP_NAMES = ['NOODLES', 'BAR', 'LIQUOR', 'PIZZA', 'TATTOO', 'DELI', 'LAUNDRY', 'PAWN', 'CAFE', 'HOTEL', 'BOOKS', 'RECORDS', 'PHARMACY', 'OPEN 24H', 'SUSHI', 'DINER'];
function hash2(a, b) { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; h ^= h >> 16; return (h >>> 0) / 4294967296; }

// Buildings in a row, side view. x ranges, with gaps for alley & streets.
function buildCity() {
  const r = RNG(1983), B = [];
  const add = (x, w, floors, style, extra) => { const b = Object.assign({ x, w, floors, h: floors * FLOOR_H, style, cols: Math.max(2, Math.round(w / 64)), roof: r.pick(['flat', 'tank', 'ac', 'antenna', 'flat']), id: B.length }, extra); B.push(b); return b; };
  // left of tower
  let x = TOWER.x - 60;
  for (let i = 0; i < 9; i++) { const w = r.int(180, 420), f = r.int(6, 38); x -= w; add(x, w, f, r.pick(Object.keys(FACADE))); x -= r.int(0, 14); }
  // the tower
  add(TOWER.x, TOWER.w, TOWER.floors, 'glass', { tower: true, name: TOWER.name, cols: 10 });
  // alley then neighbours
  const alleyX = TOWER.x + TOWER.w, alleyW = 150;
  x = alleyX + alleyW;
  for (let i = 0; i < 10; i++) { const w = r.int(180, 420), f = r.int(5, 34); add(x, w, f, r.pick(Object.keys(FACADE))); x += w + r.int(0, 14); }
  const cityEnd = x, cityStart = B.reduce((m, b) => Math.min(m, b.x), 1e9);
  // backdrop skyline (parallax, drawn lighter)
  const back = []; let bx = cityStart - 14000;
  while (bx < cityEnd + 14000) { const w = r.int(140, 520), f = r.int(8, 70); back.push({ x: bx, w, h: f * FLOOR_H, style: r.pick(['dark', 'glass', 'concrete']), cols: Math.round(w / 70) }); bx += w + r.int(20, 120); }
  return { buildings: B, alley: { x: alleyX, w: alleyW }, back, x0: cityStart, x1: cityEnd };
}

// ---------- drawing ----------
function drawSky(ctx, pal, cam) {
  const g = ctx.createLinearGradient(0, 0, 0, cam.h);
  const alt = clamp(-cam.y / 12000, 0, 1);
  g.addColorStop(0, mix(pal.skyTop, '#02030a', alt * .8)); g.addColorStop(1, mix(pal.skyBot, '#3a2a55', .25 * (1 - alt)));
  ctx.fillStyle = g; ctx.fillRect(0, 0, cam.w, cam.h);
  ctx.fillStyle = '#f5f0d8';
  for (let i = 0; i < 90; i++) { const sx = hash2(i, 7) * cam.w, sy = hash2(i, 11) * cam.h * .7; ctx.globalAlpha = .4 + hash2(i, 3) * .6; ctx.fillRect(sx, sy, hash2(i, 5) > .8 ? 2 : 1.2, hash2(i, 5) > .8 ? 2 : 1.2); }
  ctx.globalAlpha = 1;
  // moon, paper-cut
  ctx.fillStyle = '#f7f1dc'; ctx.beginPath(); ctx.arc(cam.w * .82, cam.h * .14, 30, 0, TAU); ctx.fill();
  ctx.fillStyle = mix(pal.skyTop, '#000', .1); ctx.beginPath(); ctx.arc(cam.w * .82 - 13, cam.h * .14 - 6, 25, 0, TAU); ctx.fill();
  // low haze band behind the skyline
  const hz = ctx.createLinearGradient(0, cam.h * .45, 0, cam.h); hz.addColorStop(0, 'rgba(120,90,160,0)'); hz.addColorStop(1, 'rgba(120,90,160,.28)'); ctx.fillStyle = hz; ctx.fillRect(0, 0, cam.w, cam.h);
}
function drawBackdrop(ctx, city, cam, pal) {
  // parallax: move at 0.35 of camera in x, 0.5 in y
  ctx.save();
  const px = cam.x * .35, py = cam.y;
  ctx.translate(cam.w / 2, cam.h / 2); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-px, -py + GROUND * 0);
  const haze = mix(pal.skyBot, '#3a3358', .5);
  ctx.globalAlpha = .8;
  for (const k of city.back) {
    if (k.x + k.w < px - cam.w / cam.zoom || k.x > px + cam.w / cam.zoom) continue;
    ctx.fillStyle = mix(haze, FACADE[k.style].base, .55); ctx.fillRect(k.x, -k.h, k.w, k.h);
    if (cam.zoom > .04) { ctx.fillStyle = '#ffe0a0'; ctx.globalAlpha = .3; const rows = Math.floor(k.h / FLOOR_H); for (let f = 0; f < rows; f += 2) for (let c = 0; c < k.cols; c++) if (hash2(k.x + c, f) < .4) ctx.fillRect(k.x + 10 + c * (k.w / k.cols), -f * FLOOR_H - FLOOR_H * .6, 10, 12); ctx.globalAlpha = .55; }
  }
  ctx.restore();
}
function drawBuilding(ctx, b, pal, zoom, isPlayerFloor) {
  const F = FACADE[b.style];
  const base = F.base, win = F.win, lit = F.lit;
  // cut-paper drop shadow, then the slab
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(b.x + 10, -b.h + 10, b.w, b.h);
  ctx.fillStyle = base; ctx.fillRect(b.x, -b.h, b.w, b.h);
  const winW = b.w / b.cols, detail = FLOOR_H * zoom;
  if (detail < 2.2) {
    ctx.fillStyle = lit; ctx.globalAlpha = .55;
    for (let f = 0; f < b.floors; f += 2) for (let c = 0; c < b.cols; c++) if (hash2(b.id * 97 + c, f) < pal.glow) ctx.fillRect(b.x + c * winW + winW * .25, -f * FLOOR_H - FLOOR_H * .7, winW * .5, FLOOR_H * .5);
    ctx.globalAlpha = 1;
  } else {
    const wW = winW * .55, wH = FLOOR_H * .5, ox = winW * .225, oy = FLOOR_H * .3;
    for (let f = 0; f < b.floors; f++) {
      const y = -f * FLOOR_H - FLOOR_H + oy;
      if (f === 0 && !b.tower) continue;
      for (let c = 0; c < b.cols; c++) {
        const x = b.x + c * winW + ox, h = hash2(b.id * 97 + c, f);
        const on = h < pal.glow || (isPlayerFloor && f === PLAYER_FLOOR - 1 && c === 3);
        if (on) { const warm = hash2(c * 7, f * 3 + b.id) ; ctx.fillStyle = warm < .15 ? '#a9d8ff' : warm < .3 ? '#ffb3c6' : lit; ctx.globalAlpha = .75 + hash2(c, f) * .25; }
        else { ctx.fillStyle = win; ctx.globalAlpha = 1; }
        ctx.fillRect(x, y, wW, wH);
        if (on && detail > 12 && hash2(f, c + b.id * 3) < .35) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x, y, wW, wH * (.3 + hash2(c, f) * .4)); } // blinds
        if (on && detail > 24 && hash2(f + 9, c + b.id) < .18) { ctx.fillStyle = '#2a2230'; ctx.beginPath(); ctx.arc(x + wW * (.3 + hash2(c, f + 1) * .4), y + wH * .55, wH * .16, 0, TAU); ctx.fill(); ctx.fillRect(x + wW * (.3 + hash2(c, f + 1) * .4) - wH * .18, y + wH * .68, wH * .36, wH * .4); } // someone in the window
      }
    }
    ctx.globalAlpha = 1;
    if (b.style === 'glass' && detail > 6) { ctx.fillStyle = 'rgba(255,255,255,.04)'; for (let c = 1; c < b.cols; c += 2) ctx.fillRect(b.x + c * winW, -b.h, winW, b.h); }
  }
  // right-edge shade for paper depth
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(b.x + b.w - Math.min(16, b.w * .06), -b.h, Math.min(16, b.w * .06), b.h);
  if (zoom > .06) {
    ctx.fillStyle = shade(base, .7);
    if (b.roof === 'tank') { ctx.fillRect(b.x + b.w * .6, -b.h - 60, 36, 60); ctx.beginPath(); ctx.moveTo(b.x + b.w * .6 - 2, -b.h - 60); ctx.lineTo(b.x + b.w * .6 + 18, -b.h - 78); ctx.lineTo(b.x + b.w * .6 + 38, -b.h - 60); ctx.fill(); }
    if (b.roof === 'ac') for (let i = 0; i < 3; i++) ctx.fillRect(b.x + 20 + i * 44, -b.h - 18, 30, 18);
    if (b.roof === 'antenna' || b.tower) { ctx.fillRect(b.x + b.w * .5 - 2, -b.h - (b.tower ? 260 : 70), 4, b.tower ? 260 : 70); const bl = (Math.sin((typeof Game !== 'undefined' ? Game.clock : 0) * 40) > 0); ctx.fillStyle = bl ? '#ff3a3a' : '#5a1a1a'; ctx.beginPath(); ctx.arc(b.x + b.w * .5, -b.h - (b.tower ? 262 : 72), b.tower ? 7 : 4, 0, TAU); ctx.fill(); if (bl && b.tower) { ctx.globalAlpha = .2; ctx.beginPath(); ctx.arc(b.x + b.w * .5, -b.h - 262, 40, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; } }
    ctx.fillStyle = shade(base, .8); ctx.fillRect(b.x - 4, -b.h - 6, b.w + 8, 8);
  }
  if (zoom > .1) drawGroundFloor(ctx, b, pal, zoom, base, win);
}
function drawGroundFloor(ctx, b, pal, zoom, base, win) {
  const gh = FLOOR_H * 1.15;
  ctx.fillStyle = shade(base, 1.15); ctx.fillRect(b.x, -gh, b.w, gh);
  if (b.tower) {
    ctx.fillStyle = '#3a4c78'; ctx.fillRect(b.x + 20, -gh + 12, b.w - 40, gh - 12);
    ctx.fillStyle = 'rgba(255,230,180,.55)'; ctx.fillRect(b.x + 20, -gh + 12, b.w - 40, gh - 12);
    ctx.fillStyle = '#2b3550'; for (let i = 1; i < 8; i++) ctx.fillRect(b.x + 20 + (b.w - 40) * i / 8 - 2, -gh + 12, 4, gh - 12);
    const dx = b.x + b.w / 2 - 44; ctx.fillStyle = '#fff2cc'; ctx.fillRect(dx, -FLOOR_H * .95, 88, FLOOR_H * .95); ctx.fillStyle = '#2b3550'; ctx.fillRect(dx + 42, -FLOOR_H * .95, 4, FLOOR_H * .95);
    ctx.fillStyle = '#10142a'; ctx.fillRect(b.x + b.w / 2 - 120, -gh - 8, 240, 14);
    ctx.fillStyle = '#ffe6a8'; ctx.font = `bold 15px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.name.toUpperCase(), b.x + b.w / 2, -gh - 1);
    ctx.fillStyle = 'rgba(255,230,180,.12)'; ctx.beginPath(); ctx.moveTo(dx - 20, 0); ctx.lineTo(dx + 108, 0); ctx.lineTo(dx + 160, 60); ctx.lineTo(dx - 72, 60); ctx.fill();
    b.door = { x: dx, w: 88 };
  } else {
    const n = Math.max(1, Math.round(b.w / 200)), sw = b.w / n;
    for (let i = 0; i < n; i++) {
      const x = b.x + i * sw, k = hash2(b.id, i), neon = NEON[Math.floor(k * NEON.length)], open = k < .7;
      ctx.fillStyle = open ? 'rgba(255,220,160,.55)' : '#151a2a'; ctx.fillRect(x + 14, -gh + 40, sw * .55, gh - 54);
      ctx.fillStyle = open ? '#4a3a2a' : '#0e1120'; ctx.fillRect(x + sw * .72, -FLOOR_H * .85, 40, FLOOR_H * .85);
      // neon sign
      const name = SHOP_NAMES[Math.floor(hash2(i + 3, b.id) * SHOP_NAMES.length)];
      ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const flick = hash2(i, b.id + 1) < .15 && Math.sin((typeof Game !== 'undefined' ? Game.clock : 0) * 700 + i) > .9;
      if (!flick) { ctx.shadowColor = neon; ctx.shadowBlur = zoom > .5 ? 12 : 0; ctx.fillStyle = neon; ctx.fillText(name, x + sw * .42, -gh + 22); ctx.shadowBlur = 0; ctx.globalAlpha = .12; ctx.fillRect(x + 6, -gh + 8, sw * .72, 30); ctx.globalAlpha = 1; }
      if (open) { ctx.fillStyle = 'rgba(255,220,160,.1)'; ctx.beginPath(); ctx.moveTo(x + 14, 0); ctx.lineTo(x + 14 + sw * .55, 0); ctx.lineTo(x + 14 + sw * .55 + 40, 50); ctx.lineTo(x - 26, 50); ctx.fill(); }
    }
  }
}
function drawAlley(ctx, city, pal, zoom) {
  const a = city.alley, gh = FLOOR_H * 1.3;
  ctx.fillStyle = '#0b0e1a'; ctx.fillRect(a.x, -gh, a.w, gh);
  ctx.fillStyle = '#2b5a4a'; ctx.fillRect(a.x + 10, -52, 62, 52); ctx.fillStyle = '#1f4436'; ctx.fillRect(a.x + 8, -58, 66, 10);
  ctx.fillStyle = '#1a1e30'; for (let i = 0; i < 4; i++) ctx.fillRect(a.x + 18, -gh + 20 + i * 30, a.w - 36, 3);
  ctx.fillStyle = '#6a4e30'; ctx.fillRect(a.x + a.w - 44, -28, 30, 28); ctx.fillRect(a.x + a.w - 40, -50, 24, 22);
  ctx.fillStyle = '#b0413e'; ctx.fillRect(a.x + 88, -13, 26, 13);
  // one bare bulb
  ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(a.x + a.w / 2, -gh + 70, 5, 0, TAU); ctx.fill(); ctx.globalAlpha = .1; ctx.beginPath(); ctx.moveTo(a.x + a.w / 2, -gh + 70); ctx.lineTo(a.x + 6, 0); ctx.lineTo(a.x + a.w - 6, 0); ctx.fill(); ctx.globalAlpha = 1;
}
function drawStreet(ctx, city, pal, zoom, cam) {
  const b = cam.bounds(), x0 = b.x0 - 10, x1 = b.x1 + 10;
  ctx.fillStyle = '#3a3d52'; ctx.fillRect(x0, GROUND, x1 - x0, WALK_DEPTH + 6);
  ctx.fillStyle = '#4a4d62'; ctx.fillRect(x0, GROUND, x1 - x0, 3);
  if (zoom > .3) { ctx.fillStyle = 'rgba(0,0,0,.15)'; for (let x = Math.floor(x0 / 96) * 96; x < x1; x += 96) ctx.fillRect(x, GROUND, 2, WALK_DEPTH + 6); }
  ctx.fillStyle = '#1a1c2c'; ctx.fillRect(x0, ROAD_Y, x1 - x0, ROAD_H);
  ctx.fillStyle = '#c9b45a'; for (let x = Math.floor(x0 / 70) * 70; x < x1; x += 70) ctx.fillRect(x, ROAD_Y + ROAD_H / 2 - 1.5, 40, 3);
  ctx.fillStyle = '#2f3246'; ctx.fillRect(x0, ROAD_Y + ROAD_H, x1 - x0, 30);
  ctx.fillStyle = '#0a0c16'; ctx.fillRect(x0, ROAD_Y + ROAD_H + 30, x1 - x0, 40000);
  if (zoom > .18) for (let x = Math.floor(x0 / 420) * 420; x < x1; x += 420) {
    const k = hash2(x, 1);
    if (k < .5) {
      ctx.fillStyle = '#12141f'; ctx.fillRect(x - 2, -150, 4, ROAD_Y + 146); ctx.fillRect(x - 2, -152, 30, 4);
      ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.ellipse(x + 30, -150, 12, 6, 0, 0, TAU); ctx.fill();
      const g = ctx.createRadialGradient(x + 30, -150, 10, x + 30, -150, 260); g.addColorStop(0, 'rgba(255,225,160,.22)'); g.addColorStop(1, 'rgba(255,225,160,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x + 30, -150); ctx.lineTo(x - 120, 60); ctx.lineTo(x + 180, 60); ctx.fill();
    } else if (k < .7) {
      ctx.fillStyle = '#1e1a2a'; ctx.fillRect(x - 4, -70, 8, ROAD_Y + 64);
      ctx.fillStyle = '#1c3a3a'; ctx.beginPath(); ctx.arc(x, -100, 34, 0, TAU); ctx.arc(x - 22, -80, 24, 0, TAU); ctx.arc(x + 24, -84, 26, 0, TAU); ctx.fill();
    } else if (k < .82) { ctx.fillStyle = '#8a2f2c'; ctx.beginPath(); ctx.roundRect(x - 6, ROAD_Y - 30, 12, 26, 3); ctx.fill(); ctx.fillRect(x - 10, ROAD_Y - 18, 20, 5); }
    else if (k < .92) { ctx.fillStyle = '#4a3320'; ctx.fillRect(x - 30, 8, 60, 6); ctx.fillRect(x - 30, -4, 60, 5); ctx.fillRect(x - 28, 14, 4, 12); ctx.fillRect(x + 24, 14, 4, 12); }
    else { ctx.fillStyle = '#252a3a'; ctx.beginPath(); ctx.roundRect(x - 9, ROAD_Y - 32, 18, 30, 2); ctx.fill(); }
  }
  // steam from a manhole
  if (zoom > .3) { const t = (typeof Game !== 'undefined' ? Game.clock : 0) * 60; for (let x = Math.floor(x0 / 1300) * 1300 + 500; x < x1; x += 1300) { ctx.fillStyle = 'rgba(200,200,230,.08)'; for (let i = 0; i < 5; i++) { const ph = (t * .3 + i * 20) % 100; ctx.beginPath(); ctx.arc(x + Math.sin(ph * .1 + i) * 10, ROAD_Y + 40 - ph, 12 + ph * .3, 0, TAU); ctx.fill(); } } }
}
// ---------- cars ----------
const CAR_COL = ['#b0413e', '#e8e3d6', '#2b2f3a', '#3d4150', '#2f6f9f', '#d9b23a', '#8a8e96', '#3e8a5b', '#5a4a3a'];
class Car {
  constructor(lane, x, seed) { const r = RNG(seed); this.lane = lane; this.x = x; this.dir = lane === 0 ? -1 : 1; this.v = r.range(180, 300); this.col = r.pick(CAR_COL); this.kind = r.weighted([['sedan', 5], ['suv', 3], ['taxi', 2], ['van', 1.5], ['truck', .7]]); if (this.kind === 'taxi') this.col = '#e8c22a'; this.len = this.kind === 'truck' ? 150 : this.kind === 'van' ? 120 : 100; }
  get y() { return this.lane === 0 ? ROAD_Y + ROAD_H * .3 : ROAD_Y + ROAD_H * .78; }
  update(dt, x0, x1) { this.x += this.v * this.dir * dt; if (this.dir > 0 && this.x > x1) this.x = x0 - 200; if (this.dir < 0 && this.x < x0) this.x = x1 + 200; }
  draw(ctx, pal, zoom) {
    const L = this.len, s = this.lane === 0 ? .86 : 1;
    ctx.save(); ctx.translate(this.x, this.y); ctx.scale(this.dir * s, s);
    ctx.fillStyle = mix(this.col, '#101428', .45); ctx.beginPath();
    if (this.kind === 'sedan' || this.kind === 'taxi') { ctx.moveTo(-L / 2, 0); ctx.lineTo(-L / 2, -18); ctx.lineTo(-L * .3, -22); ctx.lineTo(-L * .2, -38); ctx.lineTo(L * .2, -38); ctx.lineTo(L * .32, -22); ctx.lineTo(L / 2, -18); ctx.lineTo(L / 2, 0); }
    else if (this.kind === 'suv') { ctx.moveTo(-L / 2, 0); ctx.lineTo(-L / 2, -24); ctx.lineTo(-L * .3, -28); ctx.lineTo(-L * .25, -44); ctx.lineTo(L * .3, -44); ctx.lineTo(L * .4, -28); ctx.lineTo(L / 2, -24); ctx.lineTo(L / 2, 0); }
    else if (this.kind === 'van') { ctx.moveTo(-L / 2, 0); ctx.lineTo(-L / 2, -46); ctx.lineTo(L * .3, -46); ctx.lineTo(L * .45, -28); ctx.lineTo(L / 2, -20); ctx.lineTo(L / 2, 0); }
    else { ctx.moveTo(-L / 2, 0); ctx.lineTo(-L / 2, -52); ctx.lineTo(L * .25, -52); ctx.lineTo(L * .25, -40); ctx.lineTo(L * .4, -40); ctx.lineTo(L / 2, -22); ctx.lineTo(L / 2, 0); }
    ctx.closePath(); ctx.fill();
    // windows
    ctx.fillStyle = '#1e2a48';
    if (this.kind === 'sedan' || this.kind === 'taxi') { ctx.beginPath(); ctx.moveTo(-L * .27, -23); ctx.lineTo(-L * .18, -35); ctx.lineTo(L * .18, -35); ctx.lineTo(L * .28, -23); ctx.closePath(); ctx.fill(); }
    else if (this.kind === 'suv') { ctx.beginPath(); ctx.moveTo(-L * .27, -29); ctx.lineTo(-L * .22, -41); ctx.lineTo(L * .27, -41); ctx.lineTo(L * .35, -29); ctx.closePath(); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(L * .26, -43); ctx.lineTo(L * .38, -30); ctx.lineTo(L * .26, -30); ctx.closePath(); ctx.fill(); }
    if (this.kind === 'taxi') { ctx.fillStyle = '#ffe36a'; ctx.fillRect(-14, -46, 28, 8); ctx.fillStyle = '#1a1a1a'; ctx.font = `bold 7px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('TAXI', 0, -39); }
    // wheels
    ctx.fillStyle = '#0a0c14'; for (const wx of [-L * .3, L * .3]) { ctx.beginPath(); ctx.arc(wx, 0, 11, 0, TAU); ctx.fill(); ctx.fillStyle = '#5a5e70'; ctx.beginPath(); ctx.arc(wx, 0, 5, 0, TAU); ctx.fill(); ctx.fillStyle = '#0a0c14'; }
    // lights
    ctx.fillStyle = '#fff6c0'; ctx.fillRect(L / 2 - 6, -16, 6, 5); ctx.fillStyle = '#ff3b30'; ctx.fillRect(-L / 2, -16, 6, 5);
    { ctx.globalAlpha = .18; ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.moveTo(L / 2, -16); ctx.lineTo(L / 2 + 120, -30); ctx.lineTo(L / 2 + 120, 6); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.restore();
  }
}
