// ===== scenes =====
// Each scene owns a coordinate space with the floor at y=0. Interiors are side-view rooms.
const ROOM_DEPTH = 26;
const cut = (ctx, col, x, y, w, h, r) => { ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x, y, w, h, r || 0); ctx.fill(); };
const shadowCut = (ctx, col, x, y, w, h, r) => { cut(ctx, 'rgba(0,0,0,.35)', x + 4, y + 5, w, h, r); cut(ctx, col, x, y, w, h, r); };
const glow = (ctx, x, y, r, col, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col.replace('A', a || .35)); g.addColorStop(1, col.replace('A', 0)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
const WARM = 'rgba(255,225,160,A)';
const WARM_L = '255,225,160';

function roomBase(ctx, w, wall, floor, trim, opt) {
  opt = opt || {};
  const seed = opt.seed || (w * 31 + wall.length * 7);
  Tex.paint(ctx, opt.wallTex || 'plaster', seed, wall, -200, -FLOOR_H * 2.4, w + 400, FLOOR_H * 2.4);
  cut(ctx, shade(wall, .82), -200, -FLOOR_H * 2.4, w + 400, FLOOR_H * .6);
  Tex.paint(ctx, opt.floorTex || 'wood', seed + 5, floor, -200, 0, w + 400, ROOM_DEPTH + 8);
  // scuffs along the bottom of the wall and grime in the corners
  Tex.streaks(ctx, -200, -FLOOR_H * 1.1, w + 400, FLOOR_H * .5, seed, .07);
  const g = ctx.createLinearGradient(0, -80, 0, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.18)'); ctx.fillStyle = g; ctx.fillRect(-200, -80, w + 400, 80);
  cut(ctx, trim || shade(wall, .7), -200, -10, w + 400, 10);
  cut(ctx, '#05060c', -200, ROOM_DEPTH + 8, w + 400, 4000);
}

// ---------- STREET ----------
const StreetScene = {
  name: 'street', where: 'Street',
  enter(G, from) {
    const p = G.player; p.y = GROUND + 20;
    if (from === 'lobby') { G.setStreet(City.home()); p.x = TOWER.x + TOWER.w / 2; p.facing = 1; }
    if (from === 'airport') { G.setStreet(City.home()); p.x = G.city.taxiX; p.facing = -1; }
    if (!G.city) G.setStreet(City.home());
    Camera.follow = p; Camera.locked = false; if (!G.introDone) Camera.snapTo(p.x, p.y - 60, 2.4); else { Camera.snapTo(p.x, p.y - 100, 1); Camera.setStop(1); }
  },
  update(G, dt) {
    const p = G.player, c = G.city; this.where = c.alley && p.x > c.alley.x && p.x < c.alley.x + c.alley.w ? 'Alley' : c.name;
    G.movePlayer(dt, c.x0 - 300, c.x1 + 300, GROUND + 4, GROUND + WALK_DEPTH);
    const b = Camera.bounds(); c.crowd.update(dt, p, b); if (c.isHome) G.cartMan.update(dt);
    for (const cn of c.coins) if (!cn.got && Math.abs(cn.x - p.x) < 18 && Math.abs(cn.y - p.y) < 20) { cn.got = true; G.cash += cn.v; UI.say('+$' + cn.v, 1.2); }
    const door = TOWER.x + TOWER.w / 2, it = c.inters.find(k => Math.abs(k.x - p.x) < 44);
    if (c.isHome && Math.abs(p.x - door) < 60) G.setPrompt('Enter lobby', () => G.go('lobby', 'street'));
    else if (c.taxiX !== null && Math.abs(p.x - c.taxiX) < 70) G.setPrompt(`Taxi to airport ($${TAXI_FARE})`, () => { if (G.cash >= TAXI_FARE) { G.cash -= TAXI_FARE; G.go('airport', 'street'); } else UI.say('Need $' + TAXI_FARE + ' for the cab.', 1.5); });
    else if (it) G.setPrompt('Cross to ' + City.name(it.cross.dir, it.cross.i), () => G.cross(it));
    else G.setPrompt(null);
  },
  draw(G, ctx, cam, pal) {
    const c = G.city;
    drawSky(ctx, pal, cam); drawBackdrop(ctx, c, cam, pal);
    cam.begin(ctx); inkW(cam.zoom); const b = cam.bounds();
    for (const bd of c.buildings) if (bd.x + bd.w > b.x0 && bd.x < b.x1 && -bd.h < b.y1) drawBuilding(ctx, bd, pal, cam.zoom, bd.tower);
    if (c.alley && c.alley.x + c.alley.w > b.x0 && c.alley.x < b.x1 && cam.zoom > .12) drawAlley(ctx, c, pal, cam.zoom);
    drawStreet(ctx, c, pal, cam.zoom, cam);
    if (c.isHome) { G.drawBalconyLedge(ctx, cam.zoom); G.drawRoofEdge(ctx, cam.zoom); }
    if (c.taxiX !== null && cam.zoom > .12) {
      const tx = c.taxiX; cut(ctx, '#12141f', tx - 2, -120, 4, ROAD_Y + 116); cut(ctx, '#ffe36a', tx - 26, -140, 52, 22, 3); ctx.fillStyle = '#1a1a1a'; ctx.font = `bold 11px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('TAXI', tx, -129); ctx.fillStyle = '#ffd36a'; ctx.font = `9px ${FONT}`; ctx.fillText('AIRPORT', tx, -112); glow(ctx, tx, -130, 60, 'rgba(255,227,106,A)', .25);
      cut(ctx, '#e8c22a', tx + 40, ROAD_Y + 6, 100, 30, 6); cut(ctx, '#1e2a48', tx + 62, ROAD_Y - 6, 50, 14, 4); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(tx + 62, ROAD_Y + 36, 8, 0, TAU); ctx.arc(tx + 120, ROAD_Y + 36, 8, 0, TAU); ctx.fill(); cut(ctx, '#ffe36a', tx + 78, ROAD_Y - 14, 24, 8, 2);
    }
    if (cam.zoom > .3) for (const cn of c.coins) if (!cn.got && cn.x > b.x0 && cn.x < b.x1) { ctx.fillStyle = '#ffd95a'; ctx.beginPath(); ctx.ellipse(cn.x, cn.y - 4 + Math.sin(G.clock * 200 + cn.x) * 2, 5, 6, 0, 0, TAU); ctx.fill(); glow(ctx, cn.x, cn.y - 4, 22, 'rgba(255,217,90,A)', .3); }
    const actors = c.crowd.visible(b); actors.push(G.player); if (c.isHome && G.cartMan.x > b.x0 - 100 && G.cartMan.x < b.x1 + 100) actors.push(G.cartMan);
    actors.sort((a, d) => a.y - d.y);
    if (c.isHome && cam.zoom > .12) G.drawCart(ctx, G.cartMan.x - 62, GROUND + 6, cam.zoom);
    for (const a of actors) a.draw(ctx, cam.zoom);
    c.crowd.drawBehind(ctx, pal, cam.zoom, b); c.crowd.drawFront(ctx, pal, cam.zoom, b);
    Lights.draw(ctx, cam);
    cam.end(ctx);
  },
};

// ---------- LOBBY ----------
const LobbyScene = {
  name: 'lobby', where: 'Lobby', w: 1200,
  enter(G, from) { const p = G.player; p.y = 12; p.depth = 0; if (from === 'elevator') { p.x = 1010; p.facing = -1; } else if (from === 'stairs') { p.x = 1150; p.facing = -1; } else { p.x = 90; p.facing = 1; } Camera.follow = p; Camera.locked = false; Camera.snapTo(p.x, -90, 1.6); Camera.tzoom = 1.6; },
  update(G, dt) {
    const p = G.player; G.movePlayer(dt, 30, this.w - 30, 4, ROOM_DEPTH);
    if (p.x < 110) G.setPrompt('Go outside', () => G.go('street', 'lobby'));
    else if (Math.abs(p.x - 1010) < 70) G.setPrompt('Call elevator', () => G.openElevator('lobby'));
    else if (Math.abs(p.x - 1150) < 45) G.setPrompt('Stairwell', () => G.go('stairs', 'lobby'));
    else if (Math.abs(p.x - 560) < 60) G.setPrompt('Check mail', () => { if (!G.flags.mail) { G.flags.mail = true; G.give({ name: 'Letter', col: '#e8e0c8' }); UI.say('A letter. Rent is due.', 2.5); } else UI.say('Nothing else in the box.', 1.5); });
    else G.setPrompt(null);
    G.lobbyFolk.forEach(a => a.update(dt));
  },
  draw(G, ctx, cam, pal) {
    ctx.fillStyle = '#0a0c18'; ctx.fillRect(0, 0, cam.w, cam.h);
    cam.begin(ctx); inkW(cam.zoom);
    roomBase(ctx, this.w, '#2c2a3e', '#3b3548', '#1f1d2c', { seed: 11, wallTex: 'plaster', floorTex: 'tile' });
    // marble floor pattern
    ctx.fillStyle = 'rgba(255,255,255,.05)'; for (let x = 0; x < this.w; x += 80) ctx.fillRect(x, 0, 40, ROOM_DEPTH + 8);
    // street door with night outside
    cut(ctx, '#0d1226', 40, -FLOOR_H * 1.1, 70, FLOOR_H * 1.1); ctx.fillStyle = '#ffe2a0'; ctx.globalAlpha = .5; for (let i = 0; i < 9; i++) ctx.fillRect(46 + hash2(i, 1) * 55, -FLOOR_H * 1.05 + hash2(i, 2) * 60, 3, 4); ctx.globalAlpha = 1; cut(ctx, '#6a5a3a', 72, -FLOOR_H * 1.1, 6, FLOOR_H * 1.1);
    // front desk
    shadowCut(ctx, '#5a3f2a', 250, -46, 200, 46, 4); cut(ctx, '#7a5a3a', 250, -50, 200, 8, 2); cut(ctx, '#ffe6a8', 300, -74, 22, 8, 2); glow(ctx, 311, -70, 60, WARM, .3);
    // mailboxes
    for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) cut(ctx, (r + c) % 2 ? '#8a7a5a' : '#9a8a6a', 500 + c * 22, -FLOOR_H * .95 + r * 22, 19, 19, 2);
    ctx.fillStyle = '#ffe6a8'; ctx.font = `bold 11px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('MAIL', 588, -FLOOR_H * .95 - 10);
    // plants, chairs
    cut(ctx, '#3a2a2a', 720, -30, 30, 30, 3); ctx.fillStyle = '#2a6a4a'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(735 + Math.cos(i * 1.3) * 16, -50 + Math.sin(i * 1.3) * 10, 18, 8, i * .7, 0, TAU); ctx.fill(); }
    shadowCut(ctx, '#6a3a4a', 800, -30, 60, 30, 6); cut(ctx, '#7a4a5a', 800, -60, 14, 32, 4);
    // elevator bank
    cut(ctx, '#7a6a48', 940, -FLOOR_H * 1.05, 140, FLOOR_H * 1.05, 2);
    cut(ctx, '#2a2c3a', 950, -FLOOR_H, 58, FLOOR_H); cut(ctx, '#2a2c3a', 1012, -FLOOR_H, 58, FLOOR_H); cut(ctx, '#b8a068', 1006, -FLOOR_H, 8, FLOOR_H);
    ctx.fillStyle = '#ff9a3a'; ctx.font = `bold 12px ${FONT}`; ctx.fillText(G.elevatorFloorLabel(), 1010, -FLOOR_H - 10);
    shadowCut(ctx, '#4a4038', 1120, -FLOOR_H * .92, 60, FLOOR_H * .92, 2); ctx.fillStyle = '#7fd48a'; ctx.font = `bold 10px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('STAIRS', 1150, -FLOOR_H * .98);
    cut(ctx, '#b8a068', 1086, -FLOOR_H * .55, 8, 14, 2); ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.arc(1090, -FLOOR_H * .5, 3, 0, TAU); ctx.fill();
    // ceiling lights
    for (let x = 120; x < this.w; x += 240) { cut(ctx, '#ffe6a8', x, -FLOOR_H * 1.75, 60, 6, 3); glow(ctx, x + 30, -FLOOR_H * 1.7, 160, WARM, .22); }
    const acts = G.lobbyFolk.concat([G.player]).sort((a, b) => a.y - b.y); for (const a of acts) a.draw(ctx, cam.zoom);
    cam.end(ctx);
  },
};

// ---------- ELEVATOR PANEL + RIDE ----------
const ElevatorScene = {
  name: 'elevator', where: 'Elevator', noZoom: true, sel: 83, mode: 'panel', t: 0, from: 83, to: 83, cur: 83, doors: 0,
  enter(G, from) { this.mode = 'panel'; this.t = 0; this.doors = 1; Camera.locked = true; this.sel = G.floor === 83 ? 0 : 83; },
  floors() { const f = [0]; for (let i = 2; i <= TOWER.floors; i++) f.push(i); f.push(99); return f; },
  label(f) { return f === 0 ? 'L' : f === 99 ? 'R' : String(f); },
  update(G, dt) {
    this.t += dt;
    if (this.mode === 'panel') {
      const list = this.floors(); let i = list.indexOf(this.sel);
      const cols = Camera.w < 700 ? 8 : 12;
      if (Input.consume('ArrowRight') || Input.consume('KeyD')) i = Math.min(list.length - 1, i + 1);
      if (Input.consume('ArrowLeft') || Input.consume('KeyA')) i = Math.max(0, i - 1);
      if (Input.consume('ArrowDown') || Input.consume('KeyS')) i = Math.min(list.length - 1, i + cols);
      if (Input.consume('ArrowUp') || Input.consume('KeyW')) i = Math.max(0, i - cols);
      this.sel = list[i];
      if (Input.consume('Space') || Input.consume('Enter') || Input.consume('KeyE')) this.pick(G, this.sel);
      if (Input.consume('Escape')) G.go(G.elevatorFrom, 'elevator');
      if (Input.tap) { const id = UI.hit(Input.tap); if (id && id.startsWith('fl:')) { this.pick(G, parseInt(id.slice(3))); Input.tap = null; } else if (id === 'esc') { G.go(G.elevatorFrom, 'elevator'); Input.tap = null; } }
    } else if (this.mode === 'ride') {
      // doors close, travel, doors open
      const dur = this.rideDur;
      if (this.t < .8) this.doors = 1 - this.t / .8;
      else if (this.t < .8 + dur) { const k = easeInOut((this.t - .8) / dur); this.cur = Math.round(lerp(this.from, this.to, k)); Camera.shake = .15; }
      else if (this.t < 1.6 + dur) { this.cur = this.to; this.doors = (this.t - .8 - dur) / .8; if (!this.dinged) { this.dinged = true; UI.say('Ding.', 1); } }
      else { G.floor = this.to; G.go(this.to === 0 ? 'lobby' : this.to === 99 ? 'roof' : 'hall', 'elevator'); }
    }
    G.player.vx = 0; G.player.update(dt);
  },
  pick(G, f) { if (f === G.floor) { UI.say('You are already here.', 1.2); return; } this.from = G.floor === 99 ? TOWER.floors + 1 : G.floor; this.to = f; this.cur = this.from; this.mode = 'ride'; this.t = 0; this.dinged = false; this.rideDur = clamp(Math.abs((f === 99 ? TOWER.floors + 1 : f) - this.from) * .045, 1.2, 4.5); },
  draw(G, ctx, cam, pal) {
    const W = cam.w, H = cam.h;
    ctx.fillStyle = '#1a1826'; ctx.fillRect(0, 0, W, H);
    // cabin
    const cw = Math.min(W - 40, 520), cx = W / 2 - cw / 2, top = 60, bot = H - 40;
    shadowCut(ctx, '#3a3348', cx, top, cw, bot - top, 6);
    cut(ctx, '#2a2436', cx + 16, top + 16, cw - 32, bot - top - 32, 4);
    // door opening (left/right leaves)
    const dw = (cw - 32) / 2 * this.doors;
    cut(ctx, '#1a1620', cx + 16, top + 16, cw - 32, bot - top - 32);
    cut(ctx, '#8a7a5a', cx + 16, top + 16, dw, bot - top - 32); cut(ctx, '#8a7a5a', cx + cw - 16 - dw, top + 16, dw, bot - top - 32);
    // floor indicator
    cut(ctx, '#0a0a12', cx + cw / 2 - 60, top + 20, 120, 34, 4); ctx.fillStyle = '#ff9a3a'; ctx.font = `bold 24px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.mode === 'ride' ? this.label(this.cur > TOWER.floors ? 99 : this.cur) : this.label(G.floor === 99 ? 99 : G.floor), cx + cw / 2, top + 37);
    if (this.mode === 'ride') { ctx.fillStyle = '#ffd36a'; ctx.font = `14px ${FONT}`; ctx.fillText(this.to > (this.cur > TOWER.floors ? 99 : this.cur) ? '▲' : '▼', cx + cw / 2 + 48, top + 37); }
    // the guy inside
    ctx.save(); ctx.translate(cx + cw / 2, bot - 60); ctx.scale(2.4, 2.4); const p = G.player; const sx = p.x, sy = p.y, sf = p.facing; p.x = 0; p.y = 0; p.facing = 1; inkW(2.4); p.draw(ctx, 2.4); p.x = sx; p.y = sy; p.facing = sf; ctx.restore();
    if (this.mode === 'panel') {
      // button panel overlay on the right wall
      const list = this.floors(), cols = W < 700 ? 8 : 12, bw = W < 700 ? 34 : 38, gap = 6;
      const pw = cols * (bw + gap) + 20, ph = Math.ceil(list.length / cols) * (bw + gap) + 60;
      const px = W / 2 - pw / 2, py = Math.max(top + 70, H / 2 - ph / 2);
      shadowCut(ctx, '#b8a068', px, py, pw, ph, 8);
      ctx.fillStyle = '#2a2436'; ctx.font = `bold 14px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('SELECT FLOOR', px + pw / 2, py + 22);
      list.forEach((f, i) => { const r = Math.floor(i / cols), c = i % cols, x = px + 10 + c * (bw + gap), y = py + 40 + r * (bw + gap); const isSel = f === this.sel, here = f === G.floor; UI.button(ctx, 'fl:' + f, x, y, bw, bw, this.label(f), true, isSel ? '#ffd36a' : here ? '#6a6a7a' : f === 83 ? '#ffe6c0' : '#ece4d0', '#1c1a24'); });
      UI.button(ctx, 'esc', px + pw / 2 - 110, py + ph - 14, 100, 30, 'Step out', true); UI.button(ctx, 'fl:83', px + pw / 2 + 10, py + ph - 14, 100, 30, 'Home · 83', true, '#ffe6c0');
    }
  },
};

// ---------- HALLWAY ----------
const HallScene = {
  name: 'hall', where: 'Hallway', w: 1500,
  enter(G, from) { const p = G.player; p.y = 12; p.depth = 0; if (from === 'apartment') { p.x = 720; p.facing = -1; } else if (from === 'stairs') { p.x = 1370; p.facing = -1; } else { p.x = 130; p.facing = 1; } this.where = 'Floor ' + G.floor; Camera.follow = p; Camera.locked = false; Camera.snapTo(p.x, -90, 1.6); Camera.tzoom = 1.6; },
  update(G, dt) {
    const p = G.player; G.movePlayer(dt, 30, this.w - 30, 4, ROOM_DEPTH);
    if (Math.abs(p.x - 100) < 60) G.setPrompt('Call elevator', () => G.openElevator('hall'));
    else if (Math.abs(p.x - 1400) < 60) G.setPrompt('Stairwell', () => G.go('stairs', 'hall'));
    else {
      const d = this.doorAt(p.x);
      if (d !== null) { const mine = G.floor === PLAYER_FLOOR && d === 2; G.setPrompt(mine ? 'Go home' : 'Try door ' + this.num(G, d), () => { if (mine) G.go('apartment', 'hall'); else { UI.say('Locked.', 1); Camera.shake = .4; } }); }
      else G.setPrompt(null);
    }
  },
  doorAt(x) { for (let i = 0; i < 6; i++) if (Math.abs(x - (280 + i * 220)) < 40) return i; return null; },
  num(G, i) { return G.floor + '0' + (i + 1); },
  draw(G, ctx, cam, pal) {
    ctx.fillStyle = '#0a0c18'; ctx.fillRect(0, 0, cam.w, cam.h);
    cam.begin(ctx); inkW(cam.zoom);
    roomBase(ctx, this.w, '#3e3a52', '#5a2f3a', '#2a2438', { seed: 23 + G.floor, wallTex: 'plaster', floorTex: 'tile' });
    ctx.fillStyle = 'rgba(0,0,0,.15)'; for (let x = 0; x < this.w; x += 60) ctx.fillRect(x, 0, 30, ROOM_DEPTH + 8);
    cut(ctx, '#2a2c3a', 60, -FLOOR_H, 48, FLOOR_H); cut(ctx, '#2a2c3a', 112, -FLOOR_H, 48, FLOOR_H); cut(ctx, '#b8a068', 108, -FLOOR_H, 6, FLOOR_H);
    ctx.fillStyle = '#ff9a3a'; ctx.font = `bold 12px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(G.elevatorFloorLabel(), 110, -FLOOR_H - 10);
    for (let i = 0; i < 6; i++) { const x = 280 + i * 220, mine = G.floor === PLAYER_FLOOR && i === 2; shadowCut(ctx, mine ? '#7a4a2a' : '#4a3a3a', x - 30, -FLOOR_H * .92, 60, FLOOR_H * .92, 2); cut(ctx, '#d8c070', x + 18, -FLOOR_H * .45, 5, 5, 2); cut(ctx, '#e8e0c8', x - 14, -FLOOR_H * .8, 28, 12, 2); ctx.fillStyle = '#1c1a24'; ctx.font = `bold 9px ${FONT}`; ctx.fillText(this.num(G, i), x, -FLOOR_H * .8 + 6); if (i % 2 === 0) { cut(ctx, '#ffe6a8', x + 100, -FLOOR_H * 1.1, 14, 18, 3); glow(ctx, x + 107, -FLOOR_H * 1.05, 90, WARM, .18); } }
    // stairwell door at the end
    shadowCut(ctx, '#4a4038', this.w - 130, -FLOOR_H * .92, 64, FLOOR_H * .92, 2); cut(ctx, '#d8c070', this.w - 76, -FLOOR_H * .45, 5, 5, 2); cut(ctx, '#20232a', this.w - 140, -FLOOR_H * 1.05, 84, 20, 2); ctx.fillStyle = '#7fd48a'; ctx.font = `bold 11px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('STAIRS', this.w - 98, -FLOOR_H * 1.05 + 10);
    // window
    cut(ctx, '#0d1226', this.w - 300, -FLOOR_H * 1.2, 90, FLOOR_H * 1.0); ctx.fillStyle = '#ffe2a0'; ctx.globalAlpha = .5; for (let i = 0; i < 14; i++) ctx.fillRect(this.w - 295 + hash2(i, 4) * 80, -FLOOR_H * 1.15 + hash2(i, 5) * 80, 3, 4); ctx.globalAlpha = 1;
    G.player.draw(ctx, cam.zoom);
    cam.end(ctx);
  },
};

// ---------- APARTMENT ----------
const ApartmentScene = {
  name: 'apartment', where: 'Home · 8304', w: 1500, bed: 210,
  enter(G, from) {
    const p = G.player; p.y = 12; p.depth = 0;
    if (from === 'balcony') { p.x = 1420; p.facing = -1; }
    else if (from === 'wake') { p.x = this.bed; p.facing = 1; }
    else { p.x = 90; p.facing = 1; }
    Camera.follow = p; Camera.locked = false; Camera.snapTo(p.x, -90, 1.6); Camera.tzoom = 1.6;
  },
  update(G, dt) {
    const p = G.player; G.movePlayer(dt, 30, this.w - 30, 4, ROOM_DEPTH);
    const near = (x, r) => Math.abs(p.x - x) < (r || 50);
    if (p.x < 100) G.setPrompt('Leave', () => G.go('hall', 'apartment'));
    else if (p.x > 1400) G.setPrompt('Step onto balcony', () => G.go('balcony', 'apartment'));
    else if (near(this.bed, 70)) G.setPrompt(G.flags.madeBed ? 'Lie down' : 'Make the bed', () => { if (!G.flags.madeBed) { G.flags.madeBed = true; UI.say('Bed made. Small win.', 2); } else { p.setEmote('inBed', 3); UI.say('Five more minutes.', 2); } });
    else if (near(330, 40) && !G.flags.clock) G.setPrompt('Silence the alarm', () => { G.flags.clock = true; UI.say('7:12pm. You slept through the day again.', 3); });
    else if (near(470, 45) && !G.flags.phone) G.setPrompt('Take phone', () => { G.flags.phone = true; G.give({ name: 'Phone', col: '#1c1a24' }); });
    else if (near(620, 60)) G.setPrompt(G.flags.tv ? 'Turn off TV' : 'Turn on TV', () => { G.flags.tv = !G.flags.tv; });
    else if (near(880, 50)) G.setPrompt(G.flags.music ? 'Stop the record' : 'Put a record on', () => { G.flags.music = !G.flags.music; UI.say(G.flags.music ? 'Something slow.' : 'Quiet again.', 1.6); });
    else if (near(1090, 50) && !G.flags.wallet) G.setPrompt('Take wallet', () => { G.flags.wallet = true; G.cash += 40; G.give({ name: 'Keys', col: '#d8c070' }); UI.say('$40 and your keys.', 2.5); });
    else if (near(1230, 45)) G.setPrompt('Open fridge', () => { if (!G.flags.fridge) { G.flags.fridge = true; G.give({ name: 'Pizza', col: '#d9a23a' }); UI.say('Cold pizza. Still good.', 2); } else UI.say('Empty now.', 1.2); });
    else G.setPrompt(null);
  },
  draw(G, ctx, cam, pal) {
    ctx.fillStyle = '#0a0c18'; ctx.fillRect(0, 0, cam.w, cam.h);
    cam.begin(ctx); inkW(cam.zoom);
    roomBase(ctx, this.w, '#453d55', '#6a4a36', '#2f2a3a', { seed: 41, wallTex: 'plaster', floorTex: 'wood' });
    // floorboards + rug
    ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let x = 0; x < this.w; x += 46) ctx.fillRect(x, 0, 2, ROOM_DEPTH + 8);
    cut(ctx, '#6a3a4a', 560, 2, 300, ROOM_DEPTH + 4); cut(ctx, '#7a4a5a', 580, 5, 260, ROOM_DEPTH - 2);
    // front door
    cut(ctx, '#5a3a2a', 40, -FLOOR_H * .92, 56, FLOOR_H * .92, 2); cut(ctx, '#d8c070', 84, -FLOOR_H * .45, 5, 5, 2);
    cut(ctx, '#3a3448', 110, -FLOOR_H * .95, 5, 26); cut(ctx, '#d8c070', 108, -FLOOR_H * .9, 9, 5, 2);
    // ---- bedroom end: bed, headboard, nightstand, alarm clock, poster
    const B = this.bed;
    cut(ctx, '#4a3040', B - 96, -FLOOR_H * 1.0, 190, FLOOR_H * .55, 5);      // headboard
    shadowCut(ctx, '#3a3448', B - 100, -48, 210, 48, 4);                      // frame
    cut(ctx, '#e8e2d2', B - 96, -62, 200, 18, 6);                             // mattress
    cut(ctx, G.flags.madeBed ? '#4a6a8a' : '#4a6a8a', B - 46, -66, 150, 24, 8); // duvet
    if (!G.flags.madeBed) { cut(ctx, '#5a7a9a', B - 30, -72, 120, 16, 8); cut(ctx, '#41607e', B + 40, -70, 70, 18, 8); }
    cut(ctx, '#f2ece0', B - 90, -76, 58, 20, 8);                              // pillow
    shadowCut(ctx, '#5a3f2a', B + 130, -40, 56, 40, 3);                       // nightstand
    cut(ctx, G.flags.clock ? '#3a1a1a' : '#b0413e', B + 142, -52, 30, 13, 2);
    if (!G.flags.clock && Math.floor(G.clock * 400) % 2 === 0) { ctx.fillStyle = '#ff5a4a'; ctx.font = `bold 9px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('7:12', B + 157, -45); glow(ctx, B + 157, -45, 70, 'rgba(255,90,74,A)', .3); }
    cut(ctx, '#6a5a3a', B + 196, -96, 4, 96); cut(ctx, '#ffe6a8', B + 182, -116, 32, 22, 4); Lights.add(B + 198, -110, 220, WARM_L, .7); Lights.caster(B + 198, 14, 200, .6);
    cut(ctx, '#2a3a5a', B - 80, -FLOOR_H * 1.55, 90, 70, 2); ctx.fillStyle = '#d9b23a'; ctx.beginPath(); ctx.arc(B - 35, -FLOOR_H * 1.55 + 34, 18, 0, TAU); ctx.fill();
    // alarm clock + phone on a side table
    shadowCut(ctx, '#5a3f2a', 440, -34, 64, 34, 2); if (!G.flags.phone) cut(ctx, '#1c1a24', 462, -41, 13, 8, 2);
    // ---- living end: couch, TV, shelves, record player
    shadowCut(ctx, '#6a3a4a', 560, -40, 160, 40, 8); cut(ctx, '#7a4a5a', 560, -64, 160, 28, 8); cut(ctx, '#7a4a5a', 552, -52, 16, 52, 6); cut(ctx, '#7a4a5a', 712, -52, 16, 52, 6);
    cut(ctx, '#8a5a6a', 600, -70, 30, 12, 5); cut(ctx, '#5a6a8a', 660, -70, 30, 12, 5);
    shadowCut(ctx, '#2a2436', 600, -FLOOR_H * .62, 120, 66, 3); cut(ctx, G.flags.tv ? '#6ab8ff' : '#0a0c14', 606, -FLOOR_H * .62 + 6, 108, 54);
    if (G.flags.tv) { glow(ctx, 660, -FLOOR_H * .62 + 33, 200, 'rgba(120,190,255,A)', .3); ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(612 + (G.clock * 800) % 90, -FLOOR_H * .62 + 14, 32, 38); }
    shadowCut(ctx, '#4a3a2a', 840, -46, 100, 46, 2); cut(ctx, '#2a2436', 852, -54, 76, 10, 2);
    if (G.flags.music) { ctx.fillStyle = '#e8e2d2'; ctx.font = `14px ${FONT}`; ctx.textAlign = 'center'; for (let i = 0; i < 3; i++) { const ph = (G.clock * 300 + i * .33) % 1; ctx.globalAlpha = 1 - ph; ctx.fillText('♪', 890 + Math.sin(ph * 7 + i) * 14, -60 - ph * 60); } ctx.globalAlpha = 1; }
    cut(ctx, '#5a3f2a', 960, -FLOOR_H * 1.15, 8, FLOOR_H * .55); cut(ctx, '#5a3f2a', 968, -FLOOR_H * 1.15, 96, 6); cut(ctx, '#5a3f2a', 968, -FLOOR_H * .9, 96, 6);
    const bc = ['#b0413e', '#3e8a5b', '#2f6f9f', '#d9b23a', '#5a4a9f']; for (let i = 0; i < 9; i++) cut(ctx, bc[i % 5], 974 + i * 10, -FLOOR_H * 1.15 - 22 + hash2(i, 2) * 6, 8, 22 - hash2(i, 2) * 6);
    // big window between the two halves
    cut(ctx, '#0d1226', 740, -FLOOR_H * 1.5, 190, FLOOR_H * .95, 3); ctx.fillStyle = '#ffe2a0'; for (let i = 0; i < 70; i++) { ctx.globalAlpha = .3 + hash2(i, 9) * .6; ctx.fillRect(745 + hash2(i, 4) * 180, -FLOOR_H * 1.45 + hash2(i, 5) * 80, 2, 3); } ctx.globalAlpha = 1; cut(ctx, '#3a3448', 833, -FLOOR_H * 1.5, 4, FLOOR_H * .95);
    // kitchen: counter, wallet, fridge, kettle
    shadowCut(ctx, '#8a8a90', 1040, -46, 180, 46, 2); cut(ctx, '#3a3a44', 1040, -42, 180, 6);
    if (!G.flags.wallet) cut(ctx, '#5a3a2a', 1082, -54, 18, 9, 2);
    cut(ctx, '#2a2c3a', 1150, -50, 34, 22, 2); cut(ctx, '#c0c4cc', 1196, -58, 16, 16, 3);
    shadowCut(ctx, '#c8c8cc', 1210, -FLOOR_H * .95, 56, FLOOR_H * .95, 3); cut(ctx, '#6a6a70', 1216, -FLOOR_H * .6, 44, 3); cut(ctx, '#6a6a70', 1254, -FLOOR_H * .8, 3, 14); cut(ctx, '#6a6a70', 1254, -FLOOR_H * .5, 3, 14);
    cut(ctx, '#d9b23a', 1222, -FLOOR_H * .95 - 14, 20, 14, 2);
    // plant + balcony door
    cut(ctx, '#5a3a2a', 1300, -30, 30, 30, 3); ctx.fillStyle = '#2a6a4a'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(1315 + Math.cos(i * 1.3) * 18, -52 + Math.sin(i * 1.3) * 12, 20, 9, i * .7, 0, TAU); ctx.fill(); }
    cut(ctx, '#0d1226', 1400, -FLOOR_H * 1.2, 90, FLOOR_H * 1.2); ctx.fillStyle = '#ffe2a0'; ctx.globalAlpha = .45; for (let i = 0; i < 22; i++) ctx.fillRect(1405 + hash2(i, 7) * 80, -FLOOR_H * 1.15 + hash2(i, 8) * 100, 2, 3); ctx.globalAlpha = 1; cut(ctx, '#3a3448', 1443, -FLOOR_H * 1.2, 4, FLOOR_H * 1.2);
    // ceiling lamps
    for (const lx of [300, 700, 1120]) { cut(ctx, '#6a5a3a', lx + 29, -FLOOR_H * 1.9, 2, 16); cut(ctx, '#ffe6a8', lx, -FLOOR_H * 1.78, 60, 8, 4); Lights.add(lx + 30, -FLOOR_H * 1.7, 320, WARM_L, .7); Lights.caster(lx + 30, 16, 300, .7); }
    G.player.draw(ctx, cam.zoom);
    if ((G.player.pose.lie || 0) > .3) { cut(ctx, '#41607e', B - 16, -70, 170, 26, 9); cut(ctx, '#4a6a8a', B - 20, -74, 140, 24, 9); }
    Lights.draw(ctx, cam);
    cam.end(ctx);
  },
};

// ---------- STAIRWELL: 83 floors of it ----------
const StairScene = {
  name: 'stairs', where: 'Stairwell', w: 620, climbing: null,
  enter(G, from) { const p = G.player; p.x = 300; p.y = 12; p.facing = 1; p.depth = 0; this.climbing = null; this.where = 'Stairs · floor ' + G.floor; Camera.follow = p; Camera.locked = false; Camera.snapTo(p.x, -90, 1.5); Camera.tzoom = 1.5; },
  update(G, dt) {
    const p = G.player;
    if (this.climbing) {
      const c = this.climbing; c.t += dt;
      const k = clamp(c.t / c.dur, 0, 1);
      p.x = lerp(c.x0, c.x1, k); p.y = 12; p.vx = (c.x1 - c.x0) / c.dur * .5; p.facing = sgn(c.x1 - c.x0);
      Camera.y = -90 - Math.sin(k * Math.PI) * 60;
      if (k >= 1) { G.floor = clamp(G.floor + c.dir, 0, TOWER.floors); this.where = 'Stairs · floor ' + (G.floor === 0 ? 'L' : G.floor); p.x = c.dir > 0 ? 120 : 500; this.climbing = null; G.stairFloors = (G.stairFloors || 0) + 1; if (G.stairFloors === 12) UI.setHint('This is going to take a while.', 3); if (G.stairFloors === 40) UI.setHint('Your legs are on fire.', 3); }
      p.update(dt); return;
    }
    G.movePlayer(dt, 60, this.w - 60, 4, ROOM_DEPTH);
    if (Math.abs(p.x - 300) < 60) G.setPrompt('Leave stairwell', () => G.go(G.floor === 0 ? 'lobby' : 'hall', 'stairs'));
    else if (p.x > this.w - 110 && G.floor < TOWER.floors) G.setPrompt('Up one floor', () => { this.climbing = { t: 0, dur: 2.6, x0: p.x, x1: this.w - 70, dir: 1 }; });
    else if (p.x < 110 && G.floor > 0) G.setPrompt('Down one floor', () => { this.climbing = { t: 0, dur: 2.1, x0: p.x, x1: 70, dir: -1 }; });
    else G.setPrompt(null);
  },
  draw(G, ctx, cam, pal) {
    ctx.fillStyle = '#07090f'; ctx.fillRect(0, 0, cam.w, cam.h);
    cam.begin(ctx); inkW(cam.zoom);
    roomBase(ctx, this.w, '#2f3238', '#3a3d44', '#222429', { seed: 60 + G.floor, wallTex: 'concrete', floorTex: 'concrete' });
    ctx.fillStyle = 'rgba(0,0,0,.2)'; for (let x = 0; x < this.w; x += 50) ctx.fillRect(x, 0, 25, ROOM_DEPTH + 8);
    // flights going up on the right, down on the left
    const flight = (x0, dir) => { for (let i = 0; i < 7; i++) { const x = x0 + dir * i * 22, y = -i * 18; cut(ctx, '#4a4d55', x, y - 18, 22, 18); cut(ctx, '#3a3d44', x, y - 20, 22, 3); }
      ctx.fillStyle = '#6a6e78'; for (let i = 0; i < 7; i++) ctx.fillRect(x0 + dir * i * 22 + 8, -i * 18 - 56, 3, 36); ctx.save(); ctx.beginPath(); ctx.moveTo(x0, -54); ctx.lineTo(x0 + dir * 154, -54 - 126); ctx.lineTo(x0 + dir * 154, -46 - 126); ctx.lineTo(x0, -46); ctx.fill(); ctx.restore(); };
    flight(this.w - 170, 1); flight(160, -1);
    // landing door and floor number stencil
    cut(ctx, '#4a4038', 268, -FLOOR_H * .92, 64, FLOOR_H * .92, 2); cut(ctx, '#d8c070', 322, -FLOOR_H * .45, 5, 5, 2);
    cut(ctx, '#20232a', 250, -FLOOR_H * 1.25, 100, 34, 2);
    ctx.fillStyle = '#c9cdd6'; ctx.font = `bold 24px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(G.floor === 0 ? 'L' : String(G.floor), 300, -FLOOR_H * 1.25 + 17);
    ctx.fillStyle = '#8a8e98'; ctx.font = `10px ${FONT}`; ctx.fillText('EXIT', 300, -FLOOR_H * .98);
    // a single caged bulb, pipes, a scrawl on the wall
    cut(ctx, '#ffe9c0', 292, -FLOOR_H * 1.7, 18, 10, 4); glow(ctx, 300, -FLOOR_H * 1.66, 260, 'rgba(255,233,192,A)', .3);
    Lights.add(300, -FLOOR_H * 1.66, 320, LC.lamp, .8); Lights.caster(300, 16, 280, .8);
    ctx.fillStyle = '#5a5e66'; ctx.fillRect(40, -FLOOR_H * 1.55, this.w - 80, 5); ctx.fillRect(40, -FLOOR_H * 1.35, this.w - 80, 3);
    ctx.fillStyle = 'rgba(200,190,170,.25)'; ctx.font = `12px ${FONT}`; ctx.fillText('83 FLOORS. GOOD LUCK.', 430, -70);
    G.player.draw(ctx, cam.zoom);
    Lights.draw(ctx, cam);
    cam.end(ctx);
  },
};

// ---------- BALCONY & ROOF (live in the street world, way up) ----------
const BalconyScene = {
  name: 'balcony', where: 'Balcony · 83',
  get x0() { return TOWER.x + TOWER.w + 4; }, w: 110, y: -(PLAYER_FLOOR - 1) * FLOOR_H,
  enter(G, from) { G.setStreet(City.home()); const p = G.player; p.x = this.x0 + 30; p.y = this.y; p.facing = 1; Camera.follow = p; Camera.locked = false;
    if (!G.flags.balconyReveal) { G.flags.balconyReveal = true; Camera.snapTo(p.x, p.y - 60, 1.4);
      Camera.play([{ zoom: 1.4, dur: .8, hold: .8 }, { zoom: .11, x: TOWER.x + TOWER.w / 2 + 300, y: this.y + 2200, dur: 3.5, hold: 1.6 }, { zoom: 1.0, x: p.x, dur: 1.2, ease: easeOut }], () => { Camera.setStop(1); p.setEmote('armsUp', 2.2); UI.setHint('That is a long way down.', 3); });
    } else { Camera.snapTo(p.x, p.y - 100, 1); Camera.setStop(1); }
  },
  update(G, dt) { const p = G.player; G.movePlayer(dt, this.x0 + 12, this.x0 + this.w - 12, this.y, this.y); const b = Camera.bounds(); G.city.crowd.update(dt, p, b); if (p.x < this.x0 + 40) G.setPrompt('Go inside', () => G.go('apartment', 'balcony')); else G.setPrompt(Camera.stopIndex > 1 ? null : 'Look down', () => Camera.setStop(3)); },
  draw(G, ctx, cam, pal) { StreetScene.draw(G, ctx, cam, pal); },
};
const RoofScene = {
  name: 'roof', where: 'Roof', get x0() { return TOWER.x + 30; }, w: TOWER.w - 60, y: -TOWER.h - 6,
  enter(G, from) { G.setStreet(City.home()); const p = G.player; p.x = TOWER.x + TOWER.w / 2 - 120; p.y = this.y; p.facing = 1; Camera.follow = p; Camera.locked = false; Camera.snapTo(p.x, p.y - 100, 1); Camera.setStop(1); UI.setHint('The roof. Wind up here.', 2.5); },
  update(G, dt) { const p = G.player; G.movePlayer(dt, this.x0 + 12, this.x0 + this.w - 12, this.y, this.y); const b = Camera.bounds(); G.city.crowd.update(dt, p, b); if (Math.abs(p.x - (TOWER.x + TOWER.w / 2 - 150)) < 50) G.setPrompt('Take elevator', () => G.openElevator('roof')); else G.setPrompt(null); },
  draw(G, ctx, cam, pal) { StreetScene.draw(G, ctx, cam, pal); },
};
const SCENES = { stairs: StairScene, street: StreetScene, lobby: LobbyScene, elevator: ElevatorScene, hall: HallScene, apartment: ApartmentScene, balcony: BalconyScene, roof: RoofScene };
