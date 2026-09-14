// ===== scenes =====
// Each scene owns a coordinate space with the floor at y=0. Interiors are side-view rooms.
const ROOM_DEPTH = 26;
const cut = (ctx, col, x, y, w, h, r) => { ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x, y, w, h, r || 0); ctx.fill(); };
const shadowCut = (ctx, col, x, y, w, h, r) => { cut(ctx, 'rgba(0,0,0,.35)', x + 4, y + 5, w, h, r); cut(ctx, col, x, y, w, h, r); };
const glow = (ctx, x, y, r, col, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col.replace('A', a || .35)); g.addColorStop(1, col.replace('A', 0)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
const WARM = 'rgba(255,225,160,A)';

function roomBase(ctx, w, wall, floor, trim) {
  cut(ctx, wall, -200, -FLOOR_H * 2.4, w + 400, FLOOR_H * 2.4);
  cut(ctx, shade(wall, .8), -200, -FLOOR_H * 2.4, w + 400, FLOOR_H * .6);
  cut(ctx, floor, -200, 0, w + 400, ROOM_DEPTH + 8);
  cut(ctx, trim || shade(wall, .7), -200, -10, w + 400, 10);
  cut(ctx, '#05060c', -200, ROOM_DEPTH + 8, w + 400, 4000);
}

// ---------- STREET ----------
const StreetScene = {
  name: 'street', where: 'Street',
  enter(G, from) {
    const p = G.player; p.y = GROUND + 20;
    if (from === 'lobby') { p.x = TOWER.x + TOWER.w / 2; p.facing = 1; }
    Camera.follow = p; Camera.locked = false; if (!G.introDone) Camera.snapTo(p.x, p.y - 60, 2.4); else { Camera.snapTo(p.x, p.y - 100, 1); Camera.setStop(1); }
  },
  update(G, dt) {
    const p = G.player; this.where = p.x > G.city.alley.x && p.x < G.city.alley.x + G.city.alley.w ? 'Alley' : 'Street';
    G.movePlayer(dt, G.city.x0 - 300, G.city.x1 + 300, GROUND + 4, GROUND + WALK_DEPTH);
    const b = Camera.bounds(); G.crowd.update(dt, p, b); G.cartMan.update(dt);
    // pickups: coins on the sidewalk
    for (const c of G.coins) if (!c.got && Math.abs(c.x - p.x) < 18 && Math.abs(c.y - p.y) < 20) { c.got = true; G.cash += c.v; UI.say('+$' + c.v, 1.2); }
    // hotspot: tower door
    const door = TOWER.x + TOWER.w / 2;
    G.setPrompt(Math.abs(p.x - door) < 60 ? 'Enter lobby' : null, () => G.go('lobby', 'street'));
  },
  draw(G, ctx, cam, pal) {
    drawSky(ctx, pal, cam); drawBackdrop(ctx, G.city, cam, pal);
    cam.begin(ctx); inkW(cam.zoom); const b = cam.bounds();
    for (const bd of G.city.buildings) if (bd.x + bd.w > b.x0 && bd.x < b.x1 && -bd.h < b.y1) drawBuilding(ctx, bd, pal, cam.zoom, bd.tower);
    if (G.city.alley.x + G.city.alley.w > b.x0 && G.city.alley.x < b.x1 && cam.zoom > .12) drawAlley(ctx, G.city, pal, cam.zoom);
    drawStreet(ctx, G.city, pal, cam.zoom, cam);
    G.drawBalconyLedge(ctx, cam.zoom); G.drawRoofEdge(ctx, cam.zoom);
    if (cam.zoom > .3) for (const c of G.coins) if (!c.got && c.x > b.x0 && c.x < b.x1) { ctx.fillStyle = '#ffd95a'; ctx.beginPath(); ctx.ellipse(c.x, c.y - 4 + Math.sin(G.clock * 200 + c.x) * 2, 5, 6, 0, 0, TAU); ctx.fill(); glow(ctx, c.x, c.y - 4, 22, 'rgba(255,217,90,A)', .3); }
    const actors = G.crowd.visible(b); actors.push(G.player); if (G.cartMan.x > b.x0 - 100 && G.cartMan.x < b.x1 + 100) actors.push(G.cartMan);
    actors.sort((a, c) => a.y - c.y);
    if (cam.zoom > .12) G.drawCart(ctx, G.cartMan.x - 62, GROUND + 6, cam.zoom);
    for (const a of actors) a.draw(ctx, cam.zoom);
    G.crowd.drawBehind(ctx, pal, cam.zoom, b); G.crowd.drawFront(ctx, pal, cam.zoom, b);
    cam.end(ctx);
  },
};

// ---------- LOBBY ----------
const LobbyScene = {
  name: 'lobby', where: 'Lobby', w: 1200,
  enter(G, from) { const p = G.player; p.y = 12; if (from === 'elevator') { p.x = 1010; p.facing = -1; } else { p.x = 90; p.facing = 1; } Camera.follow = p; Camera.locked = false; Camera.snapTo(p.x, -90, 1.6); Camera.tzoom = 1.6; },
  update(G, dt) {
    const p = G.player; G.movePlayer(dt, 30, this.w - 30, 4, ROOM_DEPTH);
    if (p.x < 110) G.setPrompt('Go outside', () => G.go('street', 'lobby'));
    else if (Math.abs(p.x - 1010) < 70) G.setPrompt('Call elevator', () => G.openElevator('lobby'));
    else if (Math.abs(p.x - 560) < 60) G.setPrompt('Check mail', () => { if (!G.flags.mail) { G.flags.mail = true; G.give({ name: 'Letter', col: '#e8e0c8' }); UI.say('A letter. Rent is due.', 2.5); } else UI.say('Nothing else in the box.', 1.5); });
    else G.setPrompt(null);
    G.lobbyFolk.forEach(a => a.update(dt));
  },
  draw(G, ctx, cam, pal) {
    ctx.fillStyle = '#0a0c18'; ctx.fillRect(0, 0, cam.w, cam.h);
    cam.begin(ctx); inkW(cam.zoom);
    roomBase(ctx, this.w, '#2c2a3e', '#3b3548', '#1f1d2c');
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
      UI.button(ctx, 'esc', px + pw / 2 - 50, py + ph - 14, 100, 30, 'Step out', true);
    }
  },
};

// ---------- HALLWAY ----------
const HallScene = {
  name: 'hall', where: 'Hallway', w: 1500,
  enter(G, from) { const p = G.player; p.y = 12; if (from === 'apartment') { p.x = 720; p.facing = -1; } else { p.x = 130; p.facing = 1; } this.where = 'Floor ' + G.floor; Camera.follow = p; Camera.locked = false; Camera.snapTo(p.x, -90, 1.6); Camera.tzoom = 1.6; },
  update(G, dt) {
    const p = G.player; G.movePlayer(dt, 30, this.w - 30, 4, ROOM_DEPTH);
    if (Math.abs(p.x - 100) < 60) G.setPrompt('Call elevator', () => G.openElevator('hall'));
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
    roomBase(ctx, this.w, '#3e3a52', '#5a2f3a', '#2a2438');
    ctx.fillStyle = 'rgba(0,0,0,.15)'; for (let x = 0; x < this.w; x += 60) ctx.fillRect(x, 0, 30, ROOM_DEPTH + 8);
    cut(ctx, '#2a2c3a', 60, -FLOOR_H, 48, FLOOR_H); cut(ctx, '#2a2c3a', 112, -FLOOR_H, 48, FLOOR_H); cut(ctx, '#b8a068', 108, -FLOOR_H, 6, FLOOR_H);
    ctx.fillStyle = '#ff9a3a'; ctx.font = `bold 12px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(G.elevatorFloorLabel(), 110, -FLOOR_H - 10);
    for (let i = 0; i < 6; i++) { const x = 280 + i * 220, mine = G.floor === PLAYER_FLOOR && i === 2; shadowCut(ctx, mine ? '#7a4a2a' : '#4a3a3a', x - 30, -FLOOR_H * .92, 60, FLOOR_H * .92, 2); cut(ctx, '#d8c070', x + 18, -FLOOR_H * .45, 5, 5, 2); cut(ctx, '#e8e0c8', x - 14, -FLOOR_H * .8, 28, 12, 2); ctx.fillStyle = '#1c1a24'; ctx.font = `bold 9px ${FONT}`; ctx.fillText(this.num(G, i), x, -FLOOR_H * .8 + 6); if (i % 2 === 0) { cut(ctx, '#ffe6a8', x + 100, -FLOOR_H * 1.1, 14, 18, 3); glow(ctx, x + 107, -FLOOR_H * 1.05, 90, WARM, .18); } }
    // window at the end
    cut(ctx, '#0d1226', this.w - 120, -FLOOR_H * 1.2, 90, FLOOR_H * 1.0); ctx.fillStyle = '#ffe2a0'; ctx.globalAlpha = .5; for (let i = 0; i < 14; i++) ctx.fillRect(this.w - 115 + hash2(i, 4) * 80, -FLOOR_H * 1.15 + hash2(i, 5) * 80, 3, 4); ctx.globalAlpha = 1;
    G.player.draw(ctx, cam.zoom);
    cam.end(ctx);
  },
};

// ---------- APARTMENT ----------
const ApartmentScene = {
  name: 'apartment', where: 'Home · 8304', w: 1000,
  enter(G, from) { const p = G.player; p.y = 12; if (from === 'balcony') { p.x = 920; p.facing = -1; } else { p.x = 70; p.facing = 1; } Camera.follow = p; Camera.locked = false; Camera.snapTo(p.x, -90, 1.6); Camera.tzoom = 1.6; },
  update(G, dt) {
    const p = G.player; G.movePlayer(dt, 30, this.w - 30, 4, ROOM_DEPTH);
    if (p.x < 100) G.setPrompt('Leave', () => G.go('hall', 'apartment'));
    else if (p.x > 900) G.setPrompt('Step onto balcony', () => G.go('balcony', 'apartment'));
    else if (Math.abs(p.x - 640) < 50 && !G.flags.wallet) G.setPrompt('Take wallet', () => { G.flags.wallet = true; G.cash += 40; G.give({ name: 'Keys', col: '#d8c070' }); UI.say('$40 and your keys.', 2.5); });
    else if (Math.abs(p.x - 300) < 50) G.setPrompt(G.flags.tv ? 'Turn off TV' : 'Turn on TV', () => { G.flags.tv = !G.flags.tv; });
    else if (Math.abs(p.x - 180) < 40 && !G.flags.phone) G.setPrompt('Take phone', () => { G.flags.phone = true; G.give({ name: 'Phone', col: '#1c1a24' }); });
    else if (Math.abs(p.x - 790) < 40) G.setPrompt('Open fridge', () => { if (!G.flags.fridge) { G.flags.fridge = true; G.give({ name: 'Pizza', col: '#d9a23a' }); UI.say('Cold pizza. Still good.', 2); } else UI.say('Empty now.', 1); });
    else G.setPrompt(null);
  },
  draw(G, ctx, cam, pal) {
    ctx.fillStyle = '#0a0c18'; ctx.fillRect(0, 0, cam.w, cam.h);
    cam.begin(ctx); inkW(cam.zoom);
    roomBase(ctx, this.w, '#4a4258', '#6a4a36', '#2f2a3a');
    // big window with the city below
    cut(ctx, '#0d1226', 380, -FLOOR_H * 1.35, 220, FLOOR_H * .95, 3); ctx.fillStyle = '#ffe2a0'; for (let i = 0; i < 60; i++) { ctx.globalAlpha = .3 + hash2(i, 9) * .6; ctx.fillRect(385 + hash2(i, 4) * 210, -FLOOR_H * 1.3 + hash2(i, 5) * 80 + hash2(i, 6) * 6, 2, 3); } ctx.globalAlpha = 1; cut(ctx, '#3a3448', 488, -FLOOR_H * 1.35, 4, FLOOR_H * .95);
    // door
    cut(ctx, '#5a3a2a', 40, -FLOOR_H * .92, 56, FLOOR_H * .92, 2); cut(ctx, '#d8c070', 84, -FLOOR_H * .45, 5, 5, 2);
    // side table + phone
    shadowCut(ctx, '#5a3f2a', 150, -34, 60, 34, 2); if (!G.flags.phone) cut(ctx, '#1c1a24', 172, -40, 12, 7, 2); cut(ctx, '#ffe6a8', 190, -70, 16, 12, 3); cut(ctx, '#6a5a3a', 197, -58, 3, 24); glow(ctx, 198, -64, 70, WARM, .25);
    // couch
    shadowCut(ctx, '#6a3a4a', 220, -40, 150, 40, 8); cut(ctx, '#7a4a5a', 220, -62, 150, 26, 8); cut(ctx, '#7a4a5a', 212, -50, 16, 50, 6); cut(ctx, '#7a4a5a', 362, -50, 16, 50, 6);
    // TV on stand
    shadowCut(ctx, '#3a3040', 240, -36 + 0, 0, 0); shadowCut(ctx, '#2a2436', 250, -FLOOR_H * .55, 110, 62, 3); cut(ctx, G.flags.tv ? '#6ab8ff' : '#0a0c14', 256, -FLOOR_H * .55 + 6, 98, 50); if (G.flags.tv) { glow(ctx, 305, -FLOOR_H * .55 + 30, 120, 'rgba(120,190,255,A)', .25); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(262 + (G.clock * 800) % 80, -FLOOR_H * .55 + 14, 30, 34); }
    // shelf
    cut(ctx, '#5a3f2a', 620, -FLOOR_H * 1.1, 8, FLOOR_H * .5); cut(ctx, '#5a3f2a', 628, -FLOOR_H * 1.1, 90, 6); cut(ctx, '#5a3f2a', 628, -FLOOR_H * .85, 90, 6); const bc = ['#b0413e', '#3e8a5b', '#2f6f9f', '#d9b23a', '#5a4a9f']; for (let i = 0; i < 8; i++) cut(ctx, bc[i % 5], 634 + i * 10, -FLOOR_H * 1.1 - 22 + hash2(i, 2) * 6, 8, 22 - hash2(i, 2) * 6);
    // kitchen counter + wallet + fridge
    shadowCut(ctx, '#8a8a90', 600, -44, 160, 44, 2); cut(ctx, '#3a3a44', 600, -40, 160, 6); if (!G.flags.wallet) cut(ctx, '#5a3a2a', 636, -50, 16, 8, 2); cut(ctx, '#2a2c3a', 700, -46, 30, 20, 2);
    shadowCut(ctx, '#c8c8cc', 770, -FLOOR_H * .95, 52, FLOOR_H * .95, 3); cut(ctx, '#6a6a70', 776, -FLOOR_H * .6, 40, 3); cut(ctx, '#6a6a70', 812, -FLOOR_H * .8, 3, 14); cut(ctx, '#6a6a70', 812, -FLOOR_H * .5, 3, 14);
    // balcony door (sliding glass)
    cut(ctx, '#0d1226', 900, -FLOOR_H * 1.2, 80, FLOOR_H * 1.2); ctx.fillStyle = '#ffe2a0'; ctx.globalAlpha = .45; for (let i = 0; i < 20; i++) ctx.fillRect(905 + hash2(i, 7) * 70, -FLOOR_H * 1.15 + hash2(i, 8) * 100, 2, 3); ctx.globalAlpha = 1; cut(ctx, '#3a3448', 938, -FLOOR_H * 1.2, 4, FLOOR_H * 1.2);
    // ceiling lamp
    cut(ctx, '#ffe6a8', 470, -FLOOR_H * 1.75, 60, 8, 4); cut(ctx, '#6a5a3a', 499, -FLOOR_H * 1.8, 2, 16); glow(ctx, 500, -FLOOR_H * 1.7, 200, WARM, .2);
    G.player.draw(ctx, cam.zoom);
    cam.end(ctx);
  },
};

// ---------- BALCONY & ROOF (live in the street world, way up) ----------
const BalconyScene = {
  name: 'balcony', where: 'Balcony · 83',
  x0: TOWER.x + TOWER.w + 4, w: 110, y: -(PLAYER_FLOOR - 1) * FLOOR_H,
  enter(G, from) { const p = G.player; p.x = this.x0 + 30; p.y = this.y; p.facing = 1; Camera.follow = p; Camera.locked = false;
    if (!G.flags.balconyReveal) { G.flags.balconyReveal = true; Camera.snapTo(p.x, p.y - 60, 1.4);
      Camera.play([{ zoom: 1.4, dur: .8, hold: .8 }, { zoom: .11, x: TOWER.x + TOWER.w / 2 + 300, y: this.y + 2200, dur: 3.5, hold: 1.6 }, { zoom: 1.0, x: p.x, dur: 1.2, ease: easeOut }], () => { Camera.setStop(1); p.setEmote('armsUp', 2.2); UI.setHint('That is a long way down.', 3); });
    } else { Camera.snapTo(p.x, p.y - 100, 1); Camera.setStop(1); }
  },
  update(G, dt) { const p = G.player; G.movePlayer(dt, this.x0 + 12, this.x0 + this.w - 12, this.y, this.y); const b = Camera.bounds(); G.crowd.update(dt, p, b); if (p.x < this.x0 + 40) G.setPrompt('Go inside', () => G.go('apartment', 'balcony')); else G.setPrompt(Camera.stopIndex > 1 ? null : 'Look down', () => Camera.setStop(3)); },
  draw(G, ctx, cam, pal) { StreetScene.draw(G, ctx, cam, pal); },
};
const RoofScene = {
  name: 'roof', where: 'Roof', x0: TOWER.x + 30, w: TOWER.w - 60, y: -TOWER.h - 6,
  enter(G, from) { const p = G.player; p.x = TOWER.x + TOWER.w / 2 - 120; p.y = this.y; p.facing = 1; Camera.follow = p; Camera.locked = false; Camera.snapTo(p.x, p.y - 100, 1); Camera.setStop(1); UI.setHint('The roof. Wind up here.', 2.5); },
  update(G, dt) { const p = G.player; G.movePlayer(dt, this.x0 + 12, this.x0 + this.w - 12, this.y, this.y); const b = Camera.bounds(); G.crowd.update(dt, p, b); if (Math.abs(p.x - (TOWER.x + TOWER.w / 2 - 150)) < 50) G.setPrompt('Take elevator', () => G.openElevator('roof')); else G.setPrompt(null); },
  draw(G, ctx, cam, pal) { StreetScene.draw(G, ctx, cam, pal); },
};
const SCENES = { street: StreetScene, lobby: LobbyScene, elevator: ElevatorScene, hall: HallScene, apartment: ApartmentScene, balcony: BalconyScene, roof: RoofScene };
