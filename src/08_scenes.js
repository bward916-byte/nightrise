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
    if (from === 'airport') { G.setStreet(City.home()); p.x = G.car ? TOWER.x - 150 : G.city.taxiX; p.facing = -1; }
    if (from === 'factory') { G.setStreet(City.get('ew', 3)); p.x = 3050 + 85; p.facing = -1; }
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
    else if (c.taxiX !== null && Math.abs(p.x - c.taxiX) < 70) G.setPrompt(G.car ? 'Drive to airport' : `Taxi to airport ($${TAXI_FARE})`, () => { if (G.car) G.go('airport', 'street'); else if (G.cash >= TAXI_FARE) { G.cash -= TAXI_FARE; G.go('airport', 'street'); } else UI.say('Need $' + TAXI_FARE + ' for the cab.', 1.5); });
    else if (it) G.setPrompt('Cross to ' + City.name(it.cross.dir, it.cross.i), () => G.cross(it));
    else {
      const v = venuesFor(c).find(q => p.x > q.x - 10 && p.x < q.x + q.w + 10), pr = v ? venuePrompt(G, v) : null;
      if (pr) G.setPrompt(pr[0], pr[1]);
      else {
        // hustle: bottles to collect on the industrial street, wallets to lift in a crowd
        const bt = c.bottleSpots && c.bottleSpots.find(b => !b.got && Math.abs(b.x - p.x) < 20);
        const mark = !bt && G.look < 70 && c.crowd.npcs.find(a => !a.hidden && a.spec.arch === 'business' && Math.abs(a.x - p.x) < 22 && Math.abs(a.y - p.y) < 14 && a.facing === p.facing);
        if (bt) G.setPrompt('Pick up bottles', () => { bt.got = true; G.bottles += 3; UI.say('+3 bottles', 1.2); });
        else if (mark) G.setPrompt('Lift his wallet', () => { const risk = .3 + G.heat * .3; if (Math.random() < risk) { const fine = Math.min(G.cash, 60 + Math.floor(G.cash * .25)); G.cash -= fine; G.heat = 1; p.setEmote('armsUp', 2.2); UI.say(`Caught. A cop took $${fine} and your name.`, 3.5); } else { const take = 20 + Math.floor(Math.random() * 70); G.cash += take; G.heat = Math.min(1, G.heat + .35); mark.setEmote('think', 2); p.setEmote('pockets', 1.5); UI.say(`+$${take}. Walk away normally.`, 2.5); } });
        else G.setPrompt(null);
      }
    }
  },
  draw(G, ctx, cam, pal) {
    const c = G.city;
    drawSky(ctx, pal, cam); drawBackdrop(ctx, c, cam, pal);
    cam.begin(ctx); inkW(cam.zoom); const b = cam.bounds();
    for (const bd of c.buildings) if (bd.x + bd.w > b.x0 && bd.x < b.x1 && -bd.h < b.y1) drawBuilding(ctx, bd, pal, cam.zoom, bd.tower);
    if (c.alley && c.alley.x + c.alley.w > b.x0 && c.alley.x < b.x1 && cam.zoom > .12) drawAlley(ctx, c, pal, cam.zoom);
    drawStreet(ctx, c, pal, cam.zoom, cam);
    if (c.isHome) { G.drawBalconyLedge(ctx, cam.zoom); G.drawRoofEdge(ctx, cam.zoom); }
    if (cam.zoom > .12) for (const v of venuesFor(c)) if (v.x + v.w > b.x0 && v.x < b.x1) drawVenue(ctx, v, cam.zoom, G);
    if (c.bottleSpots && cam.zoom > .3) for (const bt of c.bottleSpots) if (!bt.got && bt.x > b.x0 && bt.x < b.x1) { ctx.fillStyle = '#5a8a6a'; ctx.fillRect(bt.x - 3, bt.y - 12, 5, 12); ctx.fillRect(bt.x + 5, bt.y - 10, 5, 10); ctx.fillStyle = '#8a6a44'; ctx.fillRect(bt.x - 6, bt.y - 2, 18, 3); }
    if (c.isHome && G.car && cam.zoom > .12) { const cr = CARS.find(k => k.id === G.car), pc = { x: TOWER.x - 150, col: cr.col, kind: 'sedan' }; drawParkedCar(ctx, pc); ctx.fillStyle = '#ffe6a8'; ctx.font = `bold 9px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('YOURS', pc.x, ROAD_Y + ROAD_H * .3 - 44); }
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
  enter(G, from) { this.mode = 'panel'; this.t = 0; this.doors = 1; Camera.locked = true; this.sel = G.floor === PLAYER_FLOOR ? 0 : PLAYER_FLOOR; if (this.sel === -1) this.sel = 0; },
  // only the floors you have business on: lobby, home, roof, plus anything unlocked later
  floors() { const f = [0, PLAYER_FLOOR]; for (const x of (typeof Game !== 'undefined' && Game.unlockedFloors) || []) if (!f.includes(x)) f.push(x); f.sort((a, b) => a - b); f.push(99); return f; },
  labelFor(f) { return f === 0 ? 'Lobby' : f === 99 ? 'Roof' : f === PLAYER_FLOOR ? 'Home · 83' : 'Floor ' + f; },
  label(f) { return f === 0 ? 'L' : f === 99 ? 'R' : String(f); },
  update(G, dt) {
    this.t += dt;
    if (this.mode === 'panel') {
      const list = this.floors(); let i = list.indexOf(this.sel);
      if (Input.consume('ArrowRight') || Input.consume('KeyD')) i = Math.min(list.length - 1, i + 1);
      if (Input.consume('ArrowLeft') || Input.consume('KeyA')) i = Math.max(0, i - 1);
      if (Input.consume('ArrowDown') || Input.consume('KeyS')) i = Math.min(list.length - 1, i + 1);
      if (Input.consume('ArrowUp') || Input.consume('KeyW')) i = Math.max(0, i - 1);
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
      // brass panel: one big button per reachable floor
      const list = this.floors(), bh = 46, gap = 8, pw = Math.min(W - 40, 300), ph = list.length * (bh + gap) + 70, px = W / 2 - pw / 2, py = Math.max(top + 70, H / 2 - ph / 2);
      shadowCut(ctx, '#b8a068', px, py, pw, ph, 8);
      ctx.fillStyle = '#2a2436'; ctx.font = `bold 14px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('SELECT FLOOR', px + pw / 2, py + 22);
      list.forEach((f, i) => { const y = py + 40 + i * (bh + gap), isSel = f === this.sel, here = f === G.floor; UI.button(ctx, 'fl:' + f, px + 14, y, pw - 28, bh, this.labelFor(f) + (here ? '  ·  you are here' : ''), false, isSel ? '#ffd36a' : here ? '#8a8a96' : '#ece4d0', '#1c1a24'); });
      UI.button(ctx, 'esc', px + pw / 2 - 50, py + ph - 24, 100, 30, 'Step out', true);
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
// furniture helpers: two-tone shapes with a lit top edge and a shadow foot, at human scale (player ≈ 57px)
const box = (ctx, col, x, y, w, h, r, lit) => { cut(ctx, 'rgba(0,0,0,.35)', x + 3, y + 4, w, h, r); cut(ctx, col, x, y, w, h, r); cut(ctx, shade(col, lit || 1.18), x, y, w, Math.max(2, h * .12), r); cut(ctx, shade(col, .78), x, y + h - Math.max(2, h * .1), w, Math.max(2, h * .1), r); };
const plant = (ctx, x, y, size, potCol) => { // pot at (x,y) bottom-centre; upright stems with leaves
  const s = size || 1; cut(ctx, 'rgba(0,0,0,.3)', x - 8 * s + 2, y - 12 * s + 3, 16 * s, 12 * s, 2); cut(ctx, potCol || '#7a4a3a', x - 8 * s, y - 12 * s, 16 * s, 12 * s, 2); cut(ctx, shade(potCol || '#7a4a3a', 1.15), x - 9 * s, y - 13 * s, 18 * s, 3 * s, 1);
  ctx.strokeStyle = '#2a5a3a'; ctx.lineWidth = 1.5 * s; ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * .28, L = (18 + (i % 3) * 7) * s; ctx.beginPath(); ctx.moveTo(x, y - 12 * s); ctx.quadraticCurveTo(x + Math.cos(a) * L * .5, y - 12 * s + Math.sin(a) * L * .6, x + Math.cos(a) * L, y - 12 * s + Math.sin(a) * L); ctx.stroke();
    ctx.fillStyle = i % 2 ? '#2f7a4a' : '#3a8a55'; ctx.save(); ctx.translate(x + Math.cos(a) * L, y - 12 * s + Math.sin(a) * L); ctx.rotate(a + Math.PI / 2); ctx.beginPath(); ctx.ellipse(0, -3 * s, 3.2 * s, 7 * s, 0, 0, TAU); ctx.fill(); ctx.restore(); }
};
const ApartmentScene = {
  name: 'apartment', where: 'Home · 8304', w: 1180, bed: 150,
  enter(G, from) {
    const p = G.player; p.y = 12; p.depth = 0;
    if (from === 'balcony') { p.x = 1100; p.facing = -1; }
    else if (from === 'wake') { p.x = this.bed; p.facing = 1; }
    else { p.x = 90; p.facing = 1; }
    Camera.follow = p; Camera.locked = false; Camera.snapTo(p.x, -80, 1.7); Camera.tzoom = 1.7;
  },
  update(G, dt) {
    const p = G.player; G.movePlayer(dt, 30, this.w - 30, 4, ROOM_DEPTH);
    const near = (x, r) => Math.abs(p.x - x) < (r || 40);
    if (p.x < 95) G.setPrompt('Leave', () => G.go('hall', 'apartment'));
    else if (p.x > 1090) G.setPrompt('Step onto balcony', () => G.go('balcony', 'apartment'));
    else if (near(this.bed + 30, 46)) G.setPrompt(G.flags.madeBed ? (G.energy < 60 ? 'Sleep' : 'Lie down') : 'Make the bed', () => { if (!G.flags.madeBed) { G.flags.madeBed = true; G.look = Math.min(100, (G.look || 0) + 1); UI.say('Bed made. Small win.', 2); } else { p.setEmote('inBed', 3); if (G.energy < 60) { G.energy = 100; G.clock += 4; UI.say('Slept a few hours.', 2); } else UI.say('Five more minutes.', 2); } });
    else if (near(232, 26) && !G.flags.clock) G.setPrompt('Silence the alarm', () => { G.flags.clock = true; UI.say('7:12pm. You slept through the day again.', 3); });
    else if (near(300, 30)) G.setPrompt('Check the mirror', () => { UI.say(G.lookText(), 2.6); p.setEmote('think', 1.6); });
    else if (near(370, 30) && !G.flags.phone) G.setPrompt('Take phone', () => { G.flags.phone = true; G.give({ name: 'Phone', col: '#1c1a24' }); });
    else if (near(560, 40)) G.setPrompt(G.flags.tv ? 'Turn off TV' : 'Turn on TV', () => { G.flags.tv = !G.flags.tv; });
    else if (near(745, 34)) G.setPrompt(G.flags.music ? 'Stop the record' : 'Put a record on', () => { G.flags.music = !G.flags.music; UI.say(G.flags.music ? 'Something slow.' : 'Quiet again.', 1.6); });
    else if (near(972, 34) && !G.flags.wallet) G.setPrompt('Take wallet', () => { G.flags.wallet = true; G.cash += 40; G.give({ name: 'Keys', col: '#d8c070' }); UI.say('$40 and your keys.', 2.5); });
    else if (near(1042, 30)) G.setPrompt('Open fridge', () => { if (!G.flags.fridge) { G.flags.fridge = true; G.give({ name: 'Pizza', col: '#d9a23a' }); UI.say('Cold pizza. Still good.', 2); } else if (G.food > 0) { G.food--; G.energy = Math.min(100, G.energy + 30); UI.say('Ate something from the fridge.', 1.6); } else UI.say('Empty. Buy food.', 1.4); });
    else G.setPrompt(null);
  },
  draw(G, ctx, cam, pal) {
    ctx.fillStyle = '#0a0c18'; ctx.fillRect(0, 0, cam.w, cam.h);
    cam.begin(ctx); inkW(cam.zoom);
    roomBase(ctx, this.w, '#4a4258', '#6a4a36', '#2f2a3a', { seed: 41, wallTex: 'plaster', floorTex: 'wood' });
    cut(ctx, '#5a5268', -200, -FLOOR_H * 1.8 - 2, this.w + 400, 5); cut(ctx, '#2a2434', -200, -12, this.w + 400, 4);
    const B = this.bed;
    // ---- bedroom: darker wall paint, rug, bed, nightstand, dresser, wardrobe, window
    Tex.paint(ctx, 'plaster', 43, '#3e4a62', -200, -FLOOR_H * 1.8, 600, FLOOR_H * 1.8);
    cut(ctx, '#2f2a3a', 398, -FLOOR_H * 1.8, 4, FLOOR_H * 1.8);
    cut(ctx, '#5a3a4a', B - 60, 3, 200, ROOM_DEPTH + 2); cut(ctx, '#6a4a5a', B - 54, 6, 188, ROOM_DEPTH - 4); ctx.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 6; i++) ctx.fillRect(B - 54 + i * 32, 6, 14, ROOM_DEPTH - 4);
    // window with curtains
    cut(ctx, '#0d1226', B + 20, -FLOOR_H * 1.55, 84, 64, 2); ctx.fillStyle = '#ffe2a0'; for (let i = 0; i < 26; i++) { ctx.globalAlpha = .3 + hash2(i, 9) * .6; ctx.fillRect(B + 24 + hash2(i, 4) * 76, -FLOOR_H * 1.5 + hash2(i, 5) * 54, 2, 3); } ctx.globalAlpha = 1;
    cut(ctx, '#3a3448', B + 60, -FLOOR_H * 1.55, 3, 64); cut(ctx, '#3a3448', B + 20, -FLOOR_H * 1.55 + 30, 84, 3);
    cut(ctx, '#6a3a4a', B + 8, -FLOOR_H * 1.6, 20, 78, 2); cut(ctx, '#6a3a4a', B + 96, -FLOOR_H * 1.6, 20, 78, 2); cut(ctx, '#8a5a3a', B + 4, -FLOOR_H * 1.62, 116, 4, 2);
    // bed — 2m long, headboard against the wall
    box(ctx, '#5a3a2a', B - 42, -50, 76, 50, 3);                                   // headboard panel
    cut(ctx, '#6a4a3a', B - 38, -46, 68, 24, 2); cut(ctx, 'rgba(0,0,0,.2)', B - 6, -46, 2, 24);
    box(ctx, '#4a3020', B - 34, -18, 74, 18, 2);                                   // frame
    cut(ctx, '#e8e2d2', B - 32, -26, 70, 10, 3);                                   // mattress
    cut(ctx, G.flags.madeBed ? '#4a6a8a' : '#4a6a8a', B - 4, -30, 44, 12, 4);      // duvet
    cut(ctx, shade('#4a6a8a', 1.15), B - 4, -30, 44, 3, 3);
    if (!G.flags.madeBed) { cut(ctx, '#5a7a9a', B + 4, -33, 30, 8, 4); cut(ctx, '#41607e', B + 20, -31, 22, 9, 4); }
    cut(ctx, '#f4efe4', B - 30, -32, 22, 8, 4); cut(ctx, '#e8e2d2', B - 30, -26, 22, 3, 2);   // pillow
    cut(ctx, 'rgba(0,0,0,.25)', B - 34, -1, 74, 3);
    // nightstand + alarm clock + lamp
    box(ctx, '#5a3f2a', B + 50, -26, 22, 26, 2); cut(ctx, '#3a2a1a', B + 53, -18, 16, 2); cut(ctx, '#d8c070', B + 60, -13, 3, 3);
    cut(ctx, G.flags.clock ? '#2a1a1a' : '#8a2a2a', B + 54, -34, 14, 7, 1);
    if (!G.flags.clock && Math.floor(G.clock * 400) % 2 === 0) { ctx.fillStyle = '#ff5a4a'; ctx.font = `bold 5px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('7:12', B + 61, -30.5); Lights.add(B + 61, -30, 60, '255,90,74', .5); }
    cut(ctx, '#6a5a3a', B + 80, -FLOOR_H * .95, 3, FLOOR_H * .95); cut(ctx, '#3a3040', B + 74, -4, 15, 4, 2); cut(ctx, '#ffe6a8', B + 69, -FLOOR_H * 1.08, 25, 14, 4); Lights.add(B + 81, -FLOOR_H * 1.0, 200, WARM_L, .7); Lights.caster(B + 81, 14, 180, .6);
    // mirror + dresser
    box(ctx, '#5a3f2a', 268, -34, 66, 34, 2); for (let i = 0; i < 3; i++) { cut(ctx, '#4a3020', 274 + i * 21, -28, 18, 22, 1); cut(ctx, '#d8c070', 282 + i * 21, -18, 3, 3); }
    cut(ctx, '#3a3448', 282, -FLOOR_H * .95, 38, 50, 3); cut(ctx, '#7a90a8', 285, -FLOOR_H * .95 + 3, 32, 44, 2); cut(ctx, 'rgba(255,255,255,.15)', 288, -FLOOR_H * .95 + 6, 8, 38, 2);
    // wardrobe
    box(ctx, '#4a3020', 340, -FLOOR_H * 1.15, 52, FLOOR_H * 1.15, 2); cut(ctx, '#3a2418', 365, -FLOOR_H * 1.15 + 4, 2, FLOOR_H * 1.15 - 8); cut(ctx, '#d8c070', 360, -FLOOR_H * .55, 3, 6); cut(ctx, '#d8c070', 369, -FLOOR_H * .55, 3, 6);
    // pictures + a poster on the bedroom wall, a small shelf with a plant and a clock
    cut(ctx, '#2a2436', B - 42, -FLOOR_H * 1.45, 26, 20, 1); cut(ctx, '#3a5a8a', B - 39, -FLOOR_H * 1.45 + 3, 20, 14); ctx.fillStyle = '#e8e2d2'; ctx.beginPath(); ctx.arc(B - 29, -FLOOR_H * 1.45 + 10, 4, 0, TAU); ctx.fill(); ctx.fillStyle = '#2a4a3a'; ctx.beginPath(); ctx.moveTo(B - 39, -FLOOR_H * 1.45 + 17); ctx.lineTo(B - 30, -FLOOR_H * 1.45 + 8); ctx.lineTo(B - 19, -FLOOR_H * 1.45 + 17); ctx.fill();
    cut(ctx, '#2a2436', B - 12, -FLOOR_H * 1.4, 18, 14, 1); cut(ctx, '#8a5a3a', B - 9, -FLOOR_H * 1.4 + 3, 12, 8);
    cut(ctx, '#1a1c2a', 60, -FLOOR_H * 1.55, 40, 54, 1); cut(ctx, '#c0392b', 64, -FLOOR_H * 1.55 + 4, 32, 46); ctx.fillStyle = '#f2d98a'; ctx.font = `bold 9px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('LIVE', 80, -FLOOR_H * 1.55 + 20); ctx.fillText('JAZZ', 80, -FLOOR_H * 1.55 + 32);
    cut(ctx, '#5a3f2a', 112, -FLOOR_H * 1.2, 44, 3); plant(ctx, 122, -FLOOR_H * 1.2, .28, '#5a3a2a'); cut(ctx, '#e8e2d2', 134, -FLOOR_H * 1.2 - 12, 12, 12, 6); ctx.strokeStyle = '#1c1a24'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(140, -FLOOR_H * 1.2 - 6); ctx.lineTo(140, -FLOOR_H * 1.2 - 10); ctx.moveTo(140, -FLOOR_H * 1.2 - 6); ctx.lineTo(143, -FLOOR_H * 1.2 - 5); ctx.stroke();
    // ceiling light with a shade
    cut(ctx, '#6a5a3a', 185, -FLOOR_H * 2.05, 2, 12); ctx.fillStyle = '#d9c9a8'; ctx.beginPath(); ctx.moveTo(172, -FLOOR_H * 1.93); ctx.lineTo(200, -FLOOR_H * 1.93); ctx.lineTo(194, -FLOOR_H * 1.85); ctx.lineTo(178, -FLOOR_H * 1.85); ctx.fill(); Lights.add(186, -FLOOR_H * 1.8, 260, WARM_L, .55); Lights.caster(186, 16, 240, .5);
    // laundry pile in the corner
    ctx.fillStyle = '#5a5a72'; ctx.beginPath(); ctx.ellipse(410, -4, 16, 6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#7a4a3a'; ctx.beginPath(); ctx.ellipse(414, -9, 11, 5, .3, 0, TAU); ctx.fill(); ctx.fillStyle = '#e8e2d2'; ctx.beginPath(); ctx.ellipse(406, -12, 8, 4, -.2, 0, TAU); ctx.fill();
    // side table with the phone
    box(ctx, '#5a3f2a', 358, -22, 28, 22, 2); if (!G.flags.phone) cut(ctx, '#1c1a24', 368, -26, 8, 5, 1);
    // ---- living room: wainscot, art, couch with cushions and a throw, coffee table, TV wall, bookcase, record corner
    cut(ctx, '#3f3850', 402, -52, 388, 44); cut(ctx, '#332c42', 402, -54, 388, 3); cut(ctx, '#2a2434', 402, -12, 388, 4);
    ctx.fillStyle = 'rgba(255,255,255,.035)'; for (let x = 410; x < 790; x += 30) ctx.fillRect(x, -48, 22, 36);
    cut(ctx, '#3a2a30', 460, 3, 280, ROOM_DEPTH + 2); cut(ctx, '#4a3a40', 466, 6, 268, ROOM_DEPTH - 4); ctx.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 8; i++) ctx.fillRect(470 + i * 34, 6, 12, ROOM_DEPTH - 4);
    // couch
    cut(ctx, 'rgba(0,0,0,.3)', 468, -24, 100, 28, 6);
    cut(ctx, '#5a2f3f', 464, -40, 104, 40, 7); cut(ctx, '#6a3a4a', 470, -38, 92, 12, 5); cut(ctx, '#6f3f50', 470, -26, 44, 20, 5); cut(ctx, '#6f3f50', 516, -26, 46, 20, 5);
    cut(ctx, '#5a2f3f', 460, -42, 12, 42, 5); cut(ctx, '#5a2f3f', 560, -42, 12, 42, 5); cut(ctx, '#4a2530', 468, -4, 96, 4);
    cut(ctx, '#c9a24a', 480, -46, 18, 12, 4); cut(ctx, '#3a6a7a', 536, -46, 18, 12, 4); cut(ctx, '#e8dcc0', 500, -30, 30, 8, 3);
    // coffee table with a book, mug, remote
    cut(ctx, 'rgba(0,0,0,.3)', 594, -10, 52, 12, 2); box(ctx, '#5a3f2a', 590, -14, 52, 4, 1); cut(ctx, '#4a3020', 594, -10, 3, 10); cut(ctx, '#4a3020', 635, -10, 3, 10);
    cut(ctx, '#e8e2d2', 598, -18, 14, 4, 1); cut(ctx, '#b0413e', 600, -19, 10, 2, 1); cut(ctx, '#f2ecdf', 618, -20, 6, 6, 1); cut(ctx, '#1c1a24', 628, -16, 9, 2, 1);
    // TV wall: floating unit, TV, soundbar
    cut(ctx, 'rgba(0,0,0,.3)', 522, -FLOOR_H * .5 + 4, 80, 10, 1); box(ctx, '#2f2838', 518, -FLOOR_H * .5, 84, 10, 1);
    cut(ctx, 'rgba(0,0,0,.35)', 530, -FLOOR_H * .5 - 46, 62, 42, 2); box(ctx, '#1a1820', 527, -FLOOR_H * .5 - 50, 66, 44, 2); cut(ctx, G.flags.tv ? '#6ab8ff' : '#0a0c14', 530, -FLOOR_H * .5 - 47, 60, 36);
    if (G.flags.tv) { Lights.add(560, -FLOOR_H * .5 - 28, 220, '120,190,255', .7); ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(533 + (G.clock * 800) % 48, -FLOOR_H * .5 - 42, 12, 26); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(530, -FLOOR_H * .5 - 47, 60, 8); }
    cut(ctx, '#2a2436', 534, -FLOOR_H * .5 - 6, 52, 5, 2);
    // art above the couch
    cut(ctx, 'rgba(0,0,0,.3)', 468, -FLOOR_H * 1.35 + 3, 46, 34, 1); cut(ctx, '#e8e2d2', 466, -FLOOR_H * 1.35, 46, 34, 1); cut(ctx, '#2f6f9f', 470, -FLOOR_H * 1.35 + 4, 38, 26); cut(ctx, '#e8a060', 474, -FLOOR_H * 1.35 + 20, 30, 6); ctx.fillStyle = '#fff2c0'; ctx.beginPath(); ctx.arc(496, -FLOOR_H * 1.35 + 12, 5, 0, TAU); ctx.fill();
    cut(ctx, 'rgba(0,0,0,.3)', 520, -FLOOR_H * 1.3 + 3, 30, 22, 1); cut(ctx, '#1c1a24', 518, -FLOOR_H * 1.3, 30, 22, 1); cut(ctx, '#8a5a3a', 522, -FLOOR_H * 1.3 + 4, 22, 14);
    // bookcase
    box(ctx, '#4a3020', 636, -FLOOR_H * 1.45, 70, FLOOR_H * 1.45, 2);
    for (let r = 0; r < 4; r++) { const sy = -FLOOR_H * 1.45 + 8 + r * 28; cut(ctx, '#3a2418', 640, sy + 22, 62, 3); if (r === 1) { plant(ctx, 690, sy + 22, .45, '#8a6a4a'); cut(ctx, '#2a2436', 644, sy + 8, 22, 14, 1); } else { const bc2 = ['#b0413e', '#3e8a5b', '#2f6f9f', '#d9b23a', '#5a4a9f', '#e8e2d2', '#c9a24a']; let bx2 = 643; for (let i = 0; i < 8 && bx2 < 698; i++) { const bw2 = 4 + hash2(r, i) * 4, bh2 = 14 + hash2(i, r) * 7; cut(ctx, bc2[(i + r) % 7], bx2, sy + 22 - bh2, bw2, bh2); bx2 += bw2 + 1; } } }
    // record corner: cabinet, turntable, a sleeve leaning, floor lamp
    box(ctx, '#4a3a2a', 720, -24, 50, 24, 2); cut(ctx, '#3a2a1a', 722, -12, 46, 2); cut(ctx, '#2a2436', 726, -29, 38, 5, 1); cut(ctx, '#1c1a24', 738, -31, 14, 2, 1); cut(ctx, '#c9a24a', 744, -33, 3, 2);
    cut(ctx, '#e8e2d2', 772, -22, 16, 22, 1); cut(ctx, '#b0413e', 774, -18, 12, 12);
    if (G.flags.music) { ctx.fillStyle = '#e8e2d2'; ctx.font = `9px ${FONT}`; ctx.textAlign = 'center'; for (let i = 0; i < 3; i++) { const ph = (G.clock * 300 + i * .33) % 1; ctx.globalAlpha = 1 - ph; ctx.fillText('♪', 745 + Math.sin(ph * 7 + i) * 8, -38 - ph * 40); } ctx.globalAlpha = 1; }
    cut(ctx, '#6a5a3a', 806, -FLOOR_H * 1.0, 3, FLOOR_H * 1.0); cut(ctx, '#3a3040', 800, -4, 15, 4, 2); ctx.fillStyle = '#d9c9a8'; ctx.beginPath(); ctx.moveTo(793, -FLOOR_H * 1.0); ctx.lineTo(822, -FLOOR_H * 1.0); ctx.lineTo(818, -FLOOR_H * 1.15); ctx.lineTo(797, -FLOOR_H * 1.15); ctx.fill(); Lights.add(807, -FLOOR_H * 1.05, 220, WARM_L, .7); Lights.caster(807, 14, 200, .6);
    // living room window with curtains
    cut(ctx, '#0d1226', 586, -FLOOR_H * 1.78, 130, 74, 2); ctx.fillStyle = '#ffe2a0'; for (let i = 0; i < 46; i++) { ctx.globalAlpha = .3 + hash2(i, 9) * .6; ctx.fillRect(590 + hash2(i, 4) * 122, -FLOOR_H * 1.73 + hash2(i, 5) * 64, 2, 3); } ctx.globalAlpha = 1; cut(ctx, '#3a3448', 649, -FLOOR_H * 1.78, 3, 74); cut(ctx, '#3a3448', 586, -FLOOR_H * 1.78 + 36, 130, 3);
    cut(ctx, '#3a4a5a', 574, -FLOOR_H * 1.82, 22, 84, 2); cut(ctx, '#3a4a5a', 706, -FLOOR_H * 1.82, 22, 84, 2); cut(ctx, '#6a6a74', 570, -FLOOR_H * 1.84, 162, 4, 2);
    // ---- kitchen: tiled splashback, cabinets with handles, counter with sink and hob, breakfast bar with stools, pendants
    Tex.paint(ctx, 'tile', 47, '#3a4448', 826, -FLOOR_H * .95, 226, FLOOR_H * .95 - 30);
    for (let i = 0; i < 5; i++) { box(ctx, '#5a4a3a', 830 + i * 40, -FLOOR_H * 1.35, 36, 40, 1); cut(ctx, '#c9a24a', 846 + i * 40, -FLOOR_H * 1.35 + 30, 4, 2); }
    cut(ctx, '#ffe6a8', 838, -FLOOR_H * .93, 190, 2); Lights.add(930, -FLOOR_H * .9, 160, WARM_L, .35);
    cut(ctx, 'rgba(0,0,0,.3)', 834, -30, 190, 32, 1); box(ctx, '#8a8a90', 830, -34, 190, 34, 1); cut(ctx, '#3a3a44', 830, -36, 190, 4);
    for (let i = 0; i < 5; i++) { cut(ctx, '#6a6a72', 834 + i * 38, -28, 34, 24, 1); cut(ctx, '#c0c4cc', 848 + i * 38, -18, 6, 2); }
    cut(ctx, '#5a6a72', 842, -39, 30, 3, 1); cut(ctx, '#c0c4cc', 856, -50, 2, 12); cut(ctx, '#c0c4cc', 856, -50, 9, 2);
    cut(ctx, '#1c1c24', 900, -38, 36, 3); for (let i = 0; i < 2; i++) cut(ctx, '#2a2a30', 906 + i * 15, -37, 10, 2);
    if (!G.flags.wallet) cut(ctx, '#5a3a2a', 968, -40, 12, 5, 1);
    box(ctx, '#2a2c3a', 984, -46, 24, 12, 1); cut(ctx, '#3a4a5a', 987, -44, 18, 8, 1); cut(ctx, '#c0c4cc', 946, -46, 14, 10, 3); cut(ctx, '#c0c4cc', 951, -50, 4, 4, 1);
    box(ctx, '#d0d0d4', 1024, -FLOOR_H * 1.05, 36, FLOOR_H * 1.05, 3); cut(ctx, '#8a8a90', 1024, -FLOOR_H * .65, 36, 2); cut(ctx, '#6a6a70', 1054, -FLOOR_H * .9, 2, 10); cut(ctx, '#6a6a70', 1054, -FLOOR_H * .55, 2, 10);
    // pendants over the counter
    for (const px2 of [870, 940, 1000]) { cut(ctx, '#3a3040', px2 - 1, -FLOOR_H * 2.05, 2, 34); ctx.fillStyle = '#c9a24a'; ctx.beginPath(); ctx.moveTo(px2 - 10, -FLOOR_H * 2.05 + 34); ctx.lineTo(px2 + 10, -FLOOR_H * 2.05 + 34); ctx.lineTo(px2 + 6, -FLOOR_H * 2.05 + 44); ctx.lineTo(px2 - 6, -FLOOR_H * 2.05 + 44); ctx.fill(); cut(ctx, '#ffe6a8', px2 - 3, -FLOOR_H * 2.05 + 42, 6, 3, 1); Lights.add(px2, -FLOOR_H * 1.9, 170, WARM_L, .5); Lights.caster(px2, 14, 150, .4); }
    // breakfast stools
    for (const sx of [852, 900]) { cut(ctx, '#3a3040', sx - 1, -22, 2, 22); cut(ctx, '#3a3040', sx - 8, -1, 16, 2); cut(ctx, '#8a4a5a', sx - 9, -26, 18, 5, 2); }
    // coat hook and doormat by the door
    cut(ctx, '#2a2434', 106, 2, 40, ROOM_DEPTH + 4, 2); cut(ctx, '#3a3448', 110, 5, 32, ROOM_DEPTH - 2, 2);
    cut(ctx, '#5a3f2a', 108, -FLOOR_H * 1.2, 30, 3); for (let i = 0; i < 3; i++) cut(ctx, '#c9a24a', 112 + i * 10, -FLOOR_H * 1.2 + 3, 2, 5); cut(ctx, '#3e8a5b', 118, -FLOOR_H * 1.2 + 6, 12, 28, 3); cut(ctx, '#2a2436', 130, -FLOOR_H * 1.2 + 7, 8, 22, 2);
    cut(ctx, '#0d1226', 1070, -FLOOR_H * 1.15, 90, FLOOR_H * 1.15); ctx.fillStyle = '#ffe2a0'; ctx.globalAlpha = .45; for (let i = 0; i < 22; i++) ctx.fillRect(1075 + hash2(i, 7) * 80, -FLOOR_H * 1.1 + hash2(i, 8) * 100, 2, 3); ctx.globalAlpha = 1; cut(ctx, '#3a3448', 1113, -FLOOR_H * 1.15, 4, FLOOR_H * 1.15); cut(ctx, '#3a3448', 1070, -FLOOR_H * 1.15, 90, 3);
    plant(ctx, 1044, 0, 1.4, '#5a3a2a');
    // front door
    box(ctx, '#5a3a2a', 40, -FLOOR_H * .92, 44, FLOOR_H * .92, 2); cut(ctx, '#d8c070', 76, -FLOOR_H * .45, 4, 4, 2); cut(ctx, '#3a3448', 96, -FLOOR_H * .95, 4, 20); cut(ctx, '#d8c070', 94, -FLOOR_H * .9, 8, 4, 2);
    // ceiling lamps
    for (const lx of [560, 880]) { cut(ctx, '#6a5a3a', lx + 19, -FLOOR_H * 1.95, 2, 14); cut(ctx, '#ffe6a8', lx, -FLOOR_H * 1.82, 40, 6, 3); Lights.add(lx + 20, -FLOOR_H * 1.75, 300, WARM_L, .65); Lights.caster(lx + 20, 16, 280, .6); }
    G.player.draw(ctx, cam.zoom);
    if ((G.player.pose.lie || 0) > .3) { cut(ctx, '#41607e', B - 8, -31, 50, 11, 5); cut(ctx, '#4a6a8a', B - 6, -33, 46, 9, 5); }
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
