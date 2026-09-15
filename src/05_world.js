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
function hash2(a, b) { let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x7f4a7c15, 0xc2b2ae35); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15; return (h >>> 0) / 4294967296; }

// ---------- the city is a grid: 4 east-west streets x 4 north-south avenues ----------
const BLOCK = 1500, GAP = 220;                       // intersection gap in the facades
const EW_NAMES = ['1st Street', 'Main Street', '3rd Street', 'Canal Street'];
const NS_NAMES = ['Ave A', 'Ave B', 'Park Ave', 'Ave D'];
// every street has its own character so no two blocks read the same
const CHARACTER = {
  ew0: { feature: 'finance',   crowd: 70,  cars: 30, neon: .15, grade: '#0e1a34', lamps: 380, trees: 0,  shops: ['BANK', 'OFFICES', 'COFFEE', 'CLOSED', 'DELI', 'SUITS'] },
  ew1: { feature: 'downtown',  crowd: 190, cars: 26, neon: .8,  grade: '#241a2e', lamps: 420, trees: .2, shops: ['NOODLES', 'BAR', 'LIQUOR', 'PIZZA', 'DELI', 'PHARMACY', 'OPEN 24H', 'BOOKS'] },
  ew2: { feature: 'theater',   crowd: 150, cars: 18, neon: 1,   grade: '#2e1830', lamps: 300, trees: .1, shops: ['THEATER', 'TICKETS', 'JAZZ', 'CABARET', 'DINER', 'HOTEL'] },
  ew3: { feature: 'industrial',crowd: 40,  cars: 10, neon: .2,  grade: '#101a1c', lamps: 620, trees: 0,  shops: ['LOADING', 'GARAGE', 'SUPPLY', 'CLOSED', 'PAWN'] },
  ns0: { feature: 'market',    crowd: 160, cars: 12, neon: .6,  grade: '#2a2216', lamps: 340, trees: .1, shops: ['FRUIT', 'FISH', 'SPICES', 'BAKERY', 'TEA', 'GROCER'] },
  ns1: { feature: 'quiet',     crowd: 55,  cars: 14, neon: .25, grade: '#141c2e', lamps: 460, trees: .6, shops: ['LAUNDRY', 'BOOKS', 'CAFE', 'CLOSED', 'TAILOR'] },
  ns2: { feature: 'nightlife', crowd: 210, cars: 22, neon: 1,   grade: '#2c1430', lamps: 320, trees: 0,  shops: ['CLUB', 'BAR', 'TATTOO', 'RECORDS', 'TOO', 'KARAOKE', 'BAR'] },
  ns3: { feature: 'construction', crowd: 65, cars: 16, neon: .3, grade: '#1e1a12', lamps: 520, trees: .2, shops: ['HARDWARE', 'CLOSED', 'DINER', 'SUPPLY'] },
};
const HOME = { dir: 'ew', i: 1 };                    // the tower is on Main Street
const DISTRICT = {                                   // style bias by position in the grid
  finance: ['glass', 'glass', 'dark', 'concrete'], old: ['brick', 'brick', 'stone', 'tan'], mixed: ['brick', 'concrete', 'tan', 'stone', 'glass'], strip: ['dark', 'brick', 'tan', 'concrete'],
};
const City = {
  streets: {},
  id(dir, i) { return dir + i; },
  name(dir, i) { return dir === 'ew' ? EW_NAMES[i] : NS_NAMES[i]; },
  get(dir, i) { const id = this.id(dir, i); return this.streets[id] || (this.streets[id] = buildStreet(dir, i)); },
  home() { return this.get(HOME.dir, HOME.i); },
};
function buildStreet(dir, i) {
  const seed = (dir === 'ew' ? 100 : 500) + i * 37, r = RNG(seed), B = [];
  const ch = CHARACTER[dir + i];
  const isHome = dir === HOME.dir && i === HOME.i;
  const n = 4, x0 = 0, x1 = n * BLOCK;              // four intersections along every street
  const district = dir === 'ew' ? (i === 0 ? 'finance' : i === 3 ? 'old' : 'mixed') : (i === 2 ? 'strip' : i === 3 ? 'old' : 'mixed');
  const styles = DISTRICT[district];
  const add = (x, w, floors, style, extra) => { const b = Object.assign({ x, w, floors, h: floors * FLOOR_H, style, cols: Math.max(2, Math.round(w / 64)), roof: r.pick(['flat', 'tank', 'ac', 'antenna', 'flat']), id: B.length + seed * 7, setback: floors > 14 && r.chance(.45) ? { at: r.int(Math.floor(floors * .4), Math.floor(floors * .75)), inset: r.range(.12, .3) } : null, escape: style === 'brick' && r.chance(.7), balconies: (style === 'concrete' || style === 'tan' || style === 'stone') && r.chance(.55), billboard: floors < 20 && r.chance(.3) ? r.pick(['DRINK COLA', 'HOTEL', 'OPEN 24 HRS', 'RADIO 98.1', 'BIG SALE', 'THE DAILY']) : null, vsign: r.chance(.2) ? r.pick(['HOTEL', 'BAR', 'ROOMS', 'DINER']) : null, panels: style === 'concrete' && r.chance(.6), ac: style === 'brick' || style === 'tan', dish: r.chance(.5), scaffold: r.chance(.08), tint: r.range(-.08, .08) }, extra); B.push(b); return b; };
  const inters = []; for (let k = 0; k < n; k++) inters.push({ x: BLOCK * .5 + k * BLOCK, cross: dir === 'ew' ? { dir: 'ns', i: k } : { dir: 'ew', i: k }, k });
  let alley = null;
  // fill each block segment between intersections with buildings
  const segs = [[x0 - 1200, inters[0].x - GAP / 2]]; for (let k = 0; k < n - 1; k++) segs.push([inters[k].x + GAP / 2, inters[k + 1].x - GAP / 2]); segs.push([inters[n - 1].x + GAP / 2, x1 + 1200]);
  segs.forEach((sg, si) => {
    let x = sg[0];
    if (isHome && si === 2) { // the tower block
      TOWER.x = x + 80; add(TOWER.x, TOWER.w, TOWER.floors, 'glass', { tower: true, name: TOWER.name, cols: 10, setback: null, billboard: null, vsign: null, scaffold: false });
      alley = { x: TOWER.x + TOWER.w, w: 150 }; x = alley.x + alley.w;
    }
    while (x < sg[1] - 120) { const w = Math.min(r.int(180, 420), sg[1] - x), f = district === 'finance' ? r.int(14, 48) : district === 'old' ? r.int(4, 12) : r.int(5, 34); add(x, w, Math.max(3, f), r.pick(styles)); x += w + r.int(0, 10); }
  });
  const back = []; let bx = x0 - 14000;
  while (bx < x1 + 14000) { const w = r.int(140, 520), f = r.int(8, 70); back.push({ x: bx, w, h: f * FLOOR_H, style: r.pick(['dark', 'glass', 'concrete']), cols: Math.round(w / 70) }); bx += w + r.int(20, 120); }
  // street furniture picks: puddles, pigeons, parked cars, subway entrance
  const puddles = []; for (let k = 0; k < 14; k++) puddles.push({ x: r.range(x0, x1), w: r.range(40, 120), col: r.pick(NEON) });
  const pigeons = []; for (let k = 0; k < (ch.feature === 'market' ? 10 : ch.feature === 'industrial' ? 3 : 6); k++) { const px = r.range(x0, x1), home = px; for (let m = 0; m < r.int(4, 9); m++) pigeons.push({ x: px + r.range(-45, 45), y: GROUND + r.range(6, WALK_DEPTH), home, fly: 0, vx: 0, vy: 0, ph: r() * 10, st: 'peck', t: r.range(0, 3), hop: 0, face: r.chance(.5) ? 1 : -1, sz: r.range(.85, 1.15), col: r.weighted([['#8a8e9a', 5], ['#6e7280', 3], ['#a8a49a', 2], ['#5a5e6a', 2], ['#b8b4aa', 1]]), perch: null, land: 0 }); }
  const parked = []; for (let k = 0; k < Math.round(ch.cars * .4); k++) parked.push({ x: r.range(x0, x1), col: r.pick(CAR_COL), kind: r.pick(['sedan', 'sedan', 'suv', 'van']) });
  const subway = r.chance(.5) ? r.range(x0 + 300, x1 - 300) : null;
  return { dir, i, id: City.id(dir, i), name: City.name(dir, i), buildings: B, alley, back, x0, x1, inters, isHome, district, puddles, pigeons, parked, subway, taxiX: isHome ? TOWER.x - 520 : null, crowd: null, ch, feature: ch.feature, grade: ch.grade };
}
function buildCity() { return City.home(); }
// traffic light phase: 0..1 over a 24s cycle. ew green [0,.4), yellow [.4,.5), ns green [.5,.9), yellow [.9,1)
function lightPhase(clock) { return ((clock * 50) % 24) / 24; }
function lightFor(dir, clock) { const p = lightPhase(clock); if (dir === 'ew') return p < .4 ? 'green' : p < .5 ? 'yellow' : 'red'; return p < .5 ? 'red' : p < .9 ? 'green' : 'yellow'; }
// ---------- lighting ----------
// Scene is drawn dim, then a light buffer is composited additively. Every lamp,
// shop window, neon sign, headlight and lit apartment registers a light each frame.
const Lights = {
  list: [], shadowCasters: [],
  clear() { this.list.length = 0; this.shadowCasters.length = 0; },
  add(x, y, r, col, i) { if (this.list.length < 420) this.list.push({ x, y, r, col, i: i === undefined ? 1 : i }); },
  // ground-level lights are what cast people's shadows
  caster(x, y, r, i) { if (this.shadowCasters.length < 40) this.shadowCasters.push({ x, y, r, i: i || 1 }); },
  draw(ctx, cam) {
    if (!this.list.length) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const L of this.list) {
      const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r);
      g.addColorStop(0, `rgba(${L.col},${.30 * L.i})`); g.addColorStop(.25, `rgba(${L.col},${.085 * L.i})`); g.addColorStop(.6, `rgba(${L.col},${.018 * L.i})`); g.addColorStop(1, `rgba(${L.col},0)`);
      ctx.fillStyle = g; ctx.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
    }
    ctx.restore();
  },
  // long soft shadow stretching away from the nearest strong light
  groundShadow(ctx, x, y, h, w) {
    let best = null, bi = 0;
    for (const L of this.shadowCasters) { const d = Math.hypot(L.x - x, (L.y - y) * .5); if (d > L.r) continue; const i = L.i * (1 - d / L.r); if (i > bi) { bi = i; best = L; } }
    ctx.save();
    if (best) {
      const dx = x - best.x, dist = Math.abs(dx) + 20, len = clamp(h * (60 / dist) * .8, h * .25, h * 2.4), dir = sgn(dx || 1);
      ctx.globalAlpha = clamp(bi * .5, 0, .42); ctx.fillStyle = '#05060f';
      ctx.beginPath(); ctx.moveTo(x - w * .35, y); ctx.lineTo(x + w * .35, y); ctx.lineTo(x + dir * len + w * .18, y + h * .075); ctx.lineTo(x + dir * len - w * .18, y + h * .075); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = .3; ctx.fillStyle = '#05060f'; ctx.beginPath(); ctx.ellipse(x, y + 1, w * .45, h * .028, 0, 0, TAU); ctx.fill();
    ctx.restore();
  },
  // how lit a point is, 0..1 — used to tint people who walk under a lamp
  at(x, y) { let v = 0; for (const L of this.shadowCasters) { const d = Math.hypot(L.x - x, (L.y - y) * .6); if (d < L.r) v += L.i * (1 - d / L.r); } return clamp(v, 0, 1); },
};
const LC = { warm: '255,214,150', lamp: '255,226,170', neonPink: '255,79,184', neonCyan: '51,233,255', head: '255,246,200', tail: '255,60,48', sign: '255,211,106', cool: '150,190,255' };

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
    if (cam.zoom > .04) { ctx.fillStyle = '#ffe0a0'; ctx.globalAlpha = .3; const rows = Math.floor(k.h / FLOOR_H); for (let f = 0; f < rows; f += 2) for (let c = 0; c < k.cols; c++) if (hash2(k.x + c, f) < .22) ctx.fillRect(k.x + 10 + c * (k.w / k.cols), -f * FLOOR_H - FLOOR_H * .6, 10, 12); ctx.globalAlpha = .55; }
  }
  ctx.restore();
}
// what's going on inside a lit window
function drawRoom(ctx, x, y, w, h, kind, k, t, k2) {
  const SIL = '#2a2230', SH = 'rgba(30,20,40,.28)';
  // a person: head, shoulders, torso; optional arm angle; a soft wall shadow behind
  const fig = (px, py, sc, arm, col) => { const c = col || SIL; ctx.fillStyle = SH; ctx.beginPath(); ctx.arc(px + h * .06, py - h * .27 * sc, h * .12 * sc, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.roundRect(px + h * .06 - h * .13 * sc, py - h * .16 * sc, h * .26 * sc, h * .5 * sc, h * .05); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px, py - h * .28 * sc, h * .105 * sc, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(px - h * .14 * sc, py - h * .12 * sc); ctx.quadraticCurveTo(px, py - h * .22 * sc, px + h * .14 * sc, py - h * .12 * sc); ctx.lineTo(px + h * .12 * sc, py + h * .34 * sc); ctx.lineTo(px - h * .12 * sc, py + h * .34 * sc); ctx.closePath(); ctx.fill(); if (arm !== undefined) { ctx.save(); ctx.translate(px + h * .1 * sc, py - h * .1 * sc); ctx.rotate(arm); ctx.fillRect(0, -h * .03, h * .2 * sc, h * .055); ctx.restore(); } };
  const furn = () => { // furniture silhouettes against the light
    if (k2 < .33) { ctx.fillStyle = SIL; ctx.fillRect(x + w * .08, y + h * .55, w * .3, h * .06); ctx.fillRect(x + w * .1, y + h * .61, w * .04, h * .39); ctx.fillRect(x + w * .32, y + h * .61, w * .04, h * .39); }
    else if (k2 < .66) { ctx.fillStyle = SIL; for (let i = 0; i < 3; i++) ctx.fillRect(x + w * .7, y + h * (.2 + i * .25), w * .26, h * .05); ctx.fillRect(x + w * .7, y + h * .2, w * .03, h * .8); }
    else { ctx.fillStyle = SIL; ctx.beginPath(); ctx.roundRect(x + w * .55, y + h * .65, w * .4, h * .3, h * .06); ctx.fill(); }
  };
  // warm/cool room gradient so the light has a source
  const lx = x + w * (k2 < .5 ? .2 : .8); const g = ctx.createRadialGradient(lx, y + h * .3, 2, lx, y + h * .3, w); g.addColorStop(0, 'rgba(255,240,200,.35)'); g.addColorStop(1, 'rgba(0,0,0,.18)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  if (kind < .09) { // floor lamp, sometimes flickering, plus a chair
    const fl = k > .85 ? (Math.sin(t * 30 + k * 99) > -.7 ? 1 : .4) : 1; furn(); ctx.fillStyle = `rgba(255,216,138,${fl})`; ctx.beginPath(); ctx.arc(x + w * (.25 + k * .5), y + h * .42, h * .11, 0, TAU); ctx.fill(); ctx.fillStyle = SIL; ctx.fillRect(x + w * (.25 + k * .5) - 1, y + h * .5, 2, h * .5);
  } else if (kind < .16) { // pacing
    furn(); fig(x + w * (.5 + Math.sin(t * (.5 + k) + k * 20) * .3), y + h * .7, 1);
  } else if (kind < .22) { // at the window, occasionally waving; sometimes with a mug
    const wave = Math.sin(t * 6 + k * 10) > 0 && Math.sin(t * .5 + k) > .6; fig(x + w * (.3 + k * .4), y + h * .7, 1, wave ? -1.2 + Math.sin(t * 12) * .4 : k > .5 ? -.9 : undefined);
  } else if (kind < .30) { // TV: blue flicker, someone on the couch
    const f = .6 + Math.sin(t * 9 + k * 40) * .25 + Math.sin(t * 23 + k * 7) * .15; ctx.fillStyle = `rgba(120,180,255,${.45 * f})`; ctx.fillRect(x, y, w, h); ctx.fillStyle = SIL; ctx.beginPath(); ctx.roundRect(x + w * .45, y + h * .68, w * .5, h * .3, h * .06); ctx.fill(); fig(x + w * .68, y + h * .82, .75);
  } else if (kind < .36) { // party
    ctx.fillStyle = `hsla(${(t * 40 + k * 360) % 360},80%,60%,.25)`; ctx.fillRect(x, y, w, h); for (let i = 0; i < 3; i++) fig(x + w * (.2 + i * .3), y + h * (.78 + Math.abs(Math.sin(t * 5 + i + k * 9)) * -.08), .78, Math.sin(t * 5 + i) * .8 - 1.5);
    ctx.fillStyle = '#ffd36a'; for (let i = 0; i < 6; i++) ctx.fillRect(x + w * (.1 + i * .15), y + h * .1 + Math.sin(i) * 2, 2, 2);
  } else if (kind < .42) { // two people talking
    fig(x + w * .3, y + h * .72, .95, -.3 + Math.sin(t * 3 + k) * .3); fig(x + w * .66, y + h * .72, .9, undefined);
  } else if (kind < .52) { // curtains swaying
    const cw = w * (.3 + k * .3 + Math.sin(t * .8 + k * 5) * .03); ctx.fillStyle = 'rgba(120,60,70,.75)'; ctx.fillRect(x, y, cw, h); ctx.fillStyle = 'rgba(40,20,30,.4)'; ctx.fillRect(x + cw - 2, y, 2, h); if (k2 > .6) fig(x + w * .75, y + h * .72, .85);
  } else if (kind < .60) { // blinds, someone peeking through
    ctx.fillStyle = 'rgba(30,25,40,.6)'; const n = Math.max(3, Math.floor(h / 4)); for (let i = 0; i < n; i += 2) ctx.fillRect(x, y + h * i / n, w, h / n); if (Math.sin(t * .4 + k * 9) > .7) fig(x + w * .5, y + h * .75, .9);
  } else if (kind < .66) { // plant + cat
    ctx.fillStyle = '#2a5a3a'; ctx.beginPath(); ctx.arc(x + w * .25, y + h * .75, h * .16, 0, TAU); ctx.arc(x + w * .35, y + h * .68, h * .13, 0, TAU); ctx.fill(); ctx.fillStyle = '#5a3a2a'; ctx.fillRect(x + w * .2, y + h * .85, w * .2, h * .15);
    if (k > .4) { ctx.fillStyle = SIL; ctx.beginPath(); ctx.ellipse(x + w * .7, y + h * .88, h * .16, h * .09, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(x + w * .78, y + h * .8, h * .07, 0, TAU); ctx.fill(); ctx.fillRect(x + w * .55, y + h * .84 + Math.sin(t * 2) * h * .02, h * .12, h * .03); }
  } else if (kind < .74) { // desk, typing, monitor glow
    ctx.fillStyle = 'rgba(140,200,255,.55)'; ctx.fillRect(x + w * .2, y + h * .5, w * .22, h * .2); fig(x + w * .5, y + h * .85, .8, -.3 + Math.sin(t * 14 + k * 30) * .15); ctx.fillStyle = SIL; ctx.fillRect(x + w * .12, y + h * .74, w * .76, h * .05);
  } else if (kind < .80) { // stove + steam
    ctx.fillStyle = SIL; ctx.fillRect(x + w * .55, y + h * .7, w * .4, h * .3); fig(x + w * .35, y + h * .76, .9, -.6); ctx.fillStyle = 'rgba(200,200,220,.25)'; for (let i = 0; i < 3; i++) { const ph = (t * .6 + i * .33 + k) % 1; ctx.beginPath(); ctx.arc(x + w * .72 + Math.sin(ph * 6) * w * .05, y + h * (.66 - ph * .55), h * (.05 + ph * .08), 0, TAU); ctx.fill(); }
  } else if (kind < .85) { // exercising / dancing alone
    const b = Math.abs(Math.sin(t * 7 + k * 5)); fig(x + w * .5, y + h * (.78 - b * .06), .9, -1.6 + b * 1.2);
  } else if (kind < .90) { // ceiling fan + reading chair
    furn(); const a = t * 6 + k; ctx.fillStyle = SIL; for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(x + w * .5, y + h * .12); ctx.scale(1, .25); ctx.rotate(a + i * 2.09); ctx.fillRect(0, -2, w * .3, 4); ctx.restore(); }
  } else if (kind < .95) { // string lights, someone on the phone
    ctx.fillStyle = '#ffd36a'; for (let i = 0; i < 7; i++) ctx.fillRect(x + w * (.06 + i * .14), y + h * (.12 + Math.abs(i - 3) * .03), 2.5, 2.5); fig(x + w * .35, y + h * .72, .9, -2.3);
  } else { // rocking a baby / dog
    fig(x + w * .45, y + h * .72, .95, -.9 + Math.sin(t * 1.5) * .08); ctx.fillStyle = SIL; ctx.beginPath(); ctx.ellipse(x + w * .78, y + h * .92, h * .12, h * .07, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(x + w * .88, y + h * .86, h * .05, 0, TAU); ctx.fill();
  }
}
function drawBuilding(ctx, b, pal, zoom, isPlayerFloor) {
  const F = FACADE[b.style], base = shade(F.base, 1 + (b.tint || 0)), win = F.win, lit = F.lit, st = b.style;
  const t = typeof Game !== 'undefined' ? Game.clock * 50 : 0;
  const widthAt = f => b.setback && f >= b.setback.at ? b.w * (1 - b.setback.inset * 2) : b.w;
  const xAt = f => b.setback && f >= b.setback.at ? b.x + b.w * b.setback.inset : b.x;
  // silhouette with drop shadow
  const slab = (dx, dy, col) => { ctx.fillStyle = col; if (b.setback) { const sy = -b.setback.at * FLOOR_H; ctx.fillRect(b.x + dx, sy + dy, b.w, b.h - (-sy) + 0); ctx.fillRect(xAt(b.setback.at) + dx, -b.h + dy, widthAt(b.setback.at), -sy - b.h * 0 + b.h + sy); } else ctx.fillRect(b.x + dx, -b.h + dy, b.w, b.h); };
  slab(10, 10, 'rgba(0,0,0,.35)'); slab(0, 0, base);
  const detail = FLOOR_H * zoom, cols = b.cols, winW = b.w / cols;
  if (detail < 1.6) {
    // far: faint floor bands + sparse lit dots
    ctx.fillStyle = 'rgba(255,255,255,.04)'; for (let f = 0; f < b.floors; f += 2) ctx.fillRect(xAt(f), -f * FLOOR_H - FLOOR_H, widthAt(f), FLOOR_H);
    ctx.fillStyle = lit; ctx.globalAlpha = .7;
    for (let f = 0; f < b.floors; f++) for (let c = 0; c < cols; c++) { const x = b.x + c * winW + winW * .3; if (x < xAt(f) || x > xAt(f) + widthAt(f)) continue; if (hash2(b.id * 97 + c, f) < pal.glow) ctx.fillRect(x, -f * FLOOR_H - FLOOR_H * .7, winW * .45, FLOOR_H * .45); }
    ctx.globalAlpha = 1;
  } else {
    // spandrel bands (floor slabs) give the facade structure
    if (st === 'glass' || st === 'dark') { ctx.fillStyle = 'rgba(0,0,0,.28)'; for (let f = 0; f < b.floors; f++) ctx.fillRect(xAt(f), -f * FLOOR_H - FLOOR_H * .18, widthAt(f), FLOOR_H * .18); }
    if (st === 'concrete' || st === 'stone' || st === 'tan') { ctx.fillStyle = 'rgba(255,255,255,.05)'; for (let f = 0; f < b.floors; f++) ctx.fillRect(xAt(f), -f * FLOOR_H - FLOOR_H, widthAt(f), 2); }
    if (st === 'brick' && detail > 6) { ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let y = -b.h; y < 0; y += 8) ctx.fillRect(b.x, y, b.w, 1); }
    const wW = st === 'glass' ? winW * .86 : winW * .5, wH = st === 'glass' ? FLOOR_H * .62 : FLOOR_H * .5, ox = (winW - wW) / 2, oy = st === 'glass' ? FLOOR_H * .2 : FLOOR_H * .3;
    for (let f = 0; f < b.floors; f++) {
      if (f === 0 && !b.tower) continue;
      const y = -f * FLOOR_H - FLOOR_H + oy, fx0 = xAt(f), fx1 = fx0 + widthAt(f);
      for (let c = 0; c < cols; c++) {
        const x = b.x + c * winW + ox; if (x < fx0 + 4 || x + wW > fx1 - 4) continue;
        const h = hash2(b.id * 97 + c, f); let on = h < pal.glow || (isPlayerFloor && f === PLAYER_FLOOR - 1 && c === 3); if (h > pal.glow && h < pal.glow + .1 && Math.floor(t * .02 + h * 40) % 3 === 0) on = true; if (h < .05 && Math.floor(t * .015 + h * 90) % 4 === 0) on = false; const dim = !on && h < pal.glow + .06;
        // frame / recess
        if (detail > 5) { ctx.fillStyle = st === 'brick' ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.25)'; ctx.fillRect(x - 1, y - 1, wW + 2, wH + 2); }
        if (on) { const warm = hash2(c * 7, f * 3 + b.id); ctx.fillStyle = warm < .12 ? '#a9d8ff' : warm < .22 ? '#ffb3c6' : warm < .5 ? lit : '#ffe9c0'; ctx.globalAlpha = .8 + hash2(c, f) * .2; }
        else if (dim) { ctx.fillStyle = lit; ctx.globalAlpha = .18; }
        else { ctx.fillStyle = win; ctx.globalAlpha = 1; }
        ctx.fillRect(x, y, wW, wH); ctx.globalAlpha = 1;
        if (on && detail > 9 && hash2(c * 3, f * 5 + b.id) < .16) Lights.add(x + wW / 2, y + wH / 2, 70, LC.warm, .22);
        if (on && detail > 9) drawRoom(ctx, x, y, wW, wH, hash2(f * 31 + c * 7, b.id + 11), hash2(c * 5 + 1, f * 3 + b.id), t, hash2(f + b.id, c * 13 + 5));
        // mullions and sills
        if (detail > 7) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x + wW * .5 - .5, y, 1, wH); if (st !== 'glass') ctx.fillRect(x, y + wH * .5 - .5, wW, 1); if (st === 'glass') { ctx.fillRect(x + wW * .25 - .5, y, 1, wH); ctx.fillRect(x + wW * .75 - .5, y, 1, wH); } }
        if (detail > 10 && (st === 'brick' || st === 'stone' || st === 'tan')) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x - 2, y + wH, wW + 4, 2); }
        if (!on && detail > 12 && hash2(c + 5, f * 2 + b.id) < .3) { ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(x, y, wW, wH * .3); } // dark glass reflection
        if (b.balconies && detail > 6 && f % 2 === 1) { ctx.fillStyle = shade(base, .6); ctx.fillRect(x - 6, y + wH, wW + 12, 4); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - 6, y + wH + 4, wW + 12, 3); ctx.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i <= 5; i++) ctx.fillRect(x - 6 + (wW + 12) * i / 5, y + wH - 14, 1, 14); ctx.fillRect(x - 6, y + wH - 15, wW + 12, 1.5); if (hash2(c + 11, f + b.id) < .2) { ctx.fillStyle = '#2a5a3a'; ctx.beginPath(); ctx.arc(x + 2, y + wH - 8, 5, 0, TAU); ctx.fill(); } }
        if (b.ac && detail > 8 && hash2(c + 21, f + b.id * 2) < .18) { ctx.fillStyle = '#7a7d86'; ctx.fillRect(x + wW * .55, y + wH * .55, wW * .4, wH * .45); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x + wW * .55, y + wH * .55, wW * .4, 2); }
      }
    }
    // cornices, string courses, two-tone panels, pipes, vertical sign, billboard, scaffolding, dishes
    if (st === 'stone' || st === 'tan' || st === 'brick') { ctx.fillStyle = 'rgba(255,255,255,.08)'; for (let f = 5; f < b.floors; f += 5) ctx.fillRect(xAt(f), -f * FLOOR_H - 3, widthAt(f), 3); ctx.fillStyle = shade(base, .75); ctx.fillRect(xAt(b.floors - 1) - 8, -b.h - 14, widthAt(b.floors - 1) + 16, 8); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(xAt(b.floors - 1) - 8, -b.h - 6, widthAt(b.floors - 1) + 16, 3); }
    if (b.panels && detail > 3) { ctx.fillStyle = 'rgba(255,255,255,.04)'; for (let c = 0; c < cols; c += 2) ctx.fillRect(b.x + c * winW, -b.h, winW, b.h); ctx.fillStyle = 'rgba(0,0,0,.18)'; for (let c = 1; c < cols; c++) ctx.fillRect(b.x + c * winW - 1, -b.h, 2, b.h); }
    if (st === 'brick' && detail > 6) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(b.x + b.w - 26, -b.h, 3, b.h); ctx.fillRect(b.x + 8, -b.h, 3, b.h); }
    if (b.vsign && detail > 4) { const sx = b.x + b.w - 10, sy = -Math.min(b.h - 60, FLOOR_H * 6), sh = b.vsign.length * 16 + 12; ctx.fillStyle = '#15101c'; ctx.fillRect(sx, sy, 22, sh); ctx.fillStyle = '#ff4fb8'; ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const flick = hash2(b.id, 77) < .3 && Math.sin(t * 9 + b.id) > .92; if (!flick) { ctx.shadowColor = '#ff4fb8'; ctx.shadowBlur = zoom > .4 ? 8 : 0; for (let i = 0; i < b.vsign.length; i++) ctx.fillText(b.vsign[i], sx + 11, sy + 10 + i * 16); ctx.shadowBlur = 0; } }
    if (b.billboard && zoom > .06) { const rw = widthAt(b.floors - 1), rx = xAt(b.floors - 1), bw = Math.min(rw - 20, 220), bx = rx + rw / 2 - bw / 2, by = -b.h - 74; ctx.fillStyle = '#2a2a34'; ctx.fillRect(bx + bw * .25, by + 44, 4, 30); ctx.fillRect(bx + bw * .75, by + 44, 4, 30); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(bx + 4, by + 5, bw, 46); ctx.fillStyle = hash2(b.id, 3) < .5 ? '#f2e6c8' : '#1a2a4a'; ctx.fillRect(bx, by, bw, 46); ctx.fillStyle = hash2(b.id, 3) < .5 ? '#b0413e' : '#ffd36a'; ctx.font = `bold 17px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.billboard, bx + bw / 2, by + 23); ctx.fillStyle = '#ffe6a8'; ctx.fillRect(bx - 4, by - 8, 8, 4); ctx.fillRect(bx + bw - 4, by - 8, 8, 4); glow(ctx, bx + bw / 2, by + 20, bw * .7, 'rgba(255,230,180,A)', .12); }
    if (b.dish && detail > 6) { const dx = xAt(b.floors - 1) + widthAt(b.floors - 1) * .8; ctx.fillStyle = '#9a9ea8'; ctx.beginPath(); ctx.ellipse(dx, -b.h - 22, 12, 14, -.5, 0, TAU); ctx.fill(); ctx.fillStyle = '#5a5e68'; ctx.fillRect(dx - 2, -b.h - 16, 4, 16); }
    if (b.scaffold && detail > 4) { const sh = FLOOR_H * 5; ctx.fillStyle = 'rgba(120,110,90,.9)'; for (let c = 0; c <= 6; c++) ctx.fillRect(b.x + b.w * c / 6 - 1.5, -sh - FLOOR_H, 3, sh); for (let f = 1; f <= 5; f++) { ctx.fillRect(b.x, -f * FLOOR_H - FLOOR_H - 3, b.w, 4); } ctx.fillStyle = 'rgba(70,120,80,.5)'; ctx.fillRect(b.x, -sh - FLOOR_H, b.w, sh); ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 40; i++) ctx.fillRect(b.x + hash2(i, b.id) * b.w, -sh - FLOOR_H + hash2(i, b.id + 1) * sh, 2, 2); }
    if (b.tower && detail > 2) { ctx.fillStyle = '#ffe6a8'; ctx.font = `bold 34px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = '#ffd36a'; ctx.shadowBlur = zoom > .2 ? 14 : 0; ctx.fillText('MERIDIAN', b.x + b.w / 2, -b.h + FLOOR_H * 1.2); ctx.shadowBlur = 0; glow(ctx, b.x + b.w / 2, -b.h + FLOOR_H * 1.2, 240, 'rgba(255,211,106,A)', .12); }
    // fire escape
    if (b.escape && detail > 5) { const ex = b.x + b.w * .18; ctx.fillStyle = 'rgba(20,20,30,.9)'; for (let f = 1; f < b.floors; f++) { const y = -f * FLOOR_H; ctx.fillRect(ex - 22, y - 3, 44, 3); ctx.fillRect(ex - 22, y - 30, 2, 30); ctx.fillRect(ex + 20, y - 30, 2, 30); ctx.fillRect(ex - 22, y - 30, 44, 1.5); ctx.save(); ctx.translate(ex + 4, y); ctx.rotate(-1.0); ctx.fillRect(0, -2, FLOOR_H * 1.1, 2); ctx.restore(); } }
    // glass towers: faint vertical mullion lines
    if (st === 'glass' && detail > 4) { ctx.fillStyle = 'rgba(255,255,255,.05)'; for (let c = 0; c <= cols; c++) ctx.fillRect(b.x + c * winW - .5, -b.h, 1, b.h); }
  }
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(b.x + b.w - Math.min(16, b.w * .06), -b.h, Math.min(16, b.w * .06), b.h);
  if (b.setback) { const sx = xAt(b.setback.at), sw = widthAt(b.setback.at); ctx.fillRect(sx + sw - Math.min(12, sw * .06), -b.h, Math.min(12, sw * .06), (b.floors - b.setback.at) * FLOOR_H); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(b.x, -b.setback.at * FLOOR_H, b.w, 5); }
  if (zoom > .06) {
    const rx = xAt(b.floors - 1), rw = widthAt(b.floors - 1);
    ctx.fillStyle = shade(base, .7);
    if (b.roof === 'tank') { ctx.fillRect(rx + rw * .6, -b.h - 60, 36, 60); ctx.beginPath(); ctx.moveTo(rx + rw * .6 - 2, -b.h - 60); ctx.lineTo(rx + rw * .6 + 18, -b.h - 78); ctx.lineTo(rx + rw * .6 + 38, -b.h - 60); ctx.fill(); }
    if (b.roof === 'ac') for (let i = 0; i < 3; i++) ctx.fillRect(rx + 20 + i * 44, -b.h - 18, 30, 18);
    if (b.roof === 'antenna' || b.tower) { const ah = b.tower ? 260 : 70; ctx.fillRect(rx + rw * .5 - 2, -b.h - ah, 4, ah); const bl = Math.sin(t * .8 + b.id) > 0; ctx.fillStyle = bl ? '#ff3a3a' : '#5a1a1a'; ctx.beginPath(); ctx.arc(rx + rw * .5, -b.h - ah - 2, b.tower ? 7 : 4, 0, TAU); ctx.fill(); if (bl && b.tower) { ctx.globalAlpha = .2; ctx.beginPath(); ctx.arc(rx + rw * .5, -b.h - 262, 40, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; } }
    ctx.fillStyle = shade(base, .8); ctx.fillRect(rx - 4, -b.h - 6, rw + 8, 8);
    if (b.setback) ctx.fillRect(b.x - 4, -b.setback.at * FLOOR_H - 6, b.w + 8, 8);
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
    ctx.fillStyle = 'rgba(255,230,180,.1)'; ctx.beginPath(); ctx.moveTo(dx - 20, 0); ctx.lineTo(dx + 108, 0); ctx.lineTo(dx + 160, 64); ctx.lineTo(dx - 72, 64); ctx.fill(); Lights.add(b.x + b.w / 2, -gh * .6, 260, LC.warm, .7); Lights.caster(b.x + b.w / 2, 16, 240, .7);
    b.door = { x: dx, w: 88 };
  } else {
    const n = Math.max(1, Math.round(b.w / 200)), sw = b.w / n;
    for (let i = 0; i < n; i++) {
      const CH = (typeof Game !== 'undefined' && Game.city && Game.city.ch) ? Game.city.ch : null;
      const x = b.x + i * sw, k = hash2(b.id, i), neon = NEON[Math.floor(k * NEON.length)], open = k < (CH ? .35 + CH.neon * .45 : .7);
      ctx.fillStyle = open ? 'rgba(255,220,160,.55)' : '#151a2a'; ctx.fillRect(x + 14, -gh + 40, sw * .55, gh - 54);
      ctx.fillStyle = open ? '#4a3a2a' : '#0e1120'; ctx.fillRect(x + sw * .72, -FLOOR_H * .85, 40, FLOOR_H * .85);
      // neon sign
      const pool = CH ? CH.shops : SHOP_NAMES; const name = pool[Math.floor(hash2(i + 3, b.id) * pool.length)];
      ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const flick = (hash2(i, b.id + 1) < .15 && Math.sin((typeof Game !== 'undefined' ? Game.clock : 0) * 700 + i) > .9) || (CH && hash2(i + 7, b.id) > .25 + CH.neon * .75);
      if (!flick) { ctx.shadowColor = neon; ctx.shadowBlur = zoom > .5 ? 12 : 0; ctx.fillStyle = neon; ctx.fillText(name, x + sw * .42, -gh + 22); ctx.shadowBlur = 0; ctx.globalAlpha = .12; ctx.fillRect(x + 6, -gh + 8, sw * .72, 30); ctx.globalAlpha = 1; }
      if (open) { ctx.fillStyle = 'rgba(255,220,160,.09)'; ctx.beginPath(); ctx.moveTo(x + 14, 0); ctx.lineTo(x + 14 + sw * .55, 0); ctx.lineTo(x + 14 + sw * .55 + 40, 54); ctx.lineTo(x - 26, 54); ctx.fill(); Lights.add(x + 14 + sw * .28, -gh * .5, 150, LC.warm, .6); Lights.caster(x + 14 + sw * .28, 14, 150, .6); }
      if (!flick) Lights.add(x + sw * .42, -gh + 22, 105, neon === '#33e9ff' ? LC.neonCyan : neon === '#ff4fb8' ? LC.neonPink : LC.sign, .5);
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
  const CH = city.ch || { lamps: 420, trees: .2 };
  if (zoom > .18) for (let x = Math.floor(x0 / CH.lamps) * CH.lamps; x < x1; x += CH.lamps) {
    const k = hash2(x, 1);
    if (k < .5) {
      ctx.fillStyle = '#12141f'; ctx.fillRect(x - 2, -150, 4, ROAD_Y + 146); ctx.fillRect(x - 2, -152, 30, 4);
      const flick = hash2(x, 4) < .12 && Math.sin((typeof Game !== 'undefined' ? Game.clock : 0) * 900 + x) > .6; if (flick) { ctx.fillStyle = '#5a5a4a'; ctx.beginPath(); ctx.ellipse(x + 30, -150, 12, 6, 0, 0, TAU); ctx.fill(); continue; }
      ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.ellipse(x + 30, -150, 12, 6, 0, 0, TAU); ctx.fill();
      const g = ctx.createRadialGradient(x + 30, -150, 10, x + 30, -150, 260); g.addColorStop(0, 'rgba(255,225,160,.22)'); g.addColorStop(1, 'rgba(255,225,160,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x + 30, -150); ctx.lineTo(x - 120, 60); ctx.lineTo(x + 180, 60); ctx.fill();
    } else if (k < .5 + CH.trees * .5) {
      ctx.fillStyle = '#1e1a2a'; ctx.fillRect(x - 4, -70, 8, ROAD_Y + 64);
      ctx.fillStyle = '#1c3a3a'; ctx.beginPath(); ctx.arc(x, -100, 34, 0, TAU); ctx.arc(x - 22, -80, 24, 0, TAU); ctx.arc(x + 24, -84, 26, 0, TAU); ctx.fill();
    } else if (k < .82) { ctx.fillStyle = '#8a2f2c'; ctx.beginPath(); ctx.roundRect(x - 6, ROAD_Y - 30, 12, 26, 3); ctx.fill(); ctx.fillRect(x - 10, ROAD_Y - 18, 20, 5); }
    else if (k < .92) { ctx.fillStyle = '#4a3320'; ctx.fillRect(x - 30, 8, 60, 6); ctx.fillRect(x - 30, -4, 60, 5); ctx.fillRect(x - 28, 14, 4, 12); ctx.fillRect(x + 24, 14, 4, 12); }
    else { ctx.fillStyle = '#252a3a'; ctx.beginPath(); ctx.roundRect(x - 9, ROAD_Y - 32, 18, 30, 2); ctx.fill(); }
  }
  // intersections: the cross street recedes into the gap
  for (const it of city.inters) if (it.x + GAP > x0 && it.x - GAP < x1) drawIntersection(ctx, city, it, zoom, pal);
  // puddles reflecting neon
  if (zoom > .25) for (const pd of city.puddles) if (pd.x > x0 && pd.x < x1) { ctx.fillStyle = 'rgba(40,50,90,.5)'; ctx.beginPath(); ctx.ellipse(pd.x, ROAD_Y + ROAD_H * .75, pd.w / 2, 5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = pd.col; ctx.globalAlpha = .25; ctx.fillRect(pd.x - pd.w * .2, ROAD_Y + ROAD_H * .75 - 3, pd.w * .4, 2); ctx.globalAlpha = 1; }
  // parked cars at the far curb
  if (zoom > .12) for (const pc of city.parked) if (pc.x > x0 - 100 && pc.x < x1 + 100 && !city.inters.some(it => Math.abs(it.x - pc.x) < GAP)) drawParkedCar(ctx, pc);
  // subway entrance
  if (city.subway && zoom > .18 && city.subway > x0 - 100 && city.subway < x1 + 100) { const sx = city.subway; ctx.fillStyle = '#2a2c3a'; ctx.fillRect(sx - 40, ROAD_Y - 36, 80, 30); ctx.fillStyle = '#0a0c14'; ctx.fillRect(sx - 34, ROAD_Y - 30, 68, 24); ctx.fillStyle = '#3a4a6a'; for (let i = 0; i < 4; i++) ctx.fillRect(sx - 34, ROAD_Y - 30 + i * 6, 68 - i * 10, 2); ctx.fillStyle = '#1e5a3a'; ctx.fillRect(sx - 3, ROAD_Y - 90, 6, 54); ctx.fillStyle = '#3fbf6a'; ctx.beginPath(); ctx.arc(sx, ROAD_Y - 92, 12, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `bold 11px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('M', sx, ROAD_Y - 92); glow(ctx, sx, ROAD_Y - 92, 40, 'rgba(63,191,106,A)', .3); }
  // newspaper boxes, bike racks, mailboxes
  if (zoom > .3) for (let x = Math.floor(x0 / 620) * 620 + 310; x < x1; x += 620) { const k = hash2(x, 9); if (city.inters.some(it => Math.abs(it.x - x) < GAP)) continue; if (k < .3) { ctx.fillStyle = ['#b0413e', '#2f6f9f', '#d9b23a'][Math.floor(k * 10) % 3]; ctx.fillRect(x - 8, ROAD_Y - 30, 16, 26); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x - 6, ROAD_Y - 28, 12, 10); } else if (k < .5) { ctx.fillStyle = '#5a5e70'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + i * 14, ROAD_Y - 12, 8, Math.PI, TAU); ctx.fill(); } ctx.fillStyle = '#3a3d52'; ctx.fillRect(x - 6, ROAD_Y - 12, 40, 4); } else if (k < .62) { ctx.fillStyle = '#2f4f8f'; ctx.beginPath(); ctx.roundRect(x - 9, ROAD_Y - 34, 18, 30, 4); ctx.fill(); ctx.fillStyle = '#1e3060'; ctx.fillRect(x - 9, ROAD_Y - 22, 18, 3); } }
  // pigeons
  if (zoom > .22) { const T = (typeof Game !== 'undefined' ? Game.clock : 0) * 50;
    for (const pg of city.pigeons) { if (pg.x < x0 - 40 || pg.x > x1 + 40) continue;
      const sc = pg.sz, body = pg.col, dark = shade(body, .62), head = shade(body, .8);
      ctx.save(); ctx.translate(pg.x, pg.y - pg.hop); ctx.scale(pg.face * sc, sc);
      if (pg.st === 'fly') {
        const flap = Math.sin(pg.ph + T * 22);
        ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(0, (GROUND + 24 - pg.y + pg.hop), 7, 2, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-1, -1); ctx.quadraticCurveTo(-7, -4 - flap * 7, -14, -1 - flap * 9); ctx.quadraticCurveTo(-7, 1 - flap * 3, -1, 1); ctx.fill();
        ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, 0, 6.5, 3.4, -.12, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-5, -.4); ctx.lineTo(-10.4, 1.6); ctx.lineTo(-10.2, 3.2); ctx.lineTo(-5, 2); ctx.fill();
        ctx.fillStyle = head; ctx.beginPath(); ctx.arc(5.4, -2.4, 2.5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#e8a23a'; ctx.beginPath(); ctx.moveTo(7.4, -2.2); ctx.lineTo(10.4, -1.4); ctx.lineTo(7.4, -.7); ctx.fill();
        ctx.fillStyle = shade(body, 1.25); ctx.beginPath(); ctx.moveTo(-1, -1.5); ctx.quadraticCurveTo(-6, -3 + flap * 6, -12, 1 + flap * 8); ctx.quadraticCurveTo(-6, 1 + flap * 3, -1, .5); ctx.fill();
      } else {
        const peck = pg.st === 'peck' ? clamp(Math.sin(T * 7 + pg.ph) * 1.6, -.2, 1) : 0, bob = pg.st === 'walk' ? Math.sin(T * 9 + pg.ph) * .7 : 0;
        ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, pg.hop + 1, 6.5, 1.8, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#d98a3a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-1 + bob, -1); ctx.lineTo(-2 - bob, 0); ctx.moveTo(2 - bob, -1); ctx.lineTo(3 + bob, 0); ctx.stroke();
        ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, -4, 6.2, 4, -.08, 0, TAU); ctx.fill();
        ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-2, -5); ctx.quadraticCurveTo(-5, -2.5, -5.5, -1.5); ctx.quadraticCurveTo(-1, -3, 1, -5); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-4.4, -5.6); ctx.lineTo(-9.4, -3.6 + bob * .4); ctx.lineTo(-9.6, -1.6 + bob * .4); ctx.lineTo(-4.4, -2.4); ctx.fill();
        const hx = 4.4 + peck * 1.7, hy = -9.4 + peck * 6.2;
        ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(1.6, -7.4); ctx.quadraticCurveTo(hx - 1.8, hy + 2.2, hx - .4, hy + .6); ctx.quadraticCurveTo(hx + 1.8, hy + 2.6, 4.6, -5.6); ctx.fill();
        ctx.fillStyle = head; ctx.beginPath(); ctx.ellipse(hx, hy, 2.7, 2.4, .1, 0, TAU); ctx.fill();
        ctx.fillStyle = '#4a7a8a'; ctx.globalAlpha = .45; ctx.beginPath(); ctx.ellipse(hx - 1.2, hy + 1.8, 1.8, 1.3, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
        ctx.fillStyle = shade(body, 1.22); ctx.beginPath(); ctx.ellipse(2.6, -3.4, 2.6, 2.2, -.2, 0, TAU); ctx.fill();
        ctx.fillStyle = '#d9913a'; ctx.beginPath(); ctx.moveTo(hx + 2.1, hy - .4); ctx.lineTo(hx + 4.6, hy + .7); ctx.lineTo(hx + 2.1, hy + 1.3); ctx.fill(); ctx.fillStyle = '#e8e2d2'; ctx.beginPath(); ctx.ellipse(hx + 2.2, hy - .5, .9, .7, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#e8563a'; ctx.beginPath(); ctx.arc(hx + 1.5, hy - 1, .5, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }
  drawStreetFeature(ctx, city, zoom, x0, x1);
  // colour grade so each street has its own cast
  if (city.grade) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .3; ctx.fillStyle = mix(city.grade, '#ffffff', .45); ctx.fillRect(x0, -9000, x1 - x0, 20000); ctx.restore(); }
  // steam from a manhole
  if (zoom > .3) { const t = (typeof Game !== 'undefined' ? Game.clock : 0) * 60; for (let x = Math.floor(x0 / 1300) * 1300 + 500; x < x1; x += 1300) { ctx.fillStyle = 'rgba(200,200,230,.08)'; for (let i = 0; i < 5; i++) { const ph = (t * .3 + i * 20) % 100; ctx.beginPath(); ctx.arc(x + Math.sin(ph * .1 + i) * 10, ROAD_Y + 40 - ph, 12 + ph * .3, 0, TAU); ctx.fill(); } } }
}
function drawStreetFeature(ctx, city, zoom, x0, x1) {
  if (zoom < .12) return; const f = city.feature, T = typeof Game !== 'undefined' ? Game.clock * 50 : 0;
  const every = (step, fn) => { for (let x = Math.floor(x0 / step) * step; x < x1; x += step) { if (city.inters.some(it => Math.abs(it.x - x) < GAP)) continue; fn(x); } };
  if (f === 'construction') {
    every(700, x => { ctx.fillStyle = '#e07a20'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x + i * 30 - 7, ROAD_Y - 4); ctx.lineTo(x + i * 30 + 7, ROAD_Y - 4); ctx.lineTo(x + i * 30 + 4, ROAD_Y - 26); ctx.lineTo(x + i * 30 - 4, ROAD_Y - 26); ctx.fill(); ctx.fillStyle = '#f2f2f2'; ctx.fillRect(x + i * 30 - 5, ROAD_Y - 18, 10, 4); ctx.fillStyle = '#e07a20'; }
      ctx.fillStyle = '#d9b23a'; ctx.fillRect(x - 20, -70, 6, 70); ctx.fillRect(x + 140, -70, 6, 70); ctx.fillStyle = 'rgba(217,178,58,.5)'; ctx.fillRect(x - 20, -62, 166, 6); ctx.fillStyle = '#2a2c3a'; ctx.fillRect(x + 30, -46, 80, 46); ctx.fillStyle = '#4a4e5c'; ctx.fillRect(x + 30, -52, 80, 8);
      const blink = Math.floor(T * 2) % 2 === 0; ctx.fillStyle = blink ? '#ff8a2a' : '#5a3a1a'; ctx.beginPath(); ctx.arc(x - 17, -76, 5, 0, TAU); ctx.fill(); if (blink && typeof Lights !== 'undefined') Lights.add(x - 17, -76, 90, '255,138,42', .5); });
  } else if (f === 'market') {
    every(430, x => { const c = ['#b0413e', '#3e8a5b', '#2f6f9f', '#d9b23a'][Math.floor(hash2(x, 2) * 4)];
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - 60, -96); ctx.lineTo(x + 60, -96); ctx.lineTo(x + 52, -76); ctx.lineTo(x - 52, -76); ctx.fill();
      ctx.fillStyle = '#3a3040'; ctx.fillRect(x - 54, -76, 4, 76); ctx.fillRect(x + 50, -76, 4, 76); ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x - 56, -44, 112, 10);
      for (let i = 0; i < 6; i++) { ctx.fillStyle = ['#d94a3a', '#e8b23a', '#5aa84a', '#c94a8a'][i % 4]; ctx.beginPath(); ctx.arc(x - 44 + i * 18, -50, 6, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(x, -90, 5, 0, TAU); ctx.fill(); if (typeof Lights !== 'undefined') Lights.add(x, -86, 150, LC.warm, .6); });
  } else if (f === 'theater') {
    every(900, x => { ctx.fillStyle = '#1a1420'; ctx.fillRect(x - 110, -150, 220, 54); ctx.fillStyle = '#f2d98a'; ctx.font = `bold 20px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('MAJESTIC', x, -124);
      for (let i = 0; i < 16; i++) { const on = (Math.floor(T * 6) + i) % 4 !== 0; ctx.fillStyle = on ? '#ffe9a8' : '#4a4030'; ctx.beginPath(); ctx.arc(x - 104 + i * 14, -152, 3.5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(x - 104 + i * 14, -94, 3.5, 0, TAU); ctx.fill(); }
      if (typeof Lights !== 'undefined') Lights.add(x, -120, 300, LC.sign, .8);
      ctx.fillStyle = '#7a1f2d'; ctx.fillRect(x - 70, -6, 140, 6); });
  } else if (f === 'nightlife') {
    every(760, x => { ctx.fillStyle = '#6a1f4a'; ctx.fillRect(x - 60, -8, 120, 8); ctx.fillStyle = '#2a2c3a'; ctx.fillRect(x - 64, -50, 5, 50); ctx.fillRect(x + 60, -50, 5, 50); ctx.fillStyle = '#c9a24a'; ctx.fillRect(x - 62, -44, 126, 3);
      const hue = (T * 60 + x) % 360; ctx.fillStyle = `hsla(${hue},85%,60%,.3)`; ctx.beginPath(); ctx.moveTo(x, -170); ctx.lineTo(x - 90, 30); ctx.lineTo(x + 90, 30); ctx.fill();
      if (typeof Lights !== 'undefined') Lights.add(x, -120, 220, '255,79,184', .55); });
  } else if (f === 'industrial') {
    every(820, x => { ctx.fillStyle = '#3a3a40'; ctx.fillRect(x - 70, -40, 140, 40); ctx.fillStyle = '#2a2a30'; ctx.fillRect(x - 70, -46, 140, 8);
      ctx.fillStyle = '#1a1c24'; ctx.fillRect(x - 40, -90, 80, 44); ctx.fillStyle = '#d9b23a'; ctx.fillRect(x - 36, -86, 72, 5);
      ctx.fillStyle = 'rgba(200,200,220,.1)'; for (let i = 0; i < 4; i++) { const ph = (T * .5 + i * .25) % 1; ctx.beginPath(); ctx.arc(x + 90, -20 - ph * 130, 14 + ph * 26, 0, TAU); ctx.fill(); } });
  } else if (f === 'finance') {
    every(560, x => { ctx.fillStyle = '#2a2f40'; ctx.fillRect(x - 46, -12, 92, 12); ctx.fillStyle = '#3a4152'; ctx.fillRect(x - 40, -22, 80, 10);
      ctx.fillStyle = '#c9cdd8'; ctx.fillRect(x - 6, -70, 12, 58); ctx.beginPath(); ctx.arc(x, -76, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = '#8a8e9a'; ctx.fillRect(x - 60, -4, 120, 4); });
  } else if (f === 'quiet') {
    every(500, x => { ctx.fillStyle = '#4a3320'; ctx.fillRect(x - 34, 6, 68, 7); ctx.fillRect(x - 34, -8, 68, 6); ctx.fillRect(x - 30, 13, 5, 14); ctx.fillRect(x + 25, 13, 5, 14);
      ctx.fillStyle = '#2a4a3a'; ctx.beginPath(); ctx.arc(x + 70, -30, 18, 0, TAU); ctx.fill(); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x + 67, -30, 6, 30); });
  }
}
function drawIntersection(ctx, city, it, zoom, pal) {
  const x = it.x, half = GAP / 2, t = typeof Game !== 'undefined' ? Game.clock : 0;
  // the cross street: sidewalk continues, road goes "into" the screen with converging edges
  const depth = 900; ctx.fillStyle = '#12141f'; ctx.beginPath(); ctx.moveTo(x - half + 20, GROUND); ctx.lineTo(x + half - 20, GROUND); ctx.lineTo(x + 30, GROUND - depth); ctx.lineTo(x - 30, GROUND - depth); ctx.fill();
  // haze deep in the corridor so it has air in it
  { const g = ctx.createLinearGradient(0, GROUND - depth, 0, GROUND); g.addColorStop(0, 'rgba(60,70,120,.55)'); g.addColorStop(1, 'rgba(20,24,44,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - half + 20, GROUND); ctx.lineTo(x + half - 20, GROUND); ctx.lineTo(x + 30, GROUND - depth); ctx.lineTo(x - 30, GROUND - depth); ctx.fill(); }
  // tiny facades receding on each side
  const seed = it.k * 13 + (city.i + 1) * 7; for (let side = -1; side <= 1; side += 2) for (let d = 0; d < 8; d++) { const f = d / 8, sc = 1 - f * .85, w = 90 * sc, h = (120 + hash2(seed + d, side + 3) * 400) * sc, bx = x + side * (half - 20 + 24 * f * 0) - (side > 0 ? 0 : w) + side * 0; const yy = GROUND - f * depth * .55; ctx.fillStyle = mix(FACADE[['glass', 'brick', 'concrete', 'dark'][(d + it.k) % 4]].base, pal.skyBot, f * .6); ctx.fillRect(side > 0 ? x + (half - 22) * sc + 8 : x - (half - 22) * sc - 8 - w * .0 - w, yy - h, w, h); ctx.fillStyle = `rgba(255,226,160,${.5 * (1 - f)})`; for (let k = 0; k < 6; k++) if (hash2(seed + d * 3 + k, side) < .3) ctx.fillRect((side > 0 ? x + (half - 22) * sc + 8 : x - (half - 22) * sc - 8 - w) + 8 * sc + (k % 3) * 26 * sc, yy - h + 12 * sc + Math.floor(k / 3) * 40 * sc, 8 * sc, 10 * sc); }
  // lane line into the distance, then crosswalk stripes across the main road
  ctx.fillStyle = '#c9b45a'; for (let d = 0; d < 10; d++) { const f = d / 10; ctx.fillRect(x - 2 * (1 - f * .8), GROUND - f * depth * .55 - 20, 4 * (1 - f * .8), 12 * (1 - f * .6)); }
  // lamps receding down the cross street
  for (let d = 1; d < 5; d++) { const f = d / 5, sc = 1 - f * .8, yy = GROUND - f * depth * .55; for (const side of [-1, 1]) { const lx = x + side * (half - 16) * sc; ctx.fillStyle = '#ffe9a8'; ctx.globalAlpha = 1 - f * .5; ctx.beginPath(); ctx.ellipse(lx, yy - 150 * sc, 8 * sc, 4 * sc, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; if (typeof Lights !== 'undefined') Lights.add(lx, yy - 150 * sc, 130 * sc, LC.lamp, .7 * (1 - f * .5)); } }
  ctx.fillStyle = 'rgba(255,255,255,.75)'; for (let k = 0; k < 7; k++) ctx.fillRect(x - half + 24 + k * 26, ROAD_Y + 6, 16, ROAD_H - 12);
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x - half - 8, ROAD_Y + 2, 5, ROAD_H / 2 - 4); ctx.fillRect(x + half + 3, ROAD_Y + ROAD_H / 2 + 2, 5, ROAD_H / 2 - 4);
  // crosswalk on the sidewalk (where the player crosses)
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x - 40, GROUND, 80, WALK_DEPTH + 6);
  if (zoom > .18) {
    const ew = lightFor(city.dir, t), ped = ew === 'green' ? 'stop' : 'walk';
    const light = (lx, ly, state, facing) => { ctx.fillStyle = '#12141f'; ctx.fillRect(lx - 3, ly, 6, ROAD_Y - ly - 4); ctx.fillRect(lx - 3, ly, facing * 40, 5); ctx.fillStyle = '#1a1c24'; ctx.fillRect(lx + facing * 34 - 7, ly - 2, 14, 36); ['red', 'yellow', 'green'].forEach((c, i) => { ctx.fillStyle = c === state ? { red: '#ff3b30', yellow: '#ffcc33', green: '#3fdc6a' }[c] : '#2a2c34'; ctx.beginPath(); ctx.arc(lx + facing * 34, ly + 5 + i * 11, 4, 0, TAU); ctx.fill(); if (c === state) Lights.add(lx + facing * 34, ly + 5 + i * 11, 70, c === 'red' ? '255,60,50' : c === 'yellow' ? '255,204,51' : '63,220,106', .55); }); };
    light(x - half - 30, -150, ew, 1); light(x + half + 30, -150, ew, -1);
    // pedestrian signal + corner street signs
    for (const side of [-1, 1]) { const px = x + side * (half + 30); ctx.fillStyle = '#1a1c24'; ctx.fillRect(px - 8, -96, 16, 22); ctx.fillStyle = ped === 'walk' ? '#e8f0ff' : '#ff6a3a'; if (ped === 'walk') { ctx.fillRect(px - 2, -92, 4, 6); ctx.fillRect(px - 4, -86, 8, 8); } else { ctx.fillRect(px - 5, -90, 10, 10); }
      ctx.fillStyle = '#2f6f3f'; ctx.fillRect(px - 2, -230, 4, 100); ctx.fillStyle = '#1e6a3a'; ctx.fillRect(px - 34, -228, 68, 14); ctx.fillStyle = '#fff'; ctx.font = `bold 8px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(city.name.toUpperCase(), px, -221); ctx.fillStyle = '#1e6a3a'; ctx.fillRect(px - 4, -214, 44, 14); ctx.fillStyle = '#fff'; ctx.fillText(City.name(it.cross.dir, it.cross.i).toUpperCase(), px + 18, -207); }
  }
}
function drawParkedCar(ctx, pc) {
  const L = pc.kind === 'van' ? 120 : 100, y = ROAD_Y + ROAD_H * .3, s = .86;
  ctx.save(); ctx.translate(pc.x, y); ctx.scale(s, s); ctx.fillStyle = mix(pc.col, '#101428', .55); ctx.beginPath();
  if (pc.kind === 'van') { ctx.moveTo(-L / 2, 0); ctx.lineTo(-L / 2, -46); ctx.lineTo(L * .3, -46); ctx.lineTo(L * .45, -28); ctx.lineTo(L / 2, -20); ctx.lineTo(L / 2, 0); }
  else if (pc.kind === 'suv') { ctx.moveTo(-L / 2, 0); ctx.lineTo(-L / 2, -24); ctx.lineTo(-L * .3, -28); ctx.lineTo(-L * .25, -44); ctx.lineTo(L * .3, -44); ctx.lineTo(L * .4, -28); ctx.lineTo(L / 2, -24); ctx.lineTo(L / 2, 0); }
  else { ctx.moveTo(-L / 2, 0); ctx.lineTo(-L / 2, -18); ctx.lineTo(-L * .3, -22); ctx.lineTo(-L * .2, -38); ctx.lineTo(L * .2, -38); ctx.lineTo(L * .32, -22); ctx.lineTo(L / 2, -18); ctx.lineTo(L / 2, 0); }
  ctx.closePath(); ctx.fill(); ctx.fillStyle = '#141a30'; ctx.fillRect(-L * .25, -36, L * .5, 12); ctx.fillStyle = '#0a0c14'; for (const wx of [-L * .3, L * .3]) { ctx.beginPath(); ctx.arc(wx, 0, 11, 0, TAU); ctx.fill(); } ctx.restore();
}
// ---------- cars ----------
const CAR_COL = ['#b0413e', '#e8e3d6', '#2b2f3a', '#3d4150', '#2f6f9f', '#d9b23a', '#8a8e96', '#3e8a5b', '#5a4a3a'];
// tiny synth for street sounds (browser only; unlocked on first tap/key)
const Sfx = {
  ctx: null, ok: false,
  init() { if (this.ctx || typeof window === 'undefined' || !(window.AudioContext || window.webkitAudioContext)) return; this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.ok = true; },
  tone(f, dur, type, vol, slide) { if (!this.ok) return; try { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type || 'square'; o.frequency.setValueAtTime(f, c.currentTime); if (slide) o.frequency.linearRampToValueAtTime(slide, c.currentTime + dur); g.gain.setValueAtTime(vol || .04, c.currentTime); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + dur); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + dur); } catch (e) {} },
  honk(dist) { const v = clamp(.06 * (1 - dist / 1400), 0, .06); if (v > .003) { this.tone(310 + Math.random() * 60, .25 + Math.random() * .3, 'square', v); this.tone(415, .25, 'square', v * .6); } },

};
class Car {
  constructor(lane, x, seed) { const r = RNG(seed); this.lane = lane; this.honkT = r.range(2, 12); this.emergency = r.chance(.025) ? r.pick(['police', 'ambulance']) : null; this.bus = !this.emergency && r.chance(.1); if (this.bus) { this.kind = 'bus'; this.len = 210; this.col = '#3a6fa0'; } this.sirenT = 0; this.x = x; this.dir = lane === 0 ? -1 : 1; this.v = r.range(180, 300); this.col = r.pick(CAR_COL); if (!this.bus) { this.kind = this.emergency ? (this.emergency === 'police' ? 'sedan' : 'van') : r.weighted([['sedan', 5], ['suv', 3], ['taxi', 2], ['van', 1.5], ['truck', .7]]); if (this.kind === 'taxi') this.col = '#e8c22a'; if (this.emergency) this.col = this.emergency === 'police' ? '#1a1c28' : '#f2f2f2'; this.len = this.kind === 'truck' ? 150 : this.kind === 'van' ? 120 : 100; } }
  get y() { return this.lane === 0 ? ROAD_Y + ROAD_H * .3 : ROAD_Y + ROAD_H * .78; }
  update(dt, x0, x1, city, cars) {
    const light = city ? lightFor(city.dir, typeof Game !== 'undefined' ? Game.clock : 0) : 'green';
    let target = this.v;
    if (city && light !== 'green') for (const it of city.inters) { const stop = it.x - this.dir * (GAP / 2 + 30), gap = (stop - this.x) * this.dir; if (gap > 0 && gap < 160) { target = light === 'yellow' && gap < 60 ? this.v : Math.min(target, this.v * Math.max(0, (gap - 12) / 150)); } }
    if (cars) for (const o of cars) { if (o === this || o.lane !== this.lane) continue; const gap = (o.x - this.x) * this.dir - (o.len + this.len) / 2; if (gap > 0 && gap < 90) target = Math.min(target, Math.max(0, (gap - 14) / 90) * this.v); }
    this.spd = this.spd === undefined ? this.v : this.spd + (target - this.spd) * Math.min(1, dt * (target < this.spd ? 6 : 2));
    this.x += this.spd * this.dir * dt; if (this.dir > 0 && this.x > x1) this.x = x0 - 200; if (this.dir < 0 && this.x < x0) this.x = x1 + 200;
    this.braking = target < this.v * .5;
    // honking when stuck behind someone at a green light; sirens on emergency vehicles
    const G_ = typeof Game !== 'undefined' ? Game : null;
    if (G_ && G_.player && G_.scene && G_.scene.name === 'street') {
      const d = Math.abs(this.x - G_.player.x);
      if (this.braking && light === 'green' && !this.emergency) { this.honkT -= dt; if (this.honkT <= 0) { this.honkT = 8 + Math.random() * 16; this.honk = .6; Sfx.honk(d); } } else if (Math.random() < dt * .006 && d < 700 && !this.emergency) { this.honk = .5; Sfx.honk(d); }
      if (this.emergency) target = this.v * 1.35;
    }
    if (this.honk > 0) this.honk -= dt;
  }
  draw(ctx, pal, zoom) {
    const L = this.len, s = this.lane === 0 ? .86 : 1;
    ctx.save(); ctx.translate(this.x, this.y); ctx.scale(this.dir * s, s);
    ctx.fillStyle = mix(this.col, '#101428', .45); ctx.beginPath();
    if (this.kind === 'bus') { ctx.moveTo(-L / 2, 0); ctx.lineTo(-L / 2, -54); ctx.lineTo(L / 2 - 8, -54); ctx.lineTo(L / 2, -40); ctx.lineTo(L / 2, 0); }
    else if (this.kind === 'sedan' || this.kind === 'taxi') { ctx.moveTo(-L / 2, 0); ctx.lineTo(-L / 2, -18); ctx.lineTo(-L * .3, -22); ctx.lineTo(-L * .2, -38); ctx.lineTo(L * .2, -38); ctx.lineTo(L * .32, -22); ctx.lineTo(L / 2, -18); ctx.lineTo(L / 2, 0); }
    else if (this.kind === 'suv') { ctx.moveTo(-L / 2, 0); ctx.lineTo(-L / 2, -24); ctx.lineTo(-L * .3, -28); ctx.lineTo(-L * .25, -44); ctx.lineTo(L * .3, -44); ctx.lineTo(L * .4, -28); ctx.lineTo(L / 2, -24); ctx.lineTo(L / 2, 0); }
    else if (this.kind === 'van') { ctx.moveTo(-L / 2, 0); ctx.lineTo(-L / 2, -46); ctx.lineTo(L * .3, -46); ctx.lineTo(L * .45, -28); ctx.lineTo(L / 2, -20); ctx.lineTo(L / 2, 0); }
    else { ctx.moveTo(-L / 2, 0); ctx.lineTo(-L / 2, -52); ctx.lineTo(L * .25, -52); ctx.lineTo(L * .25, -40); ctx.lineTo(L * .4, -40); ctx.lineTo(L / 2, -22); ctx.lineTo(L / 2, 0); }
    ctx.closePath(); ctx.fill();
    // windows
    ctx.fillStyle = '#1e2a48';
    if (this.kind === 'sedan' || this.kind === 'taxi') { ctx.beginPath(); ctx.moveTo(-L * .27, -23); ctx.lineTo(-L * .18, -35); ctx.lineTo(L * .18, -35); ctx.lineTo(L * .28, -23); ctx.closePath(); ctx.fill(); }
    else if (this.kind === 'suv') { ctx.beginPath(); ctx.moveTo(-L * .27, -29); ctx.lineTo(-L * .22, -41); ctx.lineTo(L * .27, -41); ctx.lineTo(L * .35, -29); ctx.closePath(); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(L * .26, -43); ctx.lineTo(L * .38, -30); ctx.lineTo(L * .26, -30); ctx.closePath(); ctx.fill(); }
    if (this.kind === 'bus') { ctx.fillStyle = '#ffe6a8'; ctx.globalAlpha = .8; for (let i = 0; i < 8; i++) ctx.fillRect(-L / 2 + 14 + i * 24, -44, 16, 16); ctx.globalAlpha = 1; ctx.fillStyle = '#ffd36a'; ctx.fillRect(L / 2 - 46, -58, 40, 10); ctx.fillStyle = '#1a1a1a'; ctx.font = `bold 7px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('M23 DOWNTOWN', L / 2 - 26, -53); }
    if (this.emergency) { const on = Math.floor((typeof Game !== 'undefined' ? Game.clock : 0) * 400) % 2 === 0; ctx.fillStyle = on ? '#ff3b30' : '#3a6fff'; ctx.fillRect(-16, -50, 12, 6); ctx.fillStyle = on ? '#3a6fff' : '#ff3b30'; ctx.fillRect(4, -50, 12, 6); glow(ctx, on ? -10 : 10, -47, 120, on ? 'rgba(255,60,48,A)' : 'rgba(58,111,255,A)', .35); if (this.emergency === 'ambulance') { ctx.fillStyle = '#c0392b'; ctx.fillRect(-L * .2, -36, L * .5, 4); } }
    if (this.honk > 0) { ctx.save(); ctx.scale(this.dir, 1); ctx.fillStyle = '#ffe6a8'; ctx.font = `bold 11px ${FONT}`; ctx.textAlign = 'center'; ctx.globalAlpha = Math.min(1, this.honk * 3); ctx.fillText(this.honk > .3 ? 'HONK' : 'honk', 0, -62); ctx.restore(); }
    if (this.kind === 'taxi') { ctx.fillStyle = '#ffe36a'; ctx.fillRect(-14, -46, 28, 8); ctx.fillStyle = '#1a1a1a'; ctx.font = `bold 7px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('TAXI', 0, -39); }
    // wheels
    ctx.fillStyle = '#0a0c14'; for (const wx of [-L * .3, L * .3]) { ctx.beginPath(); ctx.arc(wx, 0, 11, 0, TAU); ctx.fill(); ctx.fillStyle = '#5a5e70'; ctx.beginPath(); ctx.arc(wx, 0, 5, 0, TAU); ctx.fill(); ctx.fillStyle = '#0a0c14'; }
    // lights
    ctx.fillStyle = '#fff6c0'; ctx.fillRect(L / 2 - 6, -16, 6, 5); ctx.fillStyle = '#ff3b30'; ctx.fillRect(-L / 2, -16, 6, 5); if (this.braking) glow(ctx, -L / 2 + 2, -14, 26, 'rgba(255,60,48,A)', .5);
    Lights.add(this.x + this.dir * (L / 2 + 40), this.y - 14, 130, LC.head, .55); Lights.add(this.x - this.dir * (L / 2), this.y - 12, 55, LC.tail, .35); if (this.lane === 1) Lights.caster(this.x + this.dir * 70, this.y - 6, 130, .35);
    { ctx.globalAlpha = .18; ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.moveTo(L / 2, -16); ctx.lineTo(L / 2 + 120, -30); ctx.lineTo(L / 2 + 120, 6); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.restore();
  }
}
