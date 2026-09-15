// ===== economy: a crappy job, rent, and every way up =====
const RENT = 160, RENT_EVERY = 4;   // due every 4 nights
const WAGE = 62;                   // one factory shift
const OUTFITS = {
  worn:     { tier: 0, name: 'What you have',  look: 8,  top: { type: 'hoodie', color: '#7a4a3a', color2: '#c9c6bc' }, bottom: { type: 'jeans', color: '#4a5a72' }, shoes: 'sneakers', shoeColor: '#e8e3d6' },
  thrift:   { tier: 1, name: 'Thrift fit',      look: 22, price: 35,   top: { type: 'jacket', color: '#3e8a5b', color2: '#e8e0c8' }, bottom: { type: 'chinos', color: '#5a5f6b' }, shoes: 'boots', shoeColor: '#6b4726' },
  mall:     { tier: 2, name: 'Mall clothes',    look: 42, price: 140,  top: { type: 'shirt', color: '#eef3f8', color2: '#eef3f8' }, bottom: { type: 'slacks', color: '#2b2f3a' }, shoes: 'dress', shoeColor: '#1c1a17' },
  tailored: { tier: 3, name: 'Tailored suit',   look: 70, price: 620,  top: { type: 'suit', color: '#1e2230', color2: '#f5f0e0' }, bottom: { type: 'slacks', color: '#1e2230' }, shoes: 'dress', shoeColor: '#1c1a17', tie: '#7a1f2d' },
  designer: { tier: 4, name: 'Designer',        look: 92, price: 2400, top: { type: 'suit', color: '#3a2a2a', color2: '#f5f0e0' }, bottom: { type: 'slacks', color: '#3a2a2a' }, shoes: 'dress', shoeColor: '#1c1a17', tie: '#c9a24a', hair: 'slick' },
};
const JEWELRY = [
  { id: 'watch', name: 'Watch', price: 260, look: 8, col: '#c0c4cc' },
  { id: 'chain', name: 'Gold chain', price: 780, look: 14, col: '#c9a24a' },
  { id: 'ring', name: 'Signet ring', price: 420, look: 6, col: '#c9a24a' },
  { id: 'earring', name: 'Diamond stud', price: 1500, look: 12, col: '#e8f0ff' },
];
const CARS = [
  { id: 'beater', name: 'Rusted hatchback', price: 1800, look: 6, col: '#8a8e96', kind: 'sedan' },
  { id: 'sedan', name: 'Clean sedan', price: 6500, look: 16, col: '#2b2f3a', kind: 'sedan' },
  { id: 'sport', name: 'Sports coupe', price: 24000, look: 34, col: '#b0413e', kind: 'sedan' },
];
const Econ = {
  init(G) {
    G.energy = 80; G.food = 0; G.look = 8; G.night = 1; G.rentDue = RENT_EVERY; G.owed = 0;
    G.outfit = 'worn'; G.jewelry = []; G.car = null; G.groomed = 0; G.shiftDone = false; G.heat = 0; G.bottles = 0;
    G.lastHour = G.hour();
  },
  // called every frame
  tick(G, dt) {
    const h = G.hour();
    // a new night starts at 8pm rollover
    if (h < G.lastHour - 5) { G.night++; G.shiftDone = false; G.rentDue--; G.groomed = Math.max(0, G.groomed - 1); this.recalcLook(G);
      if (G.rentDue <= 0) { if (G.cash >= RENT + G.owed) { G.cash -= RENT + G.owed; G.owed = 0; UI.say('Rent paid: $' + RENT, 3); } else { G.owed += RENT; UI.say('RENT OVERDUE. You owe $' + G.owed + '.', 4); G.look = Math.max(0, G.look - 3); } G.rentDue = RENT_EVERY; }
      UI.setHint('Night ' + G.night + ' · rent in ' + G.rentDue + (G.rentDue === 1 ? ' night' : ' nights'), 3.5);
    }
    G.lastHour = h;
    G.energy = Math.max(0, G.energy - dt * .11);
    if (G.heat > 0) G.heat = Math.max(0, G.heat - dt * .04);
  },
  recalcLook(G) {
    const o = OUTFITS[G.outfit]; let l = o.look + (G.groomed > 0 ? 10 : 0);
    for (const j of G.jewelry) l += JEWELRY.find(x => x.id === j).look;
    if (G.car) l += CARS.find(c => c.id === G.car).look;
    if (G.owed > 0) l -= 6; if (G.energy < 20) l -= 5;
    G.look = clamp(Math.round(l), 0, 100);
  },
  wear(G, id) {
    const o = OUTFITS[id], p = G.player.spec; G.outfit = id;
    p.top = Object.assign({}, o.top); p.bottom = Object.assign({}, o.bottom); p.shoes = o.shoes; p.shoeColor = o.shoeColor; p.tie = o.tie || null; p.heels = false;
    if (o.hair) p.hair.style = o.hair;
    p.accessory = G.jewelry.includes('watch') ? 'none' : p.accessory;
    this.recalcLook(G);
  },
  speedMul(G) { return G.energy < 15 ? .6 : G.energy < 35 ? .85 : 1; },
};

// ---------- a generic shop menu (drawn over the scene) ----------
const Shop = {
  open: null,
  show(title, items, onPick) { this.open = { title, items, onPick, sel: 0 }; Camera.locked = true; },
  close() { this.open = null; Camera.locked = false; },
  update(G) {
    const S = this.open; if (!S) return;
    G.player.vx = 0;
    if (Input.consume('ArrowDown') || Input.consume('KeyS')) S.sel = Math.min(S.items.length - 1, S.sel + 1);
    if (Input.consume('ArrowUp') || Input.consume('KeyW')) S.sel = Math.max(0, S.sel - 1);
    if (Input.consume('Enter') || Input.consume('Space') || Input.consume('KeyE')) this.pick(G, S.items[S.sel]);
    if (Input.consume('Escape')) this.close();
    if (Input.tap) { const id = UI.hit(Input.tap); if (id && id.startsWith('shop:')) { this.pick(G, S.items[parseInt(id.slice(5))]); Input.tap = null; } else if (id === 'esc') { this.close(); Input.tap = null; } }
  },
  pick(G, it) { if (!it) return; if (it.disabled) { UI.say(it.disabled, 1.8); return; } if (it.price && G.cash < it.price) { UI.say('You have $' + G.cash + '. It is $' + it.price + '.', 2.2); return; } if (it.price) G.cash -= it.price; this.open.onPick(it); if (!it.keepOpen) this.close(); },
  draw(ctx, G) {
    const S = this.open; if (!S) return;
    const W = Camera.w, H = Camera.h, rows = S.items.length, rh = Math.min(44, (H - 180) / rows), pw = Math.min(W - 30, 480), ph = rows * rh + 100, px = W / 2 - pw / 2, py = H / 2 - ph / 2;
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H);
    shadowCut(ctx, '#f2ecdf', px, py, pw, ph, 8); ctx.fillStyle = '#1c1a24'; ctx.font = `bold 16px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(S.title + '   ·   $' + G.cash, px + pw / 2, py + 26);
    S.items.forEach((it, i) => { const y = py + 50 + i * rh, sel = i === S.sel, can = !it.price || G.cash >= it.price; UI.button(ctx, 'shop:' + i, px + 12, y, pw - 24, rh - 6, '', true, sel ? '#ffd36a' : it.disabled ? '#d8d2c4' : '#fff8ea', '#1c1a24');
      ctx.fillStyle = it.disabled ? '#8a8a8a' : can ? '#1c1a24' : '#9a8a7a'; ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText(it.name, px + 26, y + (rh - 6) / 2);
      if (it.sub) { ctx.font = `11px ${FONT}`; ctx.fillStyle = '#5a5a6a'; ctx.fillText(it.sub, px + pw * .48, y + (rh - 6) / 2); }
      ctx.textAlign = 'right'; ctx.font = `bold 13px ${FONT}`; ctx.fillStyle = can ? '#1c1a24' : '#b0413e'; ctx.fillText(it.price ? '$' + it.price : (it.tag || ''), px + pw - 26, y + (rh - 6) / 2); });
    UI.button(ctx, 'esc', px + pw / 2 - 50, py + ph - 38, 100, 28, 'Leave', true);
  },
};

// ---------- venues on the streets ----------
// x positions are per-street; each venue paints its own frontage and answers a prompt
const VENUES = {
  ew1: [
    { x: 4300, w: 200, kind: 'clothes', name: 'THREADS', neon: '#33e9ff' },
    { x: 1150, w: 160, kind: 'barber', name: 'BARBER', neon: '#ff4fb8' },
    { x: 5250, w: 200, kind: 'jewelry', name: 'GOLD & CO', neon: '#ffdf5a' },
  ],
  ew0: [{ x: 2350, w: 300, kind: 'cars', name: 'AUTO MILE', neon: '#7dff7a' }],
  ew3: [{ x: 3050, w: 420, kind: 'factory', name: 'CONTINENTAL PACKING', neon: '#ffdf5a' }, { x: 900, w: 160, kind: 'scrap', name: 'SCRAP', neon: '#ff7a4a' }],
  ns0: [{ x: 2350, w: 160, kind: 'deli', name: 'DELI', neon: '#7dff7a' }, { x: 3900, w: 160, kind: 'deli', name: 'NOODLES', neon: '#ff7a4a' }],
  ns2: [{ x: 3000, w: 180, kind: 'dice', name: 'BACK ALLEY', neon: '#b47cff' }, { x: 4400, w: 220, kind: 'club', name: 'VELVET', neon: '#ff4fb8' }],
  ns1: [{ x: 2900, w: 160, kind: 'deli', name: 'CAFE', neon: '#ffdf5a' }],
};
function venuesFor(city) { return VENUES[city.id] || []; }
function drawVenue(ctx, v, zoom, G) {
  const gh = FLOOR_H * 1.15, x = v.x, w = v.w;
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x, -gh, w, gh);
  if (v.kind === 'factory') {
    ctx.fillStyle = '#2a2c34'; ctx.fillRect(x, -gh, w, gh); Tex.paint(ctx, 'brickwall', 99, '#3a3236', x, -gh, w, gh); ctx.fillStyle = '#1a1c24'; ctx.fillRect(x + 40, -FLOOR_H * .95, 90, FLOOR_H * .95); ctx.fillStyle = '#d9b23a'; ctx.fillRect(x + 40, -FLOOR_H * .95, 90, 6); for (let i = 0; i < 4; i++) ctx.fillRect(x + 40 + i * 24, -FLOOR_H * .95 + 8, 14, 3);
    ctx.fillStyle = '#2a2c34'; ctx.fillRect(x + 170, -FLOOR_H * .8, 200, FLOOR_H * .8); ctx.fillStyle = '#5a5e68'; for (let i = 0; i < 6; i++) ctx.fillRect(x + 176 + i * 32, -FLOOR_H * .75, 24, 30); ctx.fillStyle = 'rgba(255,220,160,.25)'; for (let i = 0; i < 6; i++) if (i % 2) ctx.fillRect(x + 176 + i * 32, -FLOOR_H * .75, 24, 30);
    ctx.fillStyle = '#1a1c24'; ctx.fillRect(x + 10, -gh - 90, 26, 90); ctx.fillStyle = 'rgba(200,200,220,.12)'; for (let i = 0; i < 4; i++) { const ph = ((typeof Game !== 'undefined' ? Game.clock * 50 : 0) * .5 + i * .25) % 1; ctx.beginPath(); ctx.arc(x + 23 + Math.sin(ph * 5) * 12, -gh - 90 - ph * 130, 12 + ph * 24, 0, TAU); ctx.fill(); }
  } else if (v.kind === 'cars') {
    ctx.fillStyle = '#1e2232'; ctx.fillRect(x, -gh, w, gh); ctx.fillStyle = 'rgba(160,190,230,.35)'; ctx.fillRect(x + 10, -gh + 30, w - 20, gh - 44); ctx.fillStyle = '#2b3550'; for (let i = 1; i < 4; i++) ctx.fillRect(x + 10 + (w - 20) * i / 4 - 2, -gh + 30, 4, gh - 44);
    for (let i = 0; i < 3; i++) { const cx = x + 50 + i * 95, col = ['#b0413e', '#2b2f3a', '#8a8e96'][i]; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx - 34, -14); ctx.lineTo(cx - 34, -28); ctx.lineTo(cx - 20, -30); ctx.lineTo(cx - 12, -42); ctx.lineTo(cx + 14, -42); ctx.lineTo(cx + 24, -30); ctx.lineTo(cx + 36, -28); ctx.lineTo(cx + 36, -14); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#0a0c14'; ctx.beginPath(); ctx.arc(cx - 20, -14, 7, 0, TAU); ctx.arc(cx + 20, -14, 7, 0, TAU); ctx.fill(); }
    Lights.add(x + w / 2, -gh * .6, 300, LC.cool, .6); Lights.caster(x + w / 2, 14, 220, .5);
  } else if (v.kind === 'dice') {
    ctx.fillStyle = '#0b0e1a'; ctx.fillRect(x, -gh * 1.3, w, gh * 1.3); ctx.fillStyle = '#2a2436'; ctx.fillRect(x + 20, -60, 60, 60); ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(x + w / 2, -gh + 40, 5, 0, TAU); ctx.fill(); Lights.add(x + w / 2, -gh + 40, 160, LC.lamp, .6); Lights.caster(x + w / 2, 16, 150, .5);
    ctx.fillStyle = '#e8e2d2'; ctx.fillRect(x + w / 2 - 12, -6, 24, 6); ctx.fillStyle = '#1c1a24'; ctx.fillRect(x + w / 2 - 8, -5, 2, 2); ctx.fillRect(x + w / 2 + 6, -5, 2, 2);
  } else {
    const open = v.kind !== 'club' || true; ctx.fillStyle = v.kind === 'club' ? '#2a1430' : '#3a3444'; ctx.fillRect(x, -gh, w, gh);
    ctx.fillStyle = v.kind === 'club' ? 'rgba(255,79,184,.18)' : 'rgba(255,220,160,.5)'; ctx.fillRect(x + 14, -gh + 40, w * .55, gh - 54);
    ctx.fillStyle = '#4a3a2a'; ctx.fillRect(x + w * .72, -FLOOR_H * .85, 40, FLOOR_H * .85);
    if (v.kind === 'clothes') { ctx.fillStyle = '#3a3040'; for (let i = 0; i < 3; i++) { const mx = x + 30 + i * 34; ctx.beginPath(); ctx.arc(mx, -gh + 58, 6, 0, TAU); ctx.fill(); ctx.fillRect(mx - 8, -gh + 64, 16, 30); ctx.fillStyle = ['#b0413e', '#2f6f9f', '#1e2230'][i]; ctx.fillRect(mx - 9, -gh + 64, 18, 22); ctx.fillStyle = '#3a3040'; ctx.fillRect(mx - 1, -gh + 94, 2, 16); } }
    if (v.kind === 'jewelry') { ctx.fillStyle = '#c9a24a'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x + 26 + i * 18, -gh + 70 + (i % 2) * 8, 3, 0, TAU); ctx.fill(); } Lights.add(x + w * .4, -gh * .5, 160, LC.sign, .7); }
    if (v.kind === 'barber') { ctx.fillStyle = '#e8e2d2'; ctx.fillRect(x + w - 30, -gh + 20, 10, 60); const t = (typeof Game !== 'undefined' ? Game.clock * 50 : 0); for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#b0413e' : '#2f6f9f'; ctx.fillRect(x + w - 30, -gh + 22 + ((i * 10 + t * 20) % 56), 10, 5); } }
    if (v.kind === 'deli') { ctx.fillStyle = '#e8e2d2'; ctx.fillRect(x + 20, -gh + 60, w * .5, 4); ctx.fillStyle = '#d94a3a'; ctx.beginPath(); ctx.arc(x + 34, -gh + 54, 5, 0, TAU); ctx.fill(); ctx.fillStyle = '#e8b23a'; ctx.beginPath(); ctx.arc(x + 50, -gh + 54, 5, 0, TAU); ctx.fill(); }
    if (v.kind === 'club') { ctx.fillStyle = '#6a1f4a'; ctx.fillRect(x + 20, -6, w - 40, 6); ctx.fillStyle = '#c9a24a'; ctx.fillRect(x + 18, -44, 4, 44); ctx.fillRect(x + w - 22, -44, 4, 44); ctx.fillRect(x + 18, -42, w - 36, 3); }
    if (v.kind === 'scrap') { ctx.fillStyle = '#5a5e68'; ctx.fillRect(x + 20, -30, 60, 30); ctx.fillStyle = '#6a6e78'; ctx.fillRect(x + 30, -46, 40, 16); ctx.fillStyle = '#3a3d44'; ctx.fillRect(x + 100, -24, 40, 24); }
    Lights.add(x + w * .4, -gh * .5, 170, LC.warm, .6); Lights.caster(x + w * .4, 14, 150, .5);
  }
  ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = v.neon; ctx.shadowBlur = zoom > .5 ? 12 : 0; ctx.fillStyle = v.neon; ctx.fillText(v.name, x + w / 2, -gh + 20); ctx.shadowBlur = 0;
  Lights.add(x + w / 2, -gh + 20, 120, v.neon === '#33e9ff' ? LC.neonCyan : v.neon === '#ff4fb8' ? LC.neonPink : LC.sign, .5);
  // your car parked out front of home
  if (G && G.car && v.kind === 'clothes') {}
}
function venuePrompt(G, v) {
  const p = G.player;
  switch (v.kind) {
    case 'clothes': return ['Browse THREADS', () => Shop.show('THREADS', Object.keys(OUTFITS).filter(k => k !== 'worn').map(k => ({ name: OUTFITS[k].name, price: OUTFITS[k].price, sub: 'look +' + OUTFITS[k].look, disabled: G.outfit === k ? 'Already wearing it.' : null, id: k })), it => { Econ.wear(G, it.id); UI.say('Wearing: ' + it.name, 2.2); p.setEmote('handsHips', 1.8); })];
    case 'jewelry': return ['Browse GOLD & CO', () => Shop.show('GOLD & CO', JEWELRY.map(j => ({ name: j.name, price: j.price, sub: 'look +' + j.look, disabled: G.jewelry.includes(j.id) ? 'You own this.' : null, id: j.id })), it => { G.jewelry.push(it.id); Econ.recalcLook(G); UI.say(it.name + '. Nice.', 2); })];
    case 'barber': return [G.groomed > 0 ? 'Fresh cut already' : 'Haircut & shave ($15)', () => { if (G.groomed > 0) return; if (G.cash < 15) { UI.say('$15. You have $' + G.cash, 1.8); return; } G.cash -= 15; G.groomed = 3; p.spec.facial = 'none'; Econ.recalcLook(G); UI.say('Clean. Look +10 for a few nights.', 2.4); }];
    case 'cars': return ['Look at cars', () => Shop.show('AUTO MILE', CARS.map(c => ({ name: c.name, price: c.price, sub: 'look +' + c.look + ' · free rides', disabled: G.car === c.id ? 'That is your car.' : null, id: c.id })), it => { G.car = it.id; Econ.recalcLook(G); UI.say('Keys in hand. Cabs are free now.', 3); p.setEmote('cheer', 2); })];
    case 'deli': return ['Buy food ($8)', () => { if (G.cash < 8) { UI.say('$8. You have $' + G.cash, 1.8); return; } G.cash -= 8; G.energy = Math.min(100, G.energy + 45); G.food++; UI.say('Ate. Energy up. One for the fridge.', 2.2); }];
    case 'factory': return [G.shiftDone ? 'Shift already worked tonight' : 'Clock in (shift)', () => { if (G.shiftDone) return; if (G.energy < 20) { UI.say('Too tired to work. Eat or sleep.', 2); return; } G.go('factory', 'street'); }];
    case 'scrap': return [G.bottles > 0 ? `Sell ${G.bottles} bottles` : 'Nothing to sell', () => { if (!G.bottles) return; const v2 = G.bottles * 2; G.cash += v2; UI.say('+$' + v2 + ' for the bottles.', 2); G.bottles = 0; }];
    case 'dice': return ['Play dice', () => Shop.show('STREET DICE', [10, 25, 60, 150].map(b => ({ name: 'Bet $' + b, price: b, sub: 'roll higher than the house', keepOpen: true, id: b })), it => { const you = 2 + Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6), house = 2 + Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6); if (you > house) { G.cash += it.id * 2; UI.say(`You ${you}, house ${house}. +$${it.id}`, 2.2); p.setEmote('cheer', 1.6); } else { UI.say(`You ${you}, house ${house}. Lost $${it.id}`, 2.2); p.setEmote('facepalm', 1.6); } })];
    case 'club': return [G.look < 40 ? 'Bouncer: "Not tonight."' : 'Into VELVET ($30)', () => { if (G.look < 40) { p.setEmote('headDown', 1.8); UI.say('He looks you up and down. No.', 2.4); return; } if (G.cash < 30) { UI.say('$30 cover.', 1.6); return; } G.cash -= 30; G.energy = Math.min(100, G.energy + 10); const tip = 20 + Math.floor(Math.random() * 60) * (G.look > 70 ? 2 : 1); G.cash += tip; G.clock += 2.5; UI.say(`A good night. Someone bought your drinks and you left with $${tip}.`, 3.5); p.setEmote('cheer', 2); }];
  }
  return null;
}

// ---------- the factory: a shift is a rhythm task ----------
const FactoryScene = {
  name: 'factory', where: 'Continental Packing', noZoom: true, t: 0, round: 0, hits: 0, cursor: 0, dir: 1, zone: .5, done: false, flash: 0,
  enter(G) { this.t = 0; this.round = 0; this.hits = 0; this.cursor = 0; this.dir = 1; this.zone = .5; this.done = false; this.flash = 0; Camera.locked = true; const p = G.player; p.x = 0; p.y = 0; p.posture = 'pushCart'; UI.setHint('Hit E / PACK when the marker is in the yellow. Ten boxes.', 4); G.setPrompt('PACK', () => this.pack(G)); },
  pack(G) { if (this.done) return; const p = G.player, ok = Math.abs(this.cursor - this.zone) < .09; if (ok) { this.hits++; p.setEmote('point', .4, 'happy'); } else p.setEmote('facepalm', .5); this.flash = ok ? .3 : -.3; this.round++; this.zone = .2 + hash2(this.round, 7) * .6; if (this.round >= 10) { this.done = true; this.t = 0; G.setPrompt(null); } },
  update(G, dt) {
    const p = G.player; this.t += dt; if (this.flash > 0) this.flash -= dt;
    if (this.done) { if (this.t > 1.8) { const pay = Math.round(WAGE * (.6 + .4 * this.hits / 10)); G.cash += pay; G.shiftDone = true; G.energy = Math.max(0, G.energy - 35); G.clock += 6; UI.say(`Shift over. $${pay} for ${this.hits}/10 clean packs.`, 4); p.posture = 'idle'; G.go('street', 'factory'); } p.update(dt); return; }
    const spd = .9 + this.round * .12; this.cursor += this.dir * spd * dt; if (this.cursor > 1) { this.cursor = 1; this.dir = -1; } if (this.cursor < 0) { this.cursor = 0; this.dir = 1; }
    p.update(dt);
  },
  draw(G, ctx, cam) {
    const W = cam.w, H = cam.h; ctx.fillStyle = '#1a1c22'; ctx.fillRect(0, 0, W, H);
    Tex.paint(ctx, 'concrete', 5, '#2a2c34', 0, 0, W, H * .7); Tex.paint(ctx, 'concrete', 6, '#22242a', 0, H * .7, W, H * .3);
    // conveyor
    const cy = H * .62; ctx.fillStyle = '#3a3d44'; ctx.fillRect(0, cy - 30, W, 40); ctx.fillStyle = '#1a1c22'; for (let x = ((this.t * 120) % 40); x < W; x += 40) ctx.fillRect(x, cy - 28, 20, 36);
    for (let i = 0; i < 6; i++) { const bx = ((i * 180 + this.t * 120) % (W + 180)) - 90; ctx.fillStyle = '#8a6a44'; ctx.fillRect(bx, cy - 74, 70, 46); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(bx, cy - 74, 70, 6); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(bx + 32, cy - 68, 4, 40); }
    // machines + lights
    for (let i = 0; i < 4; i++) { const mx = 80 + i * (W - 160) / 3; ctx.fillStyle = '#2a2c34'; ctx.fillRect(mx - 40, cy - 240, 80, 150); ctx.fillStyle = Math.floor(this.t * 3 + i) % 2 ? '#3fdc6a' : '#1a3a24'; ctx.fillRect(mx - 10, cy - 230, 20, 8); ctx.fillStyle = '#5a5e68'; ctx.fillRect(mx - 30, cy - 200, 60, 90); }
    ctx.fillStyle = 'rgba(255,230,180,.06)'; for (let i = 0; i < 3; i++) ctx.fillRect(W * (.2 + i * .3) - 100, 0, 200, cy);
    // the guy at the line
    ctx.save(); ctx.translate(W * .5, cy + 4); ctx.scale(2.2, 2.2); inkW(2.2); G.player.draw(ctx, 2.2); ctx.restore();
    // timing bar
    const bw = Math.min(W - 60, 520), bx = W / 2 - bw / 2, by = H * .16;
    shadowCut(ctx, '#0a0a12', bx, by, bw, 34, 6); cut(ctx, '#ffd36a', bx + this.zone * bw - .09 * bw, by + 4, .18 * bw, 26, 4);
    cut(ctx, this.flash > 0 ? '#7dff7a' : this.flash < 0 ? '#ff5a4a' : '#f2ecdf', bx + this.cursor * bw - 4, by - 4, 8, 42, 3);
    ctx.fillStyle = '#f2ecdf'; ctx.font = `bold 14px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(this.done ? 'Clocking out…' : `Box ${Math.min(10, this.round + 1)} / 10   ·   ${this.hits} clean`, W / 2, by + 56);
  },
};
