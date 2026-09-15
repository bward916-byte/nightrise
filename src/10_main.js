// ===== main =====
const Game = {
  cinema: null, clock: 0, cash: 0, inv: [null, null, null, null, null, null], where: 'Street', state: 'intro', floor: 0, flags: {}, coins: [], stamps: [], fade: 0, fadeDir: 0, pending: null, flight: null,
  init(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.setStreet(City.home());
    this.player = new Actor(genPlayer()); this.player.spec.walkSpeed = 3.2 * M; this.player.x = TOWER.x + TOWER.w / 2 + 160; this.player.y = GROUND + 20;
    this.cartMan = new Actor(genCartMan()); this.cartMan.x = this.city.alley.x + 101; this.cartMan.y = GROUND; this.cartMan.facing = -1; this.cartMan.posture = 'sit';
    const r = RNG(31); this.lobbyFolk = [0, 1, 2].map(i => { const a = new Actor(genCharacter(600 + i, i === 0 ? 'business' : i === 1 ? 'fancy' : 'elder')); a.x = [330, 700, 860][i]; a.y = [6, 14, 10][i]; a.facing = i === 0 ? 1 : -1; a.posture = i === 0 ? 'idle' : i === 1 ? 'phone' : 'sit'; if (i === 2) a.y = 4; return a; });
    Object.assign(SCENES, { airport: AirportScene, flight: FlightScene, landmark: LandmarkScene });
    this.crowdAir = [0, 1, 2, 3, 4].map(i => { const a = new Actor(genCharacter(800 + i * 5, i < 2 ? 'business' : i === 2 ? 'tourist' : undefined)); a.x = 300 + i * 220; a.y = 6 + (i % 3) * 8; a.facing = i % 2 ? -1 : 1; a.dir = a.facing; a.wander = i > 2; a.posture = i === 0 ? 'phone' : i === 1 ? 'crossArms' : 'idle'; return a; });
    this.scene = ApartmentScene; this.floor = PLAYER_FLOOR; this.resize(); Input.init(canvas); ApartmentScene.enter(this, 'wake');
    if (typeof window !== 'undefined') { window.addEventListener('resize', () => this.resize()); this.last = performance.now(); requestAnimationFrame(t => this.frame(t)); }
    this.startIntro();
  },
  resize() { const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1); const w = (typeof window !== 'undefined' ? window.innerWidth : this.canvas.width), h = (typeof window !== 'undefined' ? window.innerHeight : this.canvas.height); this.canvas.width = w * dpr; this.canvas.height = h * dpr; if (this.canvas.style) { this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px'; } Camera.setSize(w, h, dpr); },
  startIntro() {
    // he's asleep. alarm, sit up, stretch, stand, and then it's your night.
    this.state = 'intro'; const p = this.player, B = ApartmentScene.bed;
    p.x = B - 54; p.y = -64; p.facing = 1; p.posture = 'inBed'; p.setEmote('inBed', 99); this.where = 'Home · 8304';
    Camera.follow = null; Camera.locked = true; Camera.snapTo(B + 20, -96, 2.4); Camera.tzoom = 2.4; Camera.tx = B + 20; Camera.ty = -96;
    this.cinema = { t: 0, step: 0 };
  },
  updateIntro(dt) {
    const C = this.cinema, p = this.player, B = ApartmentScene.bed;
    C.t += dt;
    const go = (step, at, fn) => { if (C.step === step && C.t >= at) { C.step++; fn(); } };
    go(0, 1.4, () => { UI.say('7:12pm.', 2); });
    go(1, 2.6, () => { p.setEmote('sitUp', 2.4); p.x = B + 10; p.y = -44; UI.setHint('Silence that alarm when you are up.', 3); });
    go(2, 4.6, () => { p.setEmote('stretch', 2.2); p.x = B + 120; p.y = 12; Camera.tzoom = 1.8; Camera.ty = -120; Camera.tx = B + 140; });
    go(3, 6.6, () => { p.setEmote('yawn', 1.4); });
    go(4, 7.9, () => {
      p.emote = null; p.posture = 'idle'; p.x = B + 140; p.y = 12; p.facing = 1;
      Camera.follow = p; Camera.locked = false; Camera.tzoom = 1.6; Camera.setStop(Camera.nearestStop());
      this.state = 'play'; this.introDone = true; this.cinema = null;
      UI.setHint(Camera.w < 700 ? 'Drag the left side to walk · E to interact' : 'WASD to walk · E to interact · 1–0 poses', 5);
    });
    p.update(dt);
    if (Camera.locked) { Camera.x = lerp(Camera.x, Camera.tx || B + 10, 1 - Math.pow(.02, dt)); Camera.y = lerp(Camera.y, Camera.ty || -70, 1 - Math.pow(.02, dt)); Camera.zoom = Math.exp(lerp(Math.log(Camera.zoom), Math.log(Camera.tzoom), 1 - Math.pow(.05, dt))); }
  },
  frame(t) { const dt = Math.min(.05, (t - this.last) / 1000); this.last = t; this.update(dt); this.draw(); requestAnimationFrame(t => this.frame(t)); },
  // ---- streets
  setStreet(st) { this.city = st; if (!st.crowd) st.crowd = new Crowd(st); if (!st.coins) { const r = RNG(st.id.length * 91 + st.i * 7 + (st.dir === 'ns' ? 3 : 0)); st.coins = []; for (let i = 0; i < (st.ch && st.ch.crowd > 140 ? 11 : 6); i++) st.coins.push({ x: r.range(st.x0, st.x1), y: GROUND + r.range(8, WALK_DEPTH), v: r.pick([1, 1, 2, 5]), got: false }); } },
  // night runs 8pm -> 5am over about 14 real minutes; the streets empty out after midnight and fill again toward dawn
  hour() { return 20 + ((this.clock * 50 / 840) % 1) * 9; },
  density() { const h = this.hour(); const late = smoothstep(23.5, 25.5, h) * (1 - smoothstep(27.5, 29, h)); const wave = .85 + .15 * Math.sin(this.clock * 50 * .05); return clamp(wave * (1 - late * .82), .12, 1); },
  homeHint() { const c = this.city; if (!c) return null; if (c.isHome) { const d = TOWER.x + TOWER.w / 2 - this.player.x; return Math.abs(d) < 80 ? 'Home' : (d > 0 ? '→ ' : '← ') + Math.max(1, Math.round(Math.abs(d) / BLOCK * 10) / 10) + ' blocks'; } if (c.dir === 'ns') { const k = c.inters.find(i => i.cross.i === HOME.i); const d = k.x - this.player.x; return Math.abs(d) < 60 ? 'Cross here' : (d > 0 ? '→ ' : '← ') + 'Main St'; } return 'Cross to an avenue'; },
  cross(it) {
    const to = City.get(it.cross.dir, it.cross.i), from = this.city, p = this.player;
    this.setStreet(to);
    const back = to.inters.find(q => q.cross.dir === from.dir && q.cross.i === from.i) || to.inters[0];
    p.x = back.x; p.y = GROUND + 20; p.vx = p.vy = 0; p.depth = 0;
    Camera.follow = p; Camera.locked = false; Camera.snapTo(p.x, p.y - 100, Camera.zoom);
    this.where = to.name; UI.prompt = null; this.action = null; UI.setHint(to.name, 2.2);
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
    Input.update(); UI.update(dt); this.clock += dt / 50;
    if (!Sfx.ok && (Input.tap || Object.values(Input.pressed).some(Boolean))) Sfx.init();
    Music.follow(this); Music.update(dt);
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
      else if (id === 'mute') { Music.on = !Music.on; UI.say(Music.on ? 'Music on' : 'Music off', 1.2); }
      else if (id === 'act' && this.action) this.action();
      else if (id && id.startsWith('emote:')) p.setEmote(id.slice(6), 2.4);
      if (id && !(id.startsWith('fl:') || id === 'esc')) Input.tap = null;
    }
    if (this.cinema) { this.updateIntro(dt); Input.endFrame(); return; }
    if (this.state === 'play' && !this.fadeDir) {
      for (const e of EMOTES) if (Input.consume('Digit' + e.key)) p.setEmote(e.name, 2.4);
      if (Input.consume('KeyM')) { Music.on = !Music.on; UI.say(Music.on ? 'Music on' : 'Music off', 1.2); }
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
    if (!this.noUI) UI.draw(ctx, this);
    if (this.cinema && this.cinema.t < 2.2) UI.title(ctx, 'NIGHTRISE', 'a regular guy · floor 83', clamp(Math.min(this.cinema.t, 2.2 - this.cinema.t) * 2, 0, 1));
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
