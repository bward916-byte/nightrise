// ===== travel: airport + landmarks =====
const TAXI_FARE = 8;
const DESTS = [
  { id: 'chichen', bg: 'trees', name: 'Chichén Itzá', where: 'Yucatán', fare: 22, sky: ['#5aa7e8', '#d8ecf7'], ground: '#8fbf6a', far: '#3f7a4a', sun: { x: .7, y: .18, col: '#fff4c0' }, w: 1600 },
  { id: 'stonehenge', bg: 'hills', name: 'Stonehenge', where: 'Salisbury Plain', fare: 30, sky: ['#3a3f6a', '#e39a6a'], ground: '#5f7a4a', far: '#38434a', sun: { x: .22, y: .62, col: '#ffb070' }, fog: true, w: 1500 },
  { id: 'greatwall', bg: 'mountains', name: 'Great Wall', where: 'Badaling', fare: 38, sky: ['#7fb4e6', '#e6eef4'], ground: '#7a6a4a', far: '#4f6a5a', w: 1800, mountains: true },
  { id: 'giza', bg: 'dunes', name: 'Pyramids of Giza', where: 'Egypt', fare: 34, sky: ['#f2a25a', '#ffe0a0'], ground: '#e0b870', far: '#c99a55', sun: { x: .3, y: .5, col: '#ffcc70' }, w: 1700 },
  { id: 'eiffel', bg: 'rooftops', name: 'Eiffel Tower', where: 'Paris', fare: 28, sky: ['#0b1030', '#3a2a5a'], ground: '#3a3d52', far: '#1a1c34', night: true, w: 1500 },
  { id: 'taj', bg: 'trees', name: 'Taj Mahal', where: 'Agra', fare: 36, sky: ['#f7c8d6', '#ffe9d0'], ground: '#9fbf8a', far: '#7a9a8a', sun: { x: .5, y: .3, col: '#fff0d0' }, w: 1500 },
  { id: 'opera', bg: 'harbour', name: 'Opera House', where: 'Sydney', fare: 44, sky: ['#3f9fe0', '#c7e6f7'], ground: '#b3b0a8', far: '#2f6f9f', water: true, w: 1600 },
  { id: 'colosseum', bg: 'rooftops', name: 'Colosseum', where: 'Rome', fare: 26, sky: ['#6aa8dc', '#f3d9a8'], ground: '#a89a78', far: '#6a5a4a', sun: { x: .8, y: .4, col: '#ffe8b0' }, w: 1500 },
  { id: 'fuji', bg: 'none', name: 'Mount Fuji', where: 'Hakone', fare: 40, sky: ['#7fb8e8', '#f3e4e8'], ground: '#6f9a5a', far: '#5a7a9a', w: 1500 },
  { id: 'machu', bg: 'mountains', name: 'Machu Picchu', where: 'Andes', fare: 42, sky: ['#6aa4d8', '#dfe9e2'], ground: '#5f8a4a', far: '#3f6a4a', w: 1700, mist: true },
];
const destById = id => DESTS.find(d => d.id === id);

// ---------- AIRPORT ----------
const AirportScene = {
  name: 'airport', where: 'Airport', w: 1500, board: false, sel: 0,
  enter(G, from) { const p = G.player; p.y = 12; if (from === 'flight') { p.x = 1300; p.facing = -1; UI.setHint('Home. Sort of.', 2); } else { p.x = 90; p.facing = 1; } this.board = false; Camera.follow = p; Camera.locked = false; Camera.snapTo(p.x, -90, 1.5); Camera.tzoom = 1.5; G.crowdAir.forEach(a => a.update(0)); },
  update(G, dt) {
    const p = G.player;
    if (this.board) {
      G.player.vx = 0;
      if (Input.consume('ArrowDown') || Input.consume('KeyS')) this.sel = Math.min(DESTS.length - 1, this.sel + 1);
      if (Input.consume('ArrowUp') || Input.consume('KeyW')) this.sel = Math.max(0, this.sel - 1);
      if (Input.consume('Enter') || Input.consume('Space') || Input.consume('KeyE')) this.fly(G, DESTS[this.sel]);
      if (Input.consume('Escape')) this.board = false;
      if (Input.tap) { const id = UI.hit(Input.tap); if (id && id.startsWith('dest:')) { this.fly(G, destById(id.slice(5))); Input.tap = null; } else if (id === 'esc') { this.board = false; Input.tap = null; } }
      return;
    }
    G.movePlayer(dt, 30, this.w - 30, 4, ROOM_DEPTH);
    if (p.x < 110) G.setPrompt(`Taxi to city ($${TAXI_FARE})`, () => { if (G.cash >= TAXI_FARE) { G.cash -= TAXI_FARE; G.go('street', 'airport'); } else UI.say('Not enough cash.', 1.5); });
    else if (Math.abs(p.x - 640) < 80) G.setPrompt('Check departures', () => { this.board = true; });
    else if (Math.abs(p.x - 1060) < 50 && !G.flags.airCoin) G.setPrompt('Pick up dropped bill', () => { G.flags.airCoin = true; G.cash += 20; UI.say('+$20. Nobody looked.', 2); });
    else G.setPrompt(null);
    for (const a of G.crowdAir) { if (a.wander) { a.vx = a.dir * a.spec.walkSpeed * .7; a.x += a.vx * dt; if (a.x > this.w - 80 || a.x < 200) a.dir *= -1; } a.update(dt); }
  },
  fly(G, d) {
    if (G.cash < d.fare) { UI.say(`Fare is $${d.fare}. You have $${G.cash}.`, 2); return; }
    G.cash -= d.fare; this.board = false; G.flight = { dest: d, back: false }; G.go('flight', 'airport');
  },
  draw(G, ctx, cam, pal) {
    ctx.fillStyle = '#0a0c18'; ctx.fillRect(0, 0, cam.w, cam.h);
    cam.begin(ctx); inkW(cam.zoom);
    roomBase(ctx, this.w, '#2a3448', '#d8d4c8', '#1e2636');
    ctx.fillStyle = 'rgba(0,0,0,.06)'; for (let x = 0; x < this.w; x += 60) ctx.fillRect(x, 0, 30, ROOM_DEPTH + 8);
    // glass wall with runway lights
    cut(ctx, '#0d1226', 200, -FLOOR_H * 2.1, this.w - 400, FLOOR_H * 1.1); ctx.fillStyle = '#4a6a9a'; for (let i = 0; i < 8; i++) cut(ctx, '#3a4a6a', 200 + i * (this.w - 400) / 8, -FLOOR_H * 2.1, 3, FLOOR_H * 1.1);
    for (let i = 0; i < 30; i++) { ctx.fillStyle = i % 3 ? '#4fa3ff' : '#ffd36a'; ctx.fillRect(220 + i * (this.w - 440) / 30, -FLOOR_H * 1.15, 3, 3); }
    // a plane at the gate
    ctx.fillStyle = '#d8dce6'; ctx.beginPath(); ctx.ellipse(1150, -FLOOR_H * 1.55, 170, 22, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#b8bcc8'; ctx.beginPath(); ctx.moveTo(1000, -FLOOR_H * 1.55); ctx.lineTo(950, -FLOOR_H * 1.95); ctx.lineTo(985, -FLOOR_H * 1.95); ctx.lineTo(1030, -FLOOR_H * 1.6); ctx.fill(); ctx.fillStyle = '#2f6f9f'; ctx.fillRect(1010, -FLOOR_H * 1.63, 260, 5); ctx.fillStyle = '#1e2a48'; for (let i = 0; i < 12; i++) ctx.fillRect(1050 + i * 18, -FLOOR_H * 1.6, 7, 7);
    // taxi door
    cut(ctx, '#0d1226', 40, -FLOOR_H * 1.1, 70, FLOOR_H * 1.1); cut(ctx, '#ffe36a', 50, -FLOOR_H * .9, 50, 22, 2); ctx.fillStyle = '#1a1a1a'; ctx.font = `bold 10px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('TAXI', 75, -FLOOR_H * .9 + 11);
    // check-in desks
    for (let i = 0; i < 3; i++) { shadowCut(ctx, '#3a5a8a', 260 + i * 120, -46, 90, 46, 4); cut(ctx, '#ffe6a8', 290 + i * 120, -FLOOR_H * .95, 30, 12, 2); }
    // departures board
    shadowCut(ctx, '#0a0a12', 520, -FLOOR_H * 1.02, 240, 100, 4); ctx.fillStyle = '#ffd36a'; ctx.font = `bold 12px ${FONT}`; ctx.fillText('DEPARTURES', 640, -FLOOR_H * 1.02 + 14);
    ctx.font = `9px ${FONT}`; ctx.fillStyle = '#ffb347'; ctx.textAlign = 'left'; DESTS.slice(0, 6).forEach((d, i) => { ctx.fillText(d.name.toUpperCase(), 532, -FLOOR_H * 1.02 + 32 + i * 11); ctx.fillText('ON TIME', 700, -FLOOR_H * 1.02 + 32 + i * 11); });
    // seats, bin, bill
    for (let i = 0; i < 6; i++) { shadowCut(ctx, '#3a3a4a', 860 + i * 34, -30, 30, 30, 4); cut(ctx, '#2f6f9f', 860 + i * 34, -52, 30, 24, 4); }
    if (!G.flags.airCoin) cut(ctx, '#7fbf7a', 1055, -4, 14, 6, 1);
    cut(ctx, '#b8a068', 1230, -FLOOR_H * 1.05, 120, FLOOR_H * 1.05, 2); cut(ctx, '#2a2c3a', 1240, -FLOOR_H, 100, FLOOR_H); ctx.fillStyle = '#ffd36a'; ctx.textAlign = 'center'; ctx.font = `bold 12px ${FONT}`; ctx.fillText('GATE 7', 1290, -FLOOR_H - 10);
    for (let x = 150; x < this.w; x += 260) { cut(ctx, '#e8f0ff', x, -FLOOR_H * 2.3, 80, 6, 3); glow(ctx, x + 40, -FLOOR_H * 2.25, 200, 'rgba(220,235,255,A)', .16); }
    const acts = G.crowdAir.concat([G.player]).sort((a, b) => a.y - b.y); for (const a of acts) a.draw(ctx, cam.zoom);
    cam.end(ctx);
    if (this.board) this.drawBoard(G, ctx, cam);
  },
  drawBoard(G, ctx, cam) {
    const W = cam.w, H = cam.h, rows = DESTS.length, rh = Math.min(40, (H - 160) / rows), pw = Math.min(W - 30, 460), ph = rows * rh + 90, px = W / 2 - pw / 2, py = H / 2 - ph / 2;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, W, H);
    shadowCut(ctx, '#0e1020', px, py, pw, ph, 8); ctx.fillStyle = '#ffd36a'; ctx.font = `bold 16px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('DEPARTURES  ·  $' + G.cash, px + pw / 2, py + 24);
    DESTS.forEach((d, i) => { const y = py + 46 + i * rh, sel = i === this.sel, can = G.cash >= d.fare, been = G.stamps.includes(d.id); UI.button(ctx, 'dest:' + d.id, px + 12, y, pw - 24, rh - 6, '', true, sel ? '#ffd36a' : '#1c2236', '#fff'); ctx.fillStyle = sel ? '#1c1a24' : can ? '#ffe6a8' : '#7a7a8a'; ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText(d.name + (been ? '  ✓' : ''), px + 26, y + (rh - 6) / 2); ctx.font = `12px ${FONT}`; ctx.fillText(d.where, px + pw * .5, y + (rh - 6) / 2); ctx.textAlign = 'right'; ctx.fillText('$' + d.fare, px + pw - 26, y + (rh - 6) / 2); });
    UI.button(ctx, 'esc', px + pw / 2 - 50, py + ph - 36, 100, 28, 'Close', true);
  },
};

// ---------- FLIGHT (cinematic) ----------
const FlightScene = {
  name: 'flight', where: 'In flight', noZoom: true, t: 0, dur: 5,
  enter(G) { this.t = 0; Camera.locked = true; },
  update(G, dt) { this.t += dt; G.player.vx = 0; G.player.update(dt); if (this.t > this.dur) { const f = G.flight; if (f.back) G.go('airport', 'flight'); else G.go('landmark', 'flight'); } },
  draw(G, ctx, cam) {
    const W = cam.w, H = cam.h, k = this.t / this.dur, d = G.flight.dest, back = G.flight.back;
    const from = back ? d.sky : ['#0b1030', '#2a2a48'], to = back ? ['#0b1030', '#2a2a48'] : d.sky;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, mix(from[0], to[0], k)); g.addColorStop(1, mix(from[1], to[1], k)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // clouds
    ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 9; i++) { const cx = ((hash2(i, 2) * W * 1.6 - this.t * (120 + hash2(i, 3) * 160)) % (W * 1.6) + W * 1.6) % (W * 1.6) - W * .3, cy = H * (.45 + hash2(i, 5) * .5), s = 40 + hash2(i, 7) * 80; ctx.beginPath(); ctx.arc(cx, cy, s * .5, 0, TAU); ctx.arc(cx + s * .55, cy - s * .12, s * .42, 0, TAU); ctx.arc(cx + s * 1.05, cy + .05 * s, s * .38, 0, TAU); ctx.fill(); }
    // plane
    const px = W * .5 + Math.sin(this.t * 1.3) * 6, py = H * .38 + Math.sin(this.t * .9) * 8;
    ctx.save(); ctx.translate(px, py); ctx.fillStyle = '#e8ecf4'; ctx.beginPath(); ctx.ellipse(0, 0, 110, 16, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#c8ccd8'; ctx.beginPath(); ctx.moveTo(-95, 0); ctx.lineTo(-125, -34); ctx.lineTo(-100, -34); ctx.lineTo(-70, -6); ctx.fill(); ctx.beginPath(); ctx.moveTo(-10, 4); ctx.lineTo(-40, 40); ctx.lineTo(-5, 40); ctx.lineTo(30, 6); ctx.fill(); ctx.fillStyle = '#2f6f9f'; ctx.fillRect(-80, -6, 170, 4); ctx.fillStyle = '#1e2a48'; for (let i = 0; i < 10; i++) ctx.fillRect(-60 + i * 14, -3, 6, 6); ctx.restore();
    // route line
    const y0 = H * .82; ctx.fillStyle = 'rgba(255,255,255,.7)'; for (let x = W * .15; x < W * .85; x += 14) ctx.fillRect(x, y0, 6, 2); ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.arc(W * .15 + (W * .7) * k, y0 + 1, 6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `bold 15px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(back ? 'Home' : d.name, W * .5, y0 + 28); ctx.font = `12px ${FONT}`; ctx.fillText(back ? d.name + '  →  the city' : 'the city  →  ' + d.where, W * .5, y0 + 48);
  },
};

// ---------- LANDMARK (one scene, data-driven) ----------
const LandmarkScene = {
  name: 'landmark', where: '', w: 1500, d: null, tourists: [],
  enter(G, from) {
    const d = this.d = G.flight.dest; this.w = d.w; this.where = d.name;
    const p = G.player; p.y = 12; p.x = 90; p.facing = 1; Camera.follow = p; Camera.locked = false; Camera.snapTo(p.x, -110, 1.2); Camera.tzoom = 1.2;
    const r = RNG(d.id.length * 131 + d.fare); this.tourists = [];
    for (let i = 0; i < 14; i++) { const a = new Actor(genCharacter(7000 + i * 3 + d.fare, r.chance(.6) ? 'tourist' : undefined)); a.x = r.range(250, d.w - 80); a.y = r.range(4, ROOM_DEPTH); a.facing = r.chance(.5) ? 1 : -1; a.dir = a.facing; a.wander = r.chance(.6); a.posture = r.pick(['idle', 'phone', 'idleLook', 'point']); this.tourists.push(a); }
    if (!G.stamps.includes(d.id)) { G.stamps.push(d.id); UI.say('Passport stamped: ' + d.name, 3); if (!G.inv.some(i => i && i.name === 'Passport')) G.give({ name: 'Passport', col: '#3a4a9a' }); }
    Camera.play([{ zoom: 1.2, dur: .6, hold: .4 }, { zoom: .5, x: d.w * .55, y: -240, dur: 2.2, hold: 1.2 }, { zoom: .55, x: p.x, dur: 1, ease: easeOut }], () => { Camera.tzoom = .55; Camera.stopIndex = Camera.nearestStop(); });
  },
  update(G, dt) {
    const p = G.player, d = this.d; G.movePlayer(dt, 30, this.w - 30, 4, ROOM_DEPTH);
    if (p.x < 130) G.setPrompt('Fly home', () => { G.flight.back = true; G.go('flight', 'landmark'); });
    else if (Math.abs(p.x - d.w * .55) < 60 && !G.flags['photo_' + d.id]) G.setPrompt('Take a photo', () => { G.flags['photo_' + d.id] = true; p.setEmote('phone', 2.5); G.cash += 12; UI.say('A tourist tipped $12 for the shot.', 2.5); });
    else if (Math.abs(p.x - (d.w - 120)) < 50 && !G.flags['souvenir_' + d.id]) G.setPrompt('Buy souvenir ($5)', () => { if (G.cash >= 5) { G.cash -= 5; G.flags['souvenir_' + d.id] = true; G.give({ name: d.name.split(' ')[0], col: '#c9a24a' }); } else UI.say('Not enough cash.', 1.5); });
    else G.setPrompt(null);
    for (const a of this.tourists) { if (a.wander) { a.vx = a.dir * a.spec.walkSpeed * .6; a.x += a.vx * dt; if (a.x > this.w - 60 || a.x < 200) a.dir *= -1; } a.update(dt); }
  },
  draw(G, ctx, cam) {
    const d = this.d, W = cam.w, H = cam.h;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, d.sky[0]); g.addColorStop(1, d.sky[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (d.sun) { ctx.fillStyle = d.sun.col; ctx.beginPath(); ctx.arc(W * d.sun.x, H * d.sun.y, 34, 0, TAU); ctx.fill(); glow(ctx, W * d.sun.x, H * d.sun.y, 220, d.sun.col.length === 7 ? 'rgba(255,240,200,A)' : 'rgba(255,240,200,A)', .35); }
    if (d.night) { ctx.fillStyle = '#f5f0d8'; for (let i = 0; i < 80; i++) ctx.fillRect(hash2(i, 7) * W, hash2(i, 11) * H * .6, 1.4, 1.4); }
    cam.begin(ctx); inkW(cam.zoom);
    drawFar(ctx, d);
    // ground
    ctx.fillStyle = d.ground; ctx.fillRect(-400, 0, d.w + 800, ROOM_DEPTH + 10); ctx.fillStyle = shade(d.ground, .7); ctx.fillRect(-400, ROOM_DEPTH + 10, d.w + 800, 4000); ctx.fillStyle = shade(d.ground, .9); ctx.fillRect(-400, -6, d.w + 800, 6);
    LANDMARKS[d.id](ctx, d);
    // arrival shuttle
    cut(ctx, '#e8ecf4', 20, -60, 120, 50, 8); cut(ctx, '#2f6f9f', 20, -40, 120, 4); ctx.fillStyle = '#1e2a48'; for (let i = 0; i < 5; i++) ctx.fillRect(34 + i * 20, -54, 12, 12); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(45, -6, 8, 0, TAU); ctx.arc(115, -6, 8, 0, TAU); ctx.fill();
    // souvenir stand
    const sx = d.w - 140; shadowCut(ctx, '#b0413e', sx, -60, 90, 12, 2); cut(ctx, '#e8e0c8', sx + 8, -48, 74, 48, 2); cut(ctx, '#c9a24a', sx + 16, -30, 12, 12, 2); cut(ctx, '#2f6f9f', sx + 34, -30, 12, 12, 2); cut(ctx, '#3e8a5b', sx + 52, -30, 12, 12, 2);
    // photo spot marker
    if (!G.flags['photo_' + d.id]) { ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.arc(d.w * .55, -70 + Math.sin(G.clock * 200) * 4, 6, 0, TAU); ctx.fill(); }
    const acts = this.tourists.concat([G.player]).sort((a, b) => a.y - b.y); for (const a of acts) a.draw(ctx, cam.zoom);
    if (d.fog || d.mist) { ctx.fillStyle = 'rgba(230,230,240,.18)'; ctx.fillRect(-400, -90, d.w + 800, 130); }
    cam.end(ctx);
  },
};

function drawFar(ctx, d) {
  const w = d.w, far = d.far, night = d.night;
  ctx.fillStyle = far;
  switch (d.bg) {
    case 'mountains': ctx.beginPath(); ctx.moveTo(-400, 0); for (let x = -400; x <= w + 400; x += 60) ctx.lineTo(x, -220 - hash2(x, 3) * 260 - Math.sin(x * .004) * 100); ctx.lineTo(w + 400, 0); ctx.fill(); ctx.fillStyle = shade(far, .85); ctx.beginPath(); ctx.moveTo(-400, 0); for (let x = -400; x <= w + 400; x += 40) ctx.lineTo(x, -120 - hash2(x, 5) * 120); ctx.lineTo(w + 400, 0); ctx.fill(); break;
    case 'hills': ctx.beginPath(); ctx.moveTo(-400, 0); for (let x = -400; x <= w + 400; x += 40) ctx.lineTo(x, -80 - Math.sin(x * .003) * 50 - Math.sin(x * .009) * 20); ctx.lineTo(w + 400, 0); ctx.fill(); break;
    case 'dunes': ctx.beginPath(); ctx.moveTo(-400, 0); for (let x = -400; x <= w + 400; x += 40) ctx.lineTo(x, -60 - Math.abs(Math.sin(x * .002)) * 90); ctx.lineTo(w + 400, 0); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let x = -400; x <= w + 400; x += 40) ctx.fillRect(x, -60 - Math.abs(Math.sin(x * .002)) * 90 + 30, 30, 2); break;
    case 'trees': ctx.fillRect(-400, -60, w + 800, 60); for (let x = -400; x <= w + 400; x += 34) { const h = 60 + hash2(x, 1) * 90; ctx.beginPath(); ctx.arc(x, -h, 26 + hash2(x, 2) * 16, 0, TAU); ctx.fill(); ctx.fillRect(x - 3, -h, 6, h); } break;
    case 'rooftops': for (let x = -400; x <= w + 400; x += 70) { const h = 80 + hash2(x, 1) * 160, bw = 60 + hash2(x, 2) * 30; ctx.fillStyle = mix(far, '#000', hash2(x, 3) * .3); ctx.fillRect(x, -h, bw, h); if (night) { ctx.fillStyle = '#ffd36a'; for (let i = 0; i < 6; i++) if (hash2(x + i, 4) < .3) ctx.fillRect(x + 8 + (i % 3) * 18, -h + 12 + Math.floor(i / 3) * 30, 6, 8); } else { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x, -h, bw, 6); } } if (!night) { ctx.fillStyle = '#3f5a3a'; for (let x = -300; x < w + 300; x += 260) { ctx.beginPath(); ctx.ellipse(x, -70, 40, 22, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x - 3, -60, 6, 60); ctx.fillStyle = '#3f5a3a'; } } break;
    case 'harbour': ctx.fillStyle = far; ctx.beginPath(); ctx.moveTo(-400, -40); ctx.quadraticCurveTo(w * .25, -260, w * .5, -40); ctx.lineTo(w * .5, -30); ctx.quadraticCurveTo(w * .25, -230, -400, -30); ctx.fill(); ctx.fillRect(-400, -60, 20, 60); ctx.fillRect(w * .48, -60, 20, 60); for (let x = -400; x < w * .5; x += 40) { const y = -40 - (1 - Math.pow((x - w * .05) / (w * .45), 2)) * 200 * .55; ctx.fillRect(x, y, 2, -y - 30); } ctx.fillRect(-400, -34, w * .5 + 400, 4); break;
  }
}
// ---------- the landmarks themselves (paper cutouts) ----------
const LANDMARKS = {
  chichen(ctx, d) {
    const cx = d.w * .55, base = 620, steps = 9; ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(cx - base / 2 + 12, -8, base, 8);
    for (let i = 0; i < steps; i++) { const w = base * (1 - i / steps * .78), h = 34; ctx.fillStyle = i % 2 ? '#b8a37a' : '#a89268'; ctx.fillRect(cx - w / 2, -(i + 1) * h, w, h); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(cx + w / 2 - 14, -(i + 1) * h, 14, h); }
    ctx.fillStyle = '#9a8460'; ctx.fillRect(cx - 40, -steps * 34 - 46, 80, 46); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(cx - 10, -steps * 34 - 34, 20, 34);
    ctx.fillStyle = '#7a6a48'; ctx.fillRect(cx - 24, -steps * 34, 48, steps * 34); ctx.fillStyle = 'rgba(0,0,0,.2)'; for (let i = 0; i < 30; i++) ctx.fillRect(cx - 24, -i * 10, 48, 2);
    for (let i = 0; i < 5; i++) { ctx.fillStyle = '#4f8a3a'; ctx.beginPath(); ctx.arc(cx - 420 + i * 40, -60, 30, 0, TAU); ctx.fill(); ctx.fillStyle = '#5a3a2a'; ctx.fillRect(cx - 424 + i * 40, -40, 8, 40); }
  },
  stonehenge(ctx, d) {
    const cx = d.w * .55; const stone = (x, w, h, tilt) => { ctx.fillStyle = '#7a7d80'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x + w + tilt, -h); ctx.lineTo(x + tilt, -h); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + w - 8 + tilt, -h, 8, h); };
    stone(cx - 260, 40, 120, 0); stone(cx - 200, 44, 130, 4); ctx.fillStyle = '#6f7275'; ctx.fillRect(cx - 262, -150, 110, 22);
    stone(cx - 90, 42, 140, -2); stone(cx - 20, 46, 142, 2); ctx.fillStyle = '#6f7275'; ctx.fillRect(cx - 94, -164, 124, 24);
    stone(cx + 90, 40, 125, 5); stone(cx + 160, 42, 110, -6); stone(cx + 250, 38, 90, 3); stone(cx - 380, 34, 70, -4);
    ctx.fillStyle = '#5a6f4a'; ctx.beginPath(); ctx.arc(cx + 400, -18, 60, Math.PI, TAU); ctx.fill();
  },
  greatwall(ctx, d) {
    ctx.fillStyle = '#8a8478'; const y = x => -120 - Math.sin(x * .0035) * 90 - Math.sin(x * .011) * 30;
    ctx.beginPath(); ctx.moveTo(-400, 0); for (let x = -400; x <= d.w + 400; x += 20) ctx.lineTo(x, y(x)); ctx.lineTo(d.w + 400, 0); ctx.fill();
    ctx.fillStyle = '#6f6a5e'; for (let x = -400; x <= d.w + 400; x += 26) ctx.fillRect(x, y(x) - 14, 14, 14);
    ctx.fillStyle = 'rgba(0,0,0,.15)'; for (let x = -400; x <= d.w + 400; x += 20) ctx.fillRect(x, y(x) + 30, 18, 2), ctx.fillRect(x + 8, y(x) + 60, 18, 2);
    for (const tx of [200, 760, 1380]) { ctx.fillStyle = '#7d7568'; ctx.fillRect(tx - 34, y(tx) - 80, 68, 80 + 100); ctx.fillStyle = '#5a5248'; ctx.fillRect(tx - 38, y(tx) - 84, 76, 8); ctx.fillStyle = '#2a2420'; ctx.fillRect(tx - 8, y(tx) - 60, 16, 22); }
  },
  giza(ctx, d) {
    const pyr = (x, w, h, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - w / 2, 0); ctx.lineTo(x, -h); ctx.lineTo(x + w / 2, 0); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.moveTo(x, -h); ctx.lineTo(x + w / 2, 0); ctx.lineTo(x + w * .12, 0); ctx.fill(); };
    pyr(d.w * .3, 520, 300, '#d9b877'); pyr(d.w * .62, 620, 360, '#d4b26f'); pyr(d.w * .9, 380, 220, '#cfae6c');
    ctx.fillStyle = 'rgba(0,0,0,.1)'; for (let i = 1; i < 12; i++) ctx.fillRect(d.w * .62 - 310 + i * 26, -i * 30, 620 - i * 52, 1.5);
    // sphinx
    ctx.fillStyle = '#c9a25c'; ctx.fillRect(d.w * .42, -70, 160, 70); ctx.fillRect(d.w * .42 + 120, -120, 44, 60); ctx.fillStyle = '#b8924f'; ctx.fillRect(d.w * .42 + 112, -132, 60, 20);
  },
  eiffel(ctx, d) {
    const cx = d.w * .55, H = 760; ctx.fillStyle = '#6a5140';
    const leg = (dir) => { ctx.beginPath(); ctx.moveTo(cx + dir * 190, 0); ctx.quadraticCurveTo(cx + dir * 110, -H * .25, cx + dir * 60, -H * .5); ctx.lineTo(cx + dir * 22, -H); ctx.lineTo(cx, -H); ctx.lineTo(cx + dir * 30, -H * .5); ctx.quadraticCurveTo(cx + dir * 60, -H * .25, cx + dir * 130, 0); ctx.fill(); };
    leg(1); leg(-1);
    ctx.fillRect(cx - 150, -H * .22, 300, 14); ctx.fillRect(cx - 78, -H * .48, 156, 12); ctx.fillRect(cx - 30, -H * .96, 60, 10); ctx.fillRect(cx - 4, -H - 60, 8, 60);
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i < 26; i++) { const t = i / 26, y = -H * .22 * t, w = 150 * (1 - t * .2); ctx.moveTo(cx - w, y); ctx.lineTo(cx + w * .3, y - 30); } ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 150, -H * .22); ctx.quadraticCurveTo(cx, -H * .05, cx + 150, -H * .22); ctx.stroke();
    // lights
    ctx.fillStyle = '#ffd36a'; for (let i = 0; i < 60; i++) { const t = hash2(i, 1), x = cx + (hash2(i, 2) - .5) * 300 * (1 - t * .85), y = -t * H; ctx.globalAlpha = .5 + hash2(i, 3) * .5; ctx.fillRect(x, y, 2, 2); } ctx.globalAlpha = 1;
    glow(ctx, cx, -H * .5, 420, 'rgba(255,211,106,A)', .12);
    const sw = Math.sin((typeof Game !== 'undefined' ? Game.clock : 0) * 120); ctx.fillStyle = '#fff'; ctx.globalAlpha = .6; ctx.beginPath(); ctx.moveTo(cx, -H - 40); ctx.lineTo(cx + sw * 500, -H - 200); ctx.lineTo(cx + sw * 500 + 60, -H - 150); ctx.fill(); ctx.globalAlpha = 1;
  },
  taj(ctx, d) {
    const cx = d.w * .55; ctx.fillStyle = '#f3efe6'; ctx.fillRect(cx - 320, -60, 640, 60); ctx.fillStyle = '#eae4d8'; ctx.fillRect(cx - 190, -230, 380, 170);
    ctx.fillStyle = '#f5f1ea'; ctx.beginPath(); ctx.arc(cx, -280, 110, Math.PI * .95, TAU + Math.PI * .05); ctx.lineTo(cx + 96, -230); ctx.lineTo(cx - 96, -230); ctx.fill(); ctx.fillRect(cx - 3, -400, 6, 20); ctx.fillStyle = '#c9a24a'; ctx.beginPath(); ctx.arc(cx, -402, 6, 0, TAU); ctx.fill();
    for (const dx of [-150, 150]) { ctx.fillStyle = '#f0ece2'; ctx.beginPath(); ctx.arc(cx + dx, -250, 34, Math.PI, TAU); ctx.fill(); ctx.fillRect(cx + dx - 26, -250, 52, 20); }
    ctx.fillStyle = '#2a2436'; ctx.beginPath(); ctx.moveTo(cx - 44, -60); ctx.lineTo(cx - 44, -150); ctx.arc(cx, -150, 44, Math.PI, TAU); ctx.lineTo(cx + 44, -60); ctx.fill();
    for (const mx of [-300, -240, 240, 300]) { ctx.fillStyle = '#efe9dd'; ctx.fillRect(cx + mx - 10, -300, 20, 240); ctx.beginPath(); ctx.arc(cx + mx, -300, 14, Math.PI, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(80,140,200,.5)'; ctx.fillRect(cx - 60, 4, 120, ROOM_DEPTH); // reflecting pool
    ctx.fillStyle = '#2f6f3a'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(cx - 500 + i * 60, -60, 12, 60, 0, 0, TAU); ctx.fill(); }
  },
  opera(ctx, d) {
    const cx = d.w * .55; ctx.fillStyle = 'rgba(60,120,180,.6)'; ctx.fillRect(-400, -40, d.w + 800, 40);
    ctx.fillStyle = '#c9a97a'; ctx.fillRect(cx - 300, -60, 600, 60);
    const shell = (x, w, h, dir) => { ctx.fillStyle = '#f4f2ec'; ctx.beginPath(); ctx.moveTo(x, -60); ctx.quadraticCurveTo(x + w * .5 * dir, -60 - h * 1.15, x + w * dir, -60 - h * .2); ctx.lineTo(x + w * dir, -60); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 1; i < 6; i++) { ctx.fillRect(x + w * dir * i / 6 - 1, -60 - h * (1 - i / 6) * .8, 2, h * (1 - i / 6) * .8); } };
    shell(cx - 280, 200, 200, 1); shell(cx - 60, 170, 260, 1); shell(cx + 120, 130, 180, 1); shell(cx + 300, 120, 140, -1);
    ctx.fillStyle = 'rgba(255,255,255,.3)'; for (let i = 0; i < 40; i++) ctx.fillRect(-400 + i * (d.w + 800) / 40, -30 + hash2(i, 2) * 20, 30, 2);
  },
  colosseum(ctx, d) {
    const cx = d.w * .55, w = 760, h = 260; ctx.fillStyle = '#c9b48a'; ctx.beginPath(); ctx.ellipse(cx, -h * .5, w / 2, h * .5, 0, 0, TAU); ctx.fill(); ctx.fillRect(cx - w / 2, -h * .5, w, h * .5);
    ctx.fillStyle = '#b8a078'; ctx.beginPath(); ctx.moveTo(cx - w / 2, -h * .5); ctx.lineTo(cx - w * .15, -h * .95); ctx.lineTo(cx - w * .15, 0); ctx.lineTo(cx - w / 2, 0); ctx.fill();
    ctx.fillStyle = '#4a3a2a'; for (let r = 0; r < 3; r++) for (let i = 0; i < 18; i++) { const x = cx - w / 2 + 24 + i * (w - 48) / 18, y = -h * .28 - r * h * .28; ctx.beginPath(); ctx.arc(x + 12, y - 8, 10, Math.PI, TAU); ctx.fill(); ctx.fillRect(x + 2, y - 8, 20, 22); }
    ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(cx - w / 2, -h * .3, w, 6); ctx.fillRect(cx - w / 2, -h * .58, w, 6);
  },
  fuji(ctx, d) {
    const cx = d.w * .6; ctx.fillStyle = '#4a5f8a'; ctx.beginPath(); ctx.moveTo(cx - 1300, -60); ctx.lineTo(cx, -820); ctx.lineTo(cx + 1300, -60); ctx.lineTo(cx + 1300, 0); ctx.lineTo(cx - 1300, 0); ctx.fill();
    ctx.fillStyle = '#f7f4f0'; ctx.beginPath(); ctx.moveTo(cx - 200, -640); ctx.lineTo(cx, -820); ctx.lineTo(cx + 200, -640); ctx.lineTo(cx + 140, -660); ctx.lineTo(cx + 80, -630); ctx.lineTo(cx, -670); ctx.lineTo(cx - 70, -630); ctx.lineTo(cx - 140, -660); ctx.fill();
    ctx.fillStyle = 'rgba(80,140,200,.5)'; ctx.fillRect(-400, -60, d.w + 800, 60);
    // torii gate
    const tx = d.w * .35; ctx.fillStyle = '#c0392b'; ctx.fillRect(tx - 70, -220, 14, 220); ctx.fillRect(tx + 56, -220, 14, 220); ctx.fillRect(tx - 100, -232, 200, 14); ctx.fillRect(tx - 80, -196, 160, 10); ctx.fillStyle = '#1a1a1a'; ctx.fillRect(tx - 104, -240, 208, 8);
    ctx.fillStyle = '#e88fb0'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(d.w * .15 + i * 70, -110, 40, 0, TAU); ctx.fill(); ctx.fillStyle = '#5a3a2a'; ctx.fillRect(d.w * .15 + i * 70 - 4, -90, 8, 90); ctx.fillStyle = '#e88fb0'; }
  },
  machu(ctx, d) {
    const cx = d.w * .55; ctx.fillStyle = '#4f7a4a'; ctx.beginPath(); ctx.moveTo(cx + 300, 0); ctx.quadraticCurveTo(cx + 380, -500, cx + 470, -720); ctx.quadraticCurveTo(cx + 560, -500, cx + 700, 0); ctx.fill();
    for (let t = 0; t < 7; t++) { ctx.fillStyle = t % 2 ? '#7fa06a' : '#6f925a'; ctx.fillRect(cx - 400 + t * 12, -t * 22, 800 - t * 30, 22); ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(cx - 400 + t * 12, -t * 22, 800 - t * 30, 2); }
    const hut = (x, y, w) => { ctx.fillStyle = '#a89a80'; ctx.fillRect(x, y - 30, w, 30); ctx.fillStyle = '#b8a070'; ctx.beginPath(); ctx.moveTo(x - 4, y - 30); ctx.lineTo(x + w / 2, y - 52); ctx.lineTo(x + w + 4, y - 30); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x + w * .4, y - 18, w * .2, 18); };
    hut(cx - 320, -66, 60); hut(cx - 200, -110, 70); hut(cx - 60, -132, 80); hut(cx + 80, -110, 60); hut(cx + 180, -66, 70); hut(cx - 140, -44, 50);
    ctx.fillStyle = 'rgba(160,150,130,.6)'; for (let i = 0; i < 50; i++) ctx.fillRect(cx - 380 + hash2(i, 1) * 760, -hash2(i, 2) * 130, 10, 3);
  },
};
