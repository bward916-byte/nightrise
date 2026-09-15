// ===== main =====
const Game = {
  turn: null, clock: 0, cash: 0, inv: [null, null, null, null, null, null], where: 'Street', state: 'intro', floor: 0, flags: {}, coins: [], stamps: [], fade: 0, fadeDir: 0, pending: null, flight: null,
  init(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.setStreet(City.home());
    this.player = new Actor(genPlayer()); this.player.spec.walkSpeed = 3.2 * M; this.player.x = TOWER.x + TOWER.w / 2 + 160; this.player.y = GROUND + 20;
    this.cartMan = new Actor(genCartMan()); this.cartMan.x = this.city.alley.x + 101; this.cartMan.y = GROUND; this.cartMan.facing = -1; this.cartMan.posture = 'sit';
    const r = RNG(31); this.lobbyFolk = [0, 1, 2].map(i => { const a = new Actor(genCharacter(600 + i, i === 0 ? 'business' : i === 1 ? 'fancy' : 'elder')); a.x = [330, 700, 860][i]; a.y = [6, 14, 10][i]; a.facing = i === 0 ? 1 : -1; a.posture = i === 0 ? 'idle' : i === 1 ? 'phone' : 'sit'; if (i === 2) a.y = 4; return a; });
    Object.assign(SCENES, { airport: AirportScene, flight: FlightScene, landmark: LandmarkScene });
    this.crowdAir = [0, 1, 2, 3, 4].map(i => { const a = new Actor(genCharacter(800 + i * 5, i < 2 ? 'business' : i === 2 ? 'tourist' : undefined)); a.x = 300 + i * 220; a.y = 6 + (i % 3) * 8; a.facing = i % 2 ? -1 : 1; a.dir = a.facing; a.wander = i > 2; a.posture = i === 0 ? 'phone' : i === 1 ? 'crossArms' : 'idle'; return a; });
    this.scene = StreetScene; this.resize(); Input.init(canvas); StreetScene.enter(this, null);
    if (typeof window !== 'undefined') { window.addEventListener('resize', () => this.resize()); this.last = performance.now(); requestAnimationFrame(t => this.frame(t)); }
    this.startIntro();
  },
  resize() { const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1); const w = (typeof window !== 'undefined' ? window.innerWidth : this.canvas.width), h = (typeof window !== 'undefined' ? window.innerHeight : this.canvas.height); this.canvas.width = w * dpr; this.canvas.height = h * dpr; if (this.canvas.style) { this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px'; } Camera.setSize(w, h, dpr); },
  startIntro() {
    this.state = 'intro'; const p = this.player;
    Camera.play([
      { zoom: 2.4, dur: 1.2, hold: .5 },
      { zoom: 0.06, x: TOWER.x + TOWER.w / 2, y: -TOWER.h / 2 + 900, dur: 3.2, hold: 1.4 },
      { zoom: 1.0, x: p.x, dur: 1.1, ease: easeOut },
    ], () => { this.state = 'play'; this.introDone = true; Camera.setStop(1); UI.setHint(Camera.w < 700 ? 'Drag left side to walk · pinch or +/– to zoom' : 'WASD to walk · E to interact or cross at a corner · scroll to zoom · 1–0 poses', 6); });
  },
  frame(t) { const dt = Math.min(.05, (t - this.last) / 1000); this.last = t; this.update(dt); this.draw(); requestAnimationFrame(t => this.frame(t)); },
  // ---- streets
  setStreet(st) { this.city = st; if (!st.crowd) st.crowd = new Crowd(st); if (!st.coins) { const r = RNG(st.id.length * 91 + st.i * 7 + (st.dir === 'ns' ? 3 : 0)); st.coins = []; for (let i = 0; i < (st.ch && st.ch.crowd > 140 ? 11 : 6); i++) st.coins.push({ x: r.range(st.x0, st.x1), y: GROUND + r.range(8, WALK_DEPTH), v: r.pick([1, 1, 2, 5]), got: false }); } },
  // night runs 8pm -> 5am over about 14 real minutes; the streets empty out after midnight and fill again toward dawn
  hour() { return 20 + ((this.clock * 50 / 840) % 1) * 9; },
  density() { const h = this.hour(); const late = smoothstep(23.5, 25.5, h) * (1 - smoothstep(27.5, 29, h)); const wave = .85 + .15 * Math.sin(this.clock * 50 * .05); return clamp(wave * (1 - late * .82), .12, 1); },
  homeHint() { const c = this.city; if (!c) return null; if (c.isHome) { const d = TOWER.x + TOWER.w / 2 - this.player.x; return Math.abs(d) < 80 ? 'Home' : (d > 0 ? '→ ' : '← ') + Math.max(1, Math.round(Math.abs(d) / BLOCK * 10) / 10) + ' blocks'; } if (c.dir === 'ns') { const k = c.inters.find(i => i.cross.i === HOME.i); const d = k.x - this.player.x; return Math.abs(d) < 60 ? 'Cross here' : (d > 0 ? '→ ' : '← ') + 'Main St'; } return 'Cross to an avenue'; },
  cross(it) {
    if (this.turn) return;
    const to = City.get(it.cross.dir, it.cross.i);
    this.turn = { t: 0, phase: 'up', from: this.city, to, it, k: it.k };
    Camera.locked = true; UI.prompt = null; this.action = null; UI.panelOpen = false;
    this.player.vx = this.player.vy = 0;
  },
  updateTurn(dt) {
    const T = this.turn; T.t += dt;
    const D = { up: .45, hold: .75, down: .45 }[T.phase];
    if (T.t >= D) {
      T.t = 0;
      if (T.phase === 'up') T.phase = 'hold';
      else if (T.phase === 'hold') {
        const to = T.to, p = this.player;
        this.setStreet(to);
        const back = to.inters.find(q => q.cross.dir === T.from.dir && q.cross.i === T.from.i) || to.inters[0];
        p.x = back.x; p.y = GROUND + 20; p.facing = 1; p.depth = 0;
        this.where = to.name; Camera.snapTo(p.x, p.y - 100, Camera.zoom);
        T.phase = 'down';
      } else { const p = this.player; Camera.follow = p; Camera.locked = false; Camera.snapTo(p.x, p.y - 100, 1); Camera.setStop(1); this.turn = null; UI.setHint(this.city.name, 2.5); return; }
    }
    this.player.update(dt);
  },
  // overhead schematic of the grid — also the transition between streets
  drawMap(ctx, cam) {
    const T = this.turn, W = cam.w, H = cam.h;
    let k = clamp(T.t / ({ up: .45, hold: .75, down: .45 })[T.phase], 0, 1);
    const open = T.phase === 'up' ? easeInOut(k) : T.phase === 'down' ? 1 - easeInOut(k) : 1;
    if (open <= 0) return;
    ctx.save(); ctx.globalAlpha = open;
    ctx.fillStyle = `rgba(7,10,22,${.86 + .14 * open})`; ctx.fillRect(0, 0, W, H);
    const pad = Math.min(W, H) * .14, size = Math.min(W - pad * 2, H - pad * 2 - 40), ox = W / 2 - size / 2, oy = H / 2 - size / 2 + 10;
    const sc = 1 - (1 - open) * .12; ctx.translate(W / 2, H / 2 + 10); ctx.scale(sc, sc); ctx.translate(-W / 2, -(H / 2 + 10));
    const px = i => ox + size * (i + .5) / 4, roadW = Math.max(12, size * .045);
    // blocks
    ctx.fillStyle = '#131a2e';
    for (let a = 0; a <= 4; a++) for (let b = 0; b <= 4; b++) { const x = ox + size * a / 4 + roadW / 2, y = oy + size * b / 4 + roadW / 2, w = size / 4 - roadW, h = size / 4 - roadW; if (a < 4 && b < 4) { ctx.fillStyle = '#141c30'; ctx.fillRect(x, y, w, h); ctx.fillStyle = 'rgba(255,255,255,.03)'; ctx.fillRect(x, y, w, 3); } }
    // streets
    const cur = this.city, dest = T.to;
    const line = (dir, i, col, wid) => { ctx.fillStyle = col; if (dir === 'ew') ctx.fillRect(ox - 20, px(i) - wid / 2, size + 40, wid); else ctx.fillRect(px(i) - wid / 2, oy - 20, wid, size + 40); };
    for (let i = 0; i < 4; i++) { line('ew', i, '#20283f', roadW); line('ns', i, '#20283f', roadW); }
    // highlight: from-street stays warm, to-street lights up during the hold
    const travel = T.phase === 'hold' ? easeInOut(k) : T.phase === 'up' ? 0 : 1;
    line(T.from.dir, T.from.i, mix('#ffd36a', '#20283f', travel), roadW);
    line(T.to.dir, T.to.i, mix('#20283f', '#ffd36a', travel), roadW);
    // the tower
    const tx = T.from.dir === 'ew' ? px(HOME.i) : px(HOME.i), ty = px(HOME.i);
    ctx.fillStyle = '#7fd4ff'; ctx.beginPath(); ctx.arc(px(2), px(HOME.i), roadW * .38, 0, TAU); ctx.fill();
    ctx.fillStyle = '#9ad8ff'; ctx.font = `bold ${Math.max(9, size * .026)}px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('HOME', px(2) + roadW * .8, px(HOME.i) - roadW * .9);
    // you: slide from the old street to the new one through the corner
    const corner = { x: T.from.dir === 'ew' ? px(T.it.cross.i) : px(T.from.i), y: T.from.dir === 'ew' ? px(T.from.i) : px(T.it.cross.i) };
    const e = T.phase === 'hold' ? easeInOut(k) : T.phase === 'down' ? 1 : 0;
    const you = { x: corner.x, y: corner.y };
    // step out along the street you're turning onto
    if (T.to.dir === 'ew') you.x = corner.x + size * .09 * e; else you.y = corner.y + size * .09 * e;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(you.x, you.y, roadW * .42, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${.5 - .4 * travel})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(you.x, you.y, roadW * (.7 + travel * .9), 0, TAU); ctx.stroke();
    // labels
    ctx.font = `${Math.max(9, size * .028)}px ${FONT}`; ctx.textBaseline = 'middle';
    for (let i = 0; i < 4; i++) { const hot = (T.to.dir === 'ew' && T.to.i === i); ctx.fillStyle = hot ? '#ffd36a' : 'rgba(210,220,240,.55)'; ctx.textAlign = 'right'; ctx.fillText(EW_NAMES[i], ox - 14, px(i)); }
    ctx.textAlign = 'center';
    for (let i = 0; i < 4; i++) { const hot = (T.to.dir === 'ns' && T.to.i === i); ctx.fillStyle = hot ? '#ffd36a' : 'rgba(210,220,240,.55)'; ctx.save(); ctx.translate(px(i), oy - 16); ctx.fillText(NS_NAMES[i], 0, 0); ctx.restore(); }
    ctx.fillStyle = '#e8eef8'; ctx.font = `bold ${Math.max(13, size * .045)}px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(travel > .5 ? T.to.name : T.from.name, W / 2, oy + size + 34);
    ctx.restore();
  },
  // ---- helpers scenes use
  movePlayer(dt, x0, x1, y0, y1) {
    const p = this.player; if (this.state !== 'play') { p.vx = p.vy = 0; return; }
    const spd = p.spec.walkSpeed * (Input.keys.ShiftLeft ? 1.8 : 1) * (Camera.zoom < .3 ? 2 : 1);
    p.vx = Input.axisX * spd; p.vy = Input.axisY * spd * .6;
    p.x = clamp(p.x + p.vx * dt, x0, x1); p.y = clamp(p.y + p.vy * dt, y0, y1);
  },
  setPrompt(text, fn) { UI.prompt = text; this.action = text ? fn : null; },
  give(item) { const i = this.inv.indexOf(null); if (i >= 0) { this.inv[i] = item; UI.say('Got ' + item.name, 1.5); } else UI.say('Pockets full.', 1.5); },
  go(name, from) { if (this.fadeDir) return; this.pending = { name, from }; this.fadeDir = 1; },
  openElevator(from) { this.elevatorFrom = from; this.go('elevator', from); },
  elevatorFloorLabel() { return this.scene === ElevatorScene ? '' : this.floor === 0 ? 'L' : this.floor === 99 ? 'R' : String(this.floor); },
  update(dt) {
    Input.update(); UI.update(dt); this.clock += dt / 50; if (!Sfx.ok && (Input.tap || Object.values(Input.pressed).some(Boolean))) Sfx.init();
    const p = this.player;
    if (!this.scene.noZoom && !Camera.seq) {
      if (Input.wheel) Camera.zoomBy(Math.pow(1.0018, -Input.wheel));
      if (Input.pinch) Camera.zoomBy(Math.pow(1.01, Input.pinch));
      if (Input.consume('KeyZ') || Input.consume('Equal')) Camera.setStop(Camera.stopIndex - 1);
      if (Input.consume('KeyX') || Input.consume('Minus')) Camera.setStop(Camera.stopIndex + 1);
    }
    if (Input.tap) {
      const id = UI.hit(Input.tap);
      if (id === 'zoomIn') Camera.setStop(Camera.stopIndex - 1); else if (id === 'zoomOut') Camera.setStop(Camera.stopIndex + 1); else if (id === 'zoomFit') Camera.setStop(1);
      else if (id === 'emotes') UI.panelOpen = !UI.panelOpen;
      else if (id === 'act' && this.action) this.action();
      else if (id && id.startsWith('emote:')) p.setEmote(id.slice(6), 2.4);
      if (id && !(id.startsWith('fl:') || id === 'esc')) Input.tap = null;
    }
    if (this.turn) { this.updateTurn(dt); if (this.city && this.city.crowd) this.city.crowd.update(dt, this.player, Camera.bounds()); Camera.update(dt); Input.endFrame(); return; }
    if (this.state === 'play' && !this.fadeDir && !this.turn) {
      for (const e of EMOTES) if (Input.consume('Digit' + e.key)) p.setEmote(e.name, 2.4);
      if (this.scene !== ElevatorScene && (Input.consume('KeyE') || Input.consume('Space') || Input.consume('Enter')) && this.action) this.action();
      this.scene.update(this, dt);
    } else if (this.scene === ElevatorScene) this.scene.update(this, dt);
    else { p.vx = p.vy = 0; if (this.scene === StreetScene) { this.city.crowd.update(dt, p, Camera.bounds()); if (this.city.isHome) this.cartMan.update(dt); } }
    if (this.scene !== ElevatorScene) p.update(dt);
    this.where = this.scene.where;
    // fades between scenes
    if (this.fadeDir) { this.fade = clamp(this.fade + dt * 3 * this.fadeDir, 0, 1); if (this.fadeDir > 0 && this.fade >= 1) { const q = this.pending; this.pending = null; this.scene = SCENES[q.name]; UI.prompt = null; this.action = null; UI.panelOpen = false; this.scene.enter(this, q.from); this.fadeDir = -1; } else if (this.fadeDir < 0 && this.fade <= 0) this.fadeDir = 0; }
    Camera.update(dt); Input.endFrame();
  },
  draw() {
    const ctx = this.ctx, cam = Camera, pal = dayPalette();
    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
    if (typeof Lights !== 'undefined') Lights.clear();
    this.scene.draw(this, ctx, cam, pal);
    // night vignette
    const v = ctx.createRadialGradient(cam.w / 2, cam.h / 2, cam.h * .35, cam.w / 2, cam.h / 2, cam.h * .95); v.addColorStop(0, 'rgba(5,6,16,0)'); v.addColorStop(1, 'rgba(5,6,16,.55)'); ctx.fillStyle = v; ctx.fillRect(0, 0, cam.w, cam.h);
    if (this.turn && !this.noUI) this.drawMap(ctx, cam);
    if (!this.noUI) UI.draw(ctx, this);
    if (this.state === 'intro') { const s = Camera.seq; if (s && s.i === 1) UI.title(ctx, 'NIGHTRISE', 'a regular guy · floor 83', Math.min(1, s.t)); }
    if (this.fade > 0) { ctx.fillStyle = `rgba(3,4,10,${this.fade})`; ctx.fillRect(0, 0, cam.w, cam.h); }
    Input.drawStick(ctx);
  },
  drawCart(ctx, x, y) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#6e7480'; ctx.beginPath(); ctx.moveTo(-34, -46); ctx.lineTo(30, -46); ctx.lineTo(26, -14); ctx.lineTo(-30, -14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a3f4a'; for (let i = 0; i < 6; i++) ctx.fillRect(-32 + i * 12, -46, 2, 32);
    ctx.fillRect(-36, -48, 4, 16); ctx.fillRect(-46, -64, 18, 4); ctx.fillRect(-29, -14, 4, 12); ctx.fillRect(22, -14, 4, 12);
    ctx.fillStyle = '#0a0c14'; ctx.beginPath(); ctx.arc(-24, 0, 4, 0, TAU); ctx.arc(20, 0, 4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3d4150'; ctx.beginPath(); ctx.ellipse(-12, -50, 14, 9, -.2, 0, TAU); ctx.fill(); ctx.fillStyle = '#b0413e'; ctx.beginPath(); ctx.ellipse(10, -52, 12, 8, .3, 0, TAU); ctx.fill(); ctx.fillStyle = '#d9b23a'; ctx.fillRect(18, -70, 10, 20);
    ctx.restore();
  },
  drawBalconyLedge(ctx, zoom) {
    if (zoom < .1) return; const B = BalconyScene; const y = B.y;
    ctx.fillStyle = '#2b3550'; ctx.fillRect(B.x0 - 4, y, B.w + 4, 8); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(B.x0 - 4, y + 8, B.w + 4, 6);
    ctx.fillStyle = '#4a5a7a'; ctx.fillRect(B.x0 + B.w - 6, y - 34, 4, 34); for (let i = 0; i < 9; i++) ctx.fillRect(B.x0 + 8 + i * 12, y - 30, 2, 30); ctx.fillRect(B.x0, y - 34, B.w, 3);
  },
  drawRoofEdge(ctx, zoom) {
    if (zoom < .1) return; const y = RoofScene.y; ctx.fillStyle = '#4a5a7a'; for (let i = 0; i < 12; i++) ctx.fillRect(TOWER.x + 40 + i * 50, y - 28, 2, 28); ctx.fillRect(TOWER.x + 30, y - 30, TOWER.w - 60, 3);
    ctx.fillStyle = '#ffe6a8'; ctx.fillRect(TOWER.x + 60, y - 60, 10, 60); glow(ctx, TOWER.x + 65, y - 60, 90, WARM, .2);
  },
};
if (typeof window !== 'undefined') window.addEventListener('load', () => Game.init(document.getElementById('c')));
