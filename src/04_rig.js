// ===== rig: skeleton, postures, inked renderer =====
const FACE = '#2a2230';
// how lit the figure currently being drawn is (0 = deep shadow, 1 = under a lamp)
let LIT = 1;
function litCol(c) { if (LIT >= .98 || PAPER_SHADOW) return c; const k = clamp(LIT, 0, 1); return mix(mix(c, '#0b1130', (1 - k) * .42), '#ffd696', k * .10); }
const FONT = '"Comic Neue","Comic Sans MS","Chalkboard SE","Segoe Print",sans-serif';
// A pose is a bag of joint angles (radians). F = front (near) limb, B = back limb.
// Legs: hip angle from straight-down, +forward. knee = fold backward.
// Arms: shoulder angle from straight-down, +forward (PI = straight up). elbow = fold forward.
// spine: lean from vertical, +forward. head: nod, +forward (down). bob: pelvis vertical offset.
const POSE0 = { hipF: 0, kneeF: .06, hipB: 0, kneeB: .06, shF: 0, elF: .12, shB: 0, elB: .12, spine: 0, head: 0, bob: 0, shrug: 0, footF: 0, footB: 0, sit: 0 };
const P = o => Object.assign({}, POSE0, o);
const POSTURES = {
  idle: t => P({ bob: Math.sin(t * 2.2) * .6, shF: .04, shB: -.04, elF: .18 + Math.sin(t * 2.2) * .02 }),
  idleShift: t => { const w = Math.sin(t * .7); return P({ bob: Math.sin(t * 2.2) * .6 + Math.abs(w) * 1.2, hipF: .12 * w + .04, hipB: -.1 * w - .04, kneeF: .06 + Math.max(0, w) * .18, kneeB: .06 + Math.max(0, -w) * .18, spine: -.03 * w, shF: .05, shB: -.05, elF: .16, elB: .16 }); },
  pockets: t => P({ bob: Math.sin(t * 2.2) * .5, shF: -.35, elF: .55, shB: -.35, elB: .55, spine: .06, head: .04, hipF: .08, hipB: -.06 }),
  idleLook: t => P({ bob: Math.sin(t * 2.2) * .6, shF: .04, shB: -.04, elF: .18, head: -.12 + Math.sin(t * .9) * .18, spine: -.02 }),
  walk: (t, ph) => { const s = Math.sin(ph * TAU), c = Math.cos(ph * TAU);
    return P({ hipF: s * .55, kneeF: Math.max(0, -c) * .9 + .08, hipB: -s * .55, kneeB: Math.max(0, c) * .9 + .08,
      shF: -s * .45, elF: .35 + Math.max(0, -s) * .3, shB: s * .45, elB: .35 + Math.max(0, s) * .3,
      spine: .04, bob: Math.abs(c) * 1.6, footF: Math.max(0, s) * .3, footB: Math.max(0, -s) * .3 }); },
  run: (t, ph) => { const s = Math.sin(ph * TAU), c = Math.cos(ph * TAU);
    return P({ hipF: s * .95, kneeF: Math.max(0, -c) * 1.6 + .3, hipB: -s * .95, kneeB: Math.max(0, c) * 1.6 + .3,
      shF: -s * .9, elF: 1.5, shB: s * .9, elB: 1.5, spine: .22, bob: Math.abs(c) * 4 - 2 }); },
  armsUp: t => P({ shF: 2.6 + Math.sin(t * 6) * .12, elF: .4, shB: 2.5 - Math.sin(t * 6) * .12, elB: .45, head: -.25, spine: -.08, hipF: .12, hipB: -.1 }),
  headDown: t => P({ head: .75, spine: .22, shF: .12, elF: .08, shB: .1, elB: .08, bob: 2, kneeF: .18, kneeB: .18 }),
  shrug: t => P({ shF: .7, elF: 1.9, shB: .6, elB: 1.9, shrug: 1, head: -.1, spine: -.04 }),
  wave: t => P({ shF: 2.8, elF: .6 + Math.sin(t * 10) * .5, shB: -.05, elB: .1, head: -.08 }),
  think: t => P({ shF: .55, elF: 2.55, shB: -.1, elB: .1, head: .18, spine: .06 }),
  point: t => P({ shF: 1.55, elF: 0, shB: -.15, elB: .1, head: -.05 }),
  sit: t => P({ hipF: 1.5, kneeF: 1.5, hipB: 1.5, kneeB: 1.5, shF: .9, elF: 1.3, shB: .9, elB: 1.3, spine: .05, bob: 0, sit: 1 }),
  cheer: t => P({ shF: 2.9 + Math.sin(t * 9) * .2, elF: .2, shB: 2.9 - Math.sin(t * 9) * .2, elB: .2, head: -.35, bob: Math.abs(Math.sin(t * 9)) * -4, spine: -.1 }),
  facepalm: t => P({ shF: 1.3, elF: 2.6, shB: -.05, elB: .1, head: .35, spine: .08 }),
  lean: t => P({ spine: -.16, hipF: .22, hipB: -.05, kneeF: .05, shB: .25, elB: .3, shF: -.35, elF: 1.6, head: -.06 }),
  pushCart: t => P({ shF: 1.05, elF: .35, shB: 1.05, elB: .35, spine: .18, head: .12 }),
  phone: t => P({ shF: .35, elF: 2.9, shB: -.05, elB: .1, head: .05 }),
  crossArms: t => P({ shF: .35, elF: 2.4, shB: .3, elB: 2.3, head: -.04, spine: -.02 }),
  handsHips: t => P({ shF: -.5, elF: 1.9, shB: -.5, elB: 1.9, spine: -.05, head: -.04 }),
  kick: t => P({ hipF: 1.1, kneeF: .2, hipB: -.3, spine: -.2, shF: -.6, elF: .5, shB: .5, elB: .5 }),
  talk: t => P({ shF: .5 + Math.sin(t * 4) * .2, elF: 1.4 + Math.sin(t * 5) * .3, shB: .1, elB: .3, head: -.03 }),
  nod: t => P({ head: .25 + Math.sin(t * 5) * .25, shF: .04, shB: -.04, elF: .18 }),
  no: t => P({ head: -.05, shF: 1.2, elF: 1.4 + Math.sin(t * 12) * .3, shB: .05 }),
};
const EXPR = {
  neutral: { brow: 0, eye: 1, mouth: 'flat' }, happy: { brow: .2, eye: .9, mouth: 'smile' }, sad: { brow: -.7, eye: .7, mouth: 'frown' },
  confused: { brow: .6, eye: 1, mouth: 'wave' }, surprised: { brow: .9, eye: 1.3, mouth: 'o' }, angry: { brow: -.9, eye: .8, mouth: 'flat' },
  tired: { brow: -.2, eye: .45, mouth: 'flat' }, smug: { brow: .2, eye: .6, mouth: 'smirk' },
};
// what face goes with what posture
const POSTURE_EXPR = { armsUp: 'confused', headDown: 'sad', shrug: 'confused', wave: 'happy', cheer: 'happy', facepalm: 'tired', think: 'neutral', no: 'angry', nod: 'happy' };

function blendPose(a, b, k) { const o = {}; for (const key in POSE0) o[key] = lerp(a[key] || 0, b[key] || 0, k); return o; }

// ---------- inked stroke helpers ----------
let INKW = 1.6; // world-space ink width, adjusted per zoom by the scene
function inkW(zoom) { INKW = Math.max(1.3, 0.9 / zoom); }
// paper cutout: flat fills, no outlines. A second pass draws the whole figure offset in shadow colour.
function limb(ctx, x0, y0, x1, y1, w, col) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = PAPER_SHADOW ? SHADOW : litCol(col); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
}
function inkFill(ctx, col) { ctx.fillStyle = PAPER_SHADOW ? SHADOW : litCol(col); ctx.fill(); }
function hatch() {}

// ---------- Actor ----------
class Actor {
  constructor(spec) {
    this.spec = spec; this.x = 0; this.y = 0; this.z = 0; this.facing = 1; this.vx = 0; this.vy = 0;
    this.phase = Math.random(); this.t = Math.random() * 100; this.moving = false; this.speedK = 1;
    this.pose = P({}); this.posture = 'idle'; this.emote = null; this.exprName = 'neutral'; this.expr = Object.assign({}, EXPR.neutral);
    this.speech = null; this.blink = 0; this.name = spec.name || '';
    this.measure();
  }
  measure() {
    const s = this.spec, h = s.height * M, b = s.build;
    this.h = h; this.headR = h * .08; this.neck = h * .03; this.torso = h * .30; this.thigh = h * .245; this.shin = h * .235;
    this.upper = h * .17; this.fore = h * .16; this.legLen = this.thigh + this.shin;
    this.wThigh = h * .078 * b; this.wShin = h * .06 * b; this.wArm = h * .052 * b; this.shW = h * .085 * b; this.hipW = h * .066 * b;
  }
  setEmote(name, dur, expr) {
    if (!POSTURES[name]) return;
    this.emote = { name, t: 0, dur: dur || 2.2 }; this.setExpr(expr || POSTURE_EXPR[name] || 'neutral');
  }
  setExpr(name) { this.exprName = name; }
  say(text, dur) { this.speech = { text, t: 0, dur: dur || 3 }; }
  update(dt) {
    this.t += dt;
    const spd = Math.hypot(this.vx, this.vy);
    this.moving = spd > 2;
    const g = this.spec.gait || { slouch: 0, headTilt: 0, armSwing: 1, stride: 1, bounce: 1, cadence: 1, kneeLift: 1, sway: 0, idle: 'idle' };
    if (this.moving) { this.phase = (this.phase + dt * spd * g.cadence / (this.h * .95 * g.stride)) % 1; if (Math.abs(this.vx) > 2) this.facing = sgn(this.vx); }
    let target;
    if (this.emote) { this.emote.t += dt; if (this.emote.t > this.emote.dur) { this.emote = null; this.setExpr('neutral'); } }
    if (this.emote && !this.moving) target = POSTURES[this.emote.name](this.t);
    else if (this.moving) target = (this.spec.run || spd > this.h * 2.6 ? POSTURES.run : POSTURES.walk)(this.t, this.phase);
    else target = POSTURES[this.posture === 'idle' ? g.idle : this.posture] ? POSTURES[this.posture === 'idle' ? g.idle : this.posture](this.t) : POSTURES.idle(this.t);
    if (this.emote && this.moving) { const e = POSTURES[this.emote.name](this.t); target.shF = e.shF; target.elF = e.elF; target.shB = e.shB; target.elB = e.elB; target.head = e.head; }
    // accessory hand overrides when not emoting
    if (!this.emote) {
      const a = this.spec.accessory;
      if (a === 'phone' && !this.moving) { target.shF = .35; target.elF = 2.9; target.head = .08; }
      if (a === 'coffee') { target.shF = .35; target.elF = 1.7; }
      if (a === 'cane') { target.shF = .25; target.elF = .2; target.spine = Math.max(target.spine, .12); target.head = .1; }
      if (a === 'newspaper') { target.shB = .1; target.elB = 1.5; }
    }
    // personal gait: stride, arm swing, bounce, slouch, head carriage
    if (this.moving && !this.emote) { target.hipF *= g.stride; target.hipB *= g.stride; target.kneeF = (target.kneeF - .08) * g.kneeLift + .08; target.kneeB = (target.kneeB - .08) * g.kneeLift + .08; target.shF *= g.armSwing; target.shB *= g.armSwing; target.elF = .12 + (target.elF - .12) * g.armSwing; target.elB = .12 + (target.elB - .12) * g.armSwing; target.bob *= g.bounce; target.spine += g.sway * Math.sin(this.phase * TAU * 2) * .02; }
    if (!target.sit) { target.spine += g.slouch * (this.emote ? .4 : 1); target.head += g.headTilt * (this.emote ? .4 : 1); if (g.slouch > .1) { target.shF += g.slouch * .3; target.shB += g.slouch * .3; } }
    const k = 1 - Math.pow(0.0005, dt);
    this.pose = blendPose(this.pose, target, k);
    // expression blend
    const ex = EXPR[this.exprName] || EXPR.neutral;
    this.expr.brow = lerp(this.expr.brow, ex.brow, k); this.expr.eye = lerp(this.expr.eye, ex.eye, k); this.expr.mouth = ex.mouth;
    this.blink -= dt; if (this.blink < -.12) this.blink = 2 + Math.random() * 4;
    if (this.speech) { this.speech.t += dt; if (this.speech.t > this.speech.dur) this.speech = null; }
  }
  // ---- geometry from pose
  joints() {
    const p = this.pose, s = this.spec;
    const heel = s.heels ? this.h * .035 : 0;
    const pel = { x: 0, y: -this.legLen + p.bob - heel + p.sit * this.thigh * .98 };
    const leg = (hip, knee, foot) => {
      const kx = pel.x + Math.sin(hip) * this.thigh, ky = pel.y + Math.cos(hip) * this.thigh;
      const a = hip - knee; const ax = kx + Math.sin(a) * this.shin, ay = ky + Math.cos(a) * this.shin;
      return { kx, ky, ax, ay, a, foot };
    };
    const shx = pel.x + Math.sin(p.spine) * this.torso, shy = pel.y - Math.cos(p.spine) * this.torso - p.shrug * this.h * .02;
    const arm = (sh, el) => {
      const ex = shx + Math.sin(sh) * this.upper, ey = shy + Math.cos(sh) * this.upper;
      const a = sh + el; return { ex, ey, hx: ex + Math.sin(a) * this.fore, hy: ey + Math.cos(a) * this.fore, a };
    };
    const ha = p.spine + p.head, hcx = shx + Math.sin(ha) * (this.neck + this.headR), hcy = shy - Math.cos(ha) * (this.neck + this.headR);
    return { pel, shx, shy, legF: leg(p.hipF, p.kneeF, p.footF), legB: leg(p.hipB, p.kneeB, p.footB), armF: arm(p.shF, p.elF), armB: arm(p.shB, p.elB), head: { x: hcx, y: hcy, a: ha } };
  }
  draw(ctx, zoom) {
    const s = this.spec;
    const dep = this.depth || 0;
    if (dep > 0) { ctx.save(); ctx.translate(this.x, this.y - dep * 210); const k = 1 - dep * .72; ctx.scale(this.facing * k, k); ctx.globalAlpha = 1 - dep * .25; this.drawBody(ctx); ctx.restore(); if (this.speech) this.drawSpeech(ctx, zoom); return; }
    if (typeof Lights !== 'undefined') Lights.groundShadow(ctx, this.x, this.y, this.h, this.h * .38);
    ctx.save(); ctx.translate(this.x, this.y); ctx.scale(this.facing, 1);
    if (zoom < 0.16) { this.drawLOD(ctx); ctx.restore(); return; }
    if (!PAPER_SHADOW && zoom > .3) { PAPER_SHADOW = true; ctx.save(); ctx.translate(this.h * .025 * this.facing, this.h * .03); ctx.globalAlpha = .55; this.drawBody(ctx); ctx.restore(); PAPER_SHADOW = false; }
    LIT = typeof Lights !== 'undefined' ? Lights.at(this.x, this.y) : 1;
    this.drawBody(ctx);
    LIT = 1;
    ctx.restore();
    if (this.speech) this.drawSpeech(ctx, zoom);
  }
  drawBody(ctx) {
    const s = this.spec; const J = this.joints(), p = this.pose;
    const pantCol = s.bottom.type === 'none' ? s.skin : s.bottom.color;
    const legCol = (part) => {
      const b = s.bottom.type;
      if (b === 'none' || b === 'skirt' || b === 'pencil') return s.skin;
      if (b === 'shorts') return part === 'thigh' ? s.bottom.color : s.skin;
      return s.bottom.color;
    };
    const drawLeg = (L, dim) => {
      const tc = legCol('thigh'), sc = legCol('shin');
      limb(ctx, J.pel.x, J.pel.y, L.kx, L.ky, this.wThigh, dim ? shade(tc, .8) : tc);
      limb(ctx, L.kx, L.ky, L.ax, L.ay, this.wShin, dim ? shade(sc, .8) : sc);
      this.drawShoe(ctx, L, dim);
    };
    const drawArm = (A, dim, front) => {
      const sl = s.top.type === 'tank' || s.top.type === 'dress' || s.top.type === 'gown' || s.top.type === 'vest' ? 0 : (s.top.type === 'tshirt' || s.top.type === 'blouse' ? .5 : 1);
      const uc = sl > 0 ? s.top.color : s.skin, fc = sl > .6 ? s.top.color : s.skin;
      limb(ctx, J.shx, J.shy, A.ex, A.ey, this.wArm, dim ? shade(uc, .8) : uc);
      limb(ctx, A.ex, A.ey, A.hx, A.hy, this.wArm * .9, dim ? shade(fc, .85) : fc);
      // hand
      ctx.beginPath(); ctx.arc(A.hx, A.hy, this.wArm * .62, 0, TAU); inkFill(ctx, dim ? shade(s.skin, .85) : s.skin);
      if (front) this.drawHeldFront(ctx, A); else this.drawHeldBack(ctx, A);
    };
    // order: back arm, backpack, back leg, front leg, torso, front arm, head
    if (s.hair.style === 'long' || s.hair.style === 'ponytail') { /* long hair drawn behind torso later */ }
    drawArm(J.armB, true, false);
    if (s.accessory === 'backpack') this.drawBackpack(ctx, J);
    drawLeg(J.legB, true);
    drawLeg(J.legF, false);
    this.drawTorso(ctx, J);
    drawArm(J.armF, false, true);
    this.drawHead(ctx, J);
  }
  drawLOD(ctx) {
    const s = this.spec; ctx.fillStyle = s.top.color;
    ctx.beginPath(); ctx.roundRect(-this.h * .1, -this.h * .78, this.h * .2, this.h * .5, this.h * .06); ctx.fill();
    ctx.fillStyle = s.bottom.type === 'none' ? s.top.color : s.bottom.color; ctx.beginPath(); ctx.roundRect(-this.h * .08, -this.h * .45, this.h * .16, this.h * .45, 3); ctx.fill();
    ctx.fillStyle = s.skin; ctx.beginPath(); ctx.arc(0, -this.h * .78 - this.headR * .6, this.headR, 0, TAU); ctx.fill();
  }
  drawShoe(ctx, L, dim) {
    const s = this.spec, col = dim ? shade(s.shoeColor, .8) : s.shoeColor;
    ctx.save(); ctx.translate(L.ax, L.ay); ctx.rotate(-L.a * .35 - L.foot);
    const fl = this.h * .1, fh = this.h * .04;
    ctx.beginPath();
    if (s.shoes === 'heels') {
      ctx.moveTo(-fl * .25, -fh * .6); ctx.lineTo(fl * .75, fh * .3); ctx.lineTo(fl * .7, fh * .95); ctx.lineTo(-fl * .1, fh * .5); ctx.lineTo(-fl * .15, fh * 1.4); ctx.lineTo(-fl * .3, fh * 1.4); ctx.closePath(); inkFill(ctx, col);
    } else if (s.shoes === 'boots' || s.shoes === 'workboots') {
      ctx.roundRect(-fl * .35, -fh * 1.6, fl * .6, fh * 1.6, 2); inkFill(ctx, col);
      ctx.beginPath(); ctx.roundRect(-fl * .35, -fh * .3, fl * 1.05, fh, 3); inkFill(ctx, col);
    } else if (s.shoes === 'sandals' || s.shoes === 'flats') {
      ctx.roundRect(-fl * .3, 0, fl, fh * .5, 2); inkFill(ctx, col);
    } else if (s.shoes === 'dress') {
      ctx.moveTo(-fl * .3, -fh * .5); ctx.lineTo(fl * .55, -fh * .3); ctx.quadraticCurveTo(fl * .8, fh * .2, fl * .55, fh * .55); ctx.lineTo(-fl * .3, fh * .55); ctx.closePath(); inkFill(ctx, col);
    } else { // sneakers
      ctx.moveTo(-fl * .32, -fh * .7); ctx.lineTo(fl * .4, -fh * .6); ctx.quadraticCurveTo(fl * .85, -fh * .2, fl * .75, fh * .55); ctx.lineTo(-fl * .32, fh * .6); ctx.closePath(); inkFill(ctx, col);
      ctx.strokeStyle = PAPER_SHADOW ? SHADOW : FACE; ctx.lineWidth = INKW * .6; ctx.beginPath(); ctx.moveTo(-fl * .32, fh * .25); ctx.lineTo(fl * .72, fh * .2); ctx.stroke();
    }
    ctx.restore();
  }
  drawTorso(ctx, J) {
    const s = this.spec, p = this.pose, t = s.top.type;
    ctx.save(); ctx.translate(J.pel.x, J.pel.y); ctx.rotate(p.spine);
    const T = this.torso, sw = this.shW, hw = this.hipW;
    const dressy = t === 'dress' || t === 'gown';
    const skirtBottom = t === 'gown' ? this.legLen * .95 : s.bottom.type === 'skirt' || t === 'dress' ? this.thigh * .9 : s.bottom.type === 'pencil' ? this.thigh * 1.15 : 0;
    // coat tails / dress skirt drawn first
    if (skirtBottom) {
      const flare = t === 'gown' ? 2.2 : s.bottom.type === 'pencil' ? 1.05 : 1.6;
      ctx.beginPath(); ctx.moveTo(-hw, -T * .1); ctx.lineTo(hw, -T * .1); ctx.lineTo(hw * flare, skirtBottom); ctx.lineTo(-hw * flare, skirtBottom); ctx.closePath();
      inkFill(ctx, dressy ? s.top.color : s.bottom.color);
      hatch(ctx, -hw * flare + 2, skirtBottom * .5, hw * .6, skirtBottom * .45, 3, .9, .25);
    } else if (t === 'coat') {
      ctx.beginPath(); ctx.moveTo(-hw, -T * .2); ctx.lineTo(hw, -T * .2); ctx.lineTo(hw * 1.3, this.thigh * .8); ctx.lineTo(-hw * 1.3, this.thigh * .8); ctx.closePath(); inkFill(ctx, s.top.color);
    }
    // main torso
    const col = t === 'rags' ? s.top.color : s.top.color;
    ctx.beginPath();
    ctx.moveTo(-hw, T * .05); ctx.lineTo(hw, T * .05);
    ctx.quadraticCurveTo(hw * 1.15, -T * .45, sw, -T * .92);
    ctx.quadraticCurveTo(0, -T * 1.05, -sw, -T * .92);
    ctx.quadraticCurveTo(-hw * 1.15, -T * .45, -hw, T * .05); ctx.closePath();
    inkFill(ctx, col);
    hatch(ctx, -sw + 2, -T * .85, sw * .55, T * .6, 4, .7, .3);
    // garment details
    ctx.strokeStyle = PAPER_SHADOW ? SHADOW : FACE; ctx.lineWidth = INKW * .8;
    if (t === 'suit' || t === 'blazer') {
      ctx.beginPath(); ctx.moveTo(sw * .55, -T * .9); ctx.lineTo(sw * .15, -T * .45); ctx.lineTo(sw * .2, -T * .05); ctx.stroke();
      ctx.fillStyle = litCol(s.top.color2); ctx.beginPath(); ctx.moveTo(sw * .55, -T * .92); ctx.lineTo(sw * .18, -T * .5); ctx.lineTo(sw * .58, -T * .55); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (s.tie) { ctx.fillStyle = litCol(s.tie); ctx.beginPath(); ctx.moveTo(sw * .5, -T * .85); ctx.lineTo(sw * .42, -T * .35); ctx.lineTo(sw * .58, -T * .3); ctx.lineTo(sw * .62, -T * .8); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    } else if (t === 'shirt' || t === 'blouse') {
      ctx.beginPath(); ctx.moveTo(sw * .5, -T * .88); ctx.lineTo(sw * .5, -T * .05); ctx.stroke();
      ctx.fillStyle = PAPER_SHADOW ? SHADOW : FACE; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(sw * .5, -T * (.7 - i * .18), INKW * .8, 0, TAU); ctx.fill(); }
      if (s.tie) { ctx.fillStyle = litCol(s.tie); ctx.beginPath(); ctx.moveTo(sw * .48, -T * .85); ctx.lineTo(sw * .4, -T * .4); ctx.lineTo(sw * .56, -T * .35); ctx.lineTo(sw * .6, -T * .8); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    } else if (t === 'hoodie') {
      ctx.beginPath(); ctx.moveTo(-sw * .3, -T * .98); ctx.quadraticCurveTo(-sw * 1.2, -T * 1.1, -sw * .9, -T * .6); ctx.quadraticCurveTo(-sw * .4, -T * .7, -sw * .3, -T * .98); inkFill(ctx, shade(s.top.color, .85));
      ctx.beginPath(); ctx.moveTo(sw * .25, -T * .85); ctx.lineTo(sw * .3, -T * .45); ctx.stroke(); ctx.beginPath(); ctx.rect(-hw * .8, -T * .3, hw * 1.6, T * .18); ctx.stroke();
    } else if (t === 'vest') {
      ctx.fillStyle = litCol(s.top.color2); ctx.beginPath(); ctx.rect(-hw * .9, -T * .35, hw * 1.8, T * .12); ctx.fill(); ctx.stroke();
    } else if (t === 'tracksuit' || t === 'jacket') {
      ctx.beginPath(); ctx.moveTo(sw * .3, -T * .9); ctx.lineTo(sw * .3, -T * .05); ctx.stroke();
      if (t === 'tracksuit') { ctx.strokeStyle = s.top.color2; ctx.lineWidth = INKW * 1.5; ctx.beginPath(); ctx.moveTo(-sw * .9, -T * .85); ctx.lineTo(-hw, 0); ctx.stroke(); }
    } else if (t === 'tank') {
      ctx.strokeStyle = litCol(s.skin); ctx.lineWidth = INKW * 2.2; ctx.beginPath(); ctx.moveTo(sw * .75, -T * .95); ctx.lineTo(sw * .95, -T * .55); ctx.stroke();
    } else if (t === 'rags') {
      ctx.beginPath(); ctx.moveTo(-hw, T * .05); ctx.lineTo(-hw * .6, T * .25); ctx.lineTo(-hw * .2, T * .02); ctx.lineTo(hw * .3, T * .3); ctx.lineTo(hw, T * .05); inkFill(ctx, s.top.color);
      hatch(ctx, -hw, -T * .5, hw * 1.5, T * .4, 5, .2, .3);
    } else if (dressy) {
      ctx.fillStyle = litCol(s.top.color2); ctx.beginPath(); ctx.moveTo(-hw, -T * .1); ctx.lineTo(hw, -T * .1); ctx.lineTo(hw, -T * .02); ctx.lineTo(-hw, -T * .02); ctx.fill();
      if (t === 'gown') { ctx.strokeStyle = litCol(s.skin); ctx.lineWidth = INKW * 3; ctx.beginPath(); ctx.moveTo(-sw * .2, -T * 1.0); ctx.lineTo(sw * .4, -T * .95); ctx.stroke(); }
    } else if (t === 'sweater') { hatch(ctx, -hw * .8, -T * .3, hw * 1.6, T * .25, 3, 0, .2); }
    // belt
    if (!dressy && !skirtBottom && (s.bottom.type === 'slacks' || s.bottom.type === 'chinos' || s.bottom.type === 'jeans')) { ctx.strokeStyle = PAPER_SHADOW ? SHADOW : FACE; ctx.lineWidth = INKW * .9; ctx.beginPath(); ctx.moveTo(-hw, T * .02); ctx.lineTo(hw, T * .02); ctx.stroke(); }
    // purse / bag over shoulder
    const a = s.accessory;
    if (a === 'purse' || a === 'bag') {
      ctx.strokeStyle = PAPER_SHADOW ? SHADOW : FACE; ctx.lineWidth = INKW * 1.2; ctx.beginPath(); ctx.moveTo(sw * .4, -T * .9); ctx.lineTo(-hw * 1.1, T * .35); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(-hw * 1.9, T * .25, hw * 1.4, hw * 1.1, 3); inkFill(ctx, a === 'purse' ? shade(s.shoeColor, 1.1) : '#7a6b5a');
    }
    ctx.restore();
  }
  drawBackpack(ctx, J) {
    const s = this.spec; ctx.save(); ctx.translate(J.pel.x, J.pel.y); ctx.rotate(this.pose.spine);
    ctx.beginPath(); ctx.roundRect(-this.shW * 1.9, -this.torso * .85, this.shW * 1.2, this.torso * .7, 5); inkFill(ctx, shade(s.top.color2, .7)); ctx.restore();
  }
  drawHeldFront(ctx, A) {
    const a = this.spec.accessory, s = this.spec, h = this.h; if (this.emote && a !== 'cane') return;
    ctx.save(); ctx.translate(A.hx, A.hy);
    if (a === 'coffee') { ctx.rotate(-A.a); ctx.beginPath(); ctx.moveTo(-h * .02, -h * .02); ctx.lineTo(h * .02, -h * .02); ctx.lineTo(h * .015, h * .03); ctx.lineTo(-h * .015, h * .03); ctx.closePath(); inkFill(ctx, '#e8e3d6'); ctx.fillStyle = '#8a5a2b'; ctx.fillRect(-h * .02, -h * .02, h * .04, h * .012); }
    else if (a === 'phone') { ctx.rotate(-A.a + .4); ctx.beginPath(); ctx.roundRect(-h * .012, -h * .03, h * .024, h * .05, 2); inkFill(ctx, '#1c1a17'); }
    else if (a === 'clutch') { ctx.beginPath(); ctx.roundRect(-h * .03, -h * .01, h * .07, h * .03, 2); inkFill(ctx, s.shoeColor); }
    else if (a === 'cane' || a === 'umbrella') { ctx.strokeStyle = PAPER_SHADOW ? SHADOW : FACE; ctx.lineWidth = INKW * 1.6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(h * .04, -A.hy); ctx.stroke(); if (a === 'umbrella') { ctx.fillStyle = '#2b2f3a'; ctx.beginPath(); ctx.ellipse(h * .01, -h * .02, h * .02, h * .08, .1, 0, TAU); ctx.fill(); ctx.stroke(); } }
    ctx.restore();
  }
  drawHeldBack(ctx, A) {
    const a = this.spec.accessory, h = this.h; if (this.emote) return;
    ctx.save(); ctx.translate(A.hx, A.hy);
    if (a === 'briefcase') { ctx.beginPath(); ctx.roundRect(-h * .055, h * .01, h * .11, h * .085, 3); inkFill(ctx, '#4a3b2f'); ctx.strokeStyle = PAPER_SHADOW ? SHADOW : FACE; ctx.lineWidth = INKW; ctx.beginPath(); ctx.moveTo(-h * .015, 0); ctx.lineTo(-h * .015, h * .01); ctx.moveTo(h * .015, 0); ctx.lineTo(h * .015, h * .01); ctx.stroke(); }
    else if (a === 'newspaper') { ctx.rotate(-A.a); ctx.beginPath(); ctx.roundRect(-h * .02, -h * .06, h * .04, h * .1, 1); inkFill(ctx, '#e8e3d6'); hatch(ctx, -h * .015, -h * .05, h * .03, h * .08, 5, 0, .4); }
    ctx.restore();
  }
  drawHead(ctx, J) {
    const s = this.spec, H = J.head, R = this.headR, e = this.expr, hc = s.hair.color, st = s.hair.style;
    ctx.save(); ctx.translate(H.x, H.y); ctx.rotate(H.a);
    // neck
    limb(ctx, 0, R * .6, 0, R * 1.5, R * .55, s.skin);
    // back hair
    if (st === 'long') { ctx.beginPath(); ctx.moveTo(-R * .9, -R * .5); ctx.quadraticCurveTo(-R * 1.5, R * 1.2, -R * 1.0, R * 3.0); ctx.lineTo(-R * .1, R * 3.0); ctx.quadraticCurveTo(-R * .2, R * 1.5, R * .2, R * .5); ctx.closePath(); inkFill(ctx, hc); }
    if (st === 'ponytail') { ctx.beginPath(); ctx.moveTo(-R * .7, -R * .3); ctx.quadraticCurveTo(-R * 2.4, R * .2, -R * 1.5, R * 2.0); ctx.lineTo(-R * 1.1, R * 1.9); ctx.quadraticCurveTo(-R * 1.4, R * .5, -R * .6, R * .4); ctx.closePath(); inkFill(ctx, hc); }
    if (st === 'bob') { ctx.beginPath(); ctx.moveTo(-R * .95, -R * .5); ctx.lineTo(-R * 1.1, R * 1.2); ctx.lineTo(R * .6, R * 1.2); ctx.lineTo(R * .95, -R * .3); ctx.closePath(); inkFill(ctx, hc); }
    // head
    ctx.beginPath(); ctx.ellipse(0, 0, R * .95, R, 0, 0, TAU); inkFill(ctx, s.skin);
    if (s.age > .6) hatch(ctx, -R * .8, -R * .3, R * .5, R * .9, 3, .8, .18);
    // ear
    ctx.beginPath(); ctx.ellipse(-R * .05, R * .05, R * .18, R * .26, 0, 0, TAU); inkFill(ctx, s.skin);
    // eye
    const ey = -R * .12, ex = R * .48;
    const open = this.blink < 0 ? .1 : e.eye;
    ctx.fillStyle = PAPER_SHADOW ? SHADOW : FACE; ctx.strokeStyle = PAPER_SHADOW ? SHADOW : FACE; ctx.lineWidth = INKW;
    if (s.glasses === 'shades') { ctx.beginPath(); ctx.roundRect(ex - R * .35, ey - R * .22, R * .62, R * .36, 3); ctx.fill(); ctx.beginPath(); ctx.moveTo(ex - R * .35, ey - R * .1); ctx.lineTo(-R * .05, ey - R * .15); ctx.stroke(); }
    else {
      if (open > .3) { ctx.beginPath(); ctx.ellipse(ex, ey, R * .13, R * .16 * open, 0, 0, TAU); ctx.fill(); if (!PAPER_SHADOW) { ctx.fillStyle = litCol('#ffffff'); ctx.beginPath(); ctx.arc(ex + R * .04, ey - R * .05, R * .04, 0, TAU); ctx.fill(); } ctx.fillStyle = PAPER_SHADOW ? SHADOW : FACE; }
      else { ctx.beginPath(); ctx.moveTo(ex - R * .15, ey); ctx.lineTo(ex + R * .15, ey); ctx.stroke(); }
      if (s.glasses !== 'none') { ctx.lineWidth = INKW * .9; ctx.beginPath(); if (s.glasses === 'round') ctx.arc(ex, ey, R * .3, 0, TAU); else ctx.rect(ex - R * .3, ey - R * .25, R * .6, R * .48); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ex - R * .3, ey - R * .05); ctx.lineTo(-R * .05, ey - R * .12); ctx.stroke(); }
    }
    // brow
    ctx.lineWidth = INKW * 1.4; ctx.beginPath(); const by = ey - R * .32 - e.brow * R * .12; ctx.moveTo(ex - R * .2, by + (e.brow < 0 ? -e.brow * R * .1 : 0)); ctx.lineTo(ex + R * .22, by - (e.brow > 0 ? 0 : 0) + (e.brow < 0 ? e.brow * R * .05 : 0)); ctx.stroke();
    // nose
    ctx.lineWidth = INKW; ctx.beginPath(); const nl = R * (.22 + s.face.nose * .08); ctx.moveTo(R * .8, ey + R * .1); ctx.quadraticCurveTo(R * 1.0 + nl * .3, ey + R * .35, R * .78, ey + R * .5); ctx.stroke();
    // mouth
    const my = R * .45, mx = R * .55;
    ctx.beginPath();
    if (e.mouth === 'smile') ctx.moveTo(mx - R * .2, my - R * .04), ctx.quadraticCurveTo(mx + R * .1, my + R * .2, mx + R * .3, my - R * .02);
    else if (e.mouth === 'frown') ctx.moveTo(mx - R * .2, my + R * .08), ctx.quadraticCurveTo(mx + R * .1, my - R * .12, mx + R * .3, my + R * .05);
    else if (e.mouth === 'o') { ctx.ellipse(mx + R * .05, my, R * .1, R * .16, 0, 0, TAU); ctx.fill(); }
    else if (e.mouth === 'wave') ctx.moveTo(mx - R * .2, my), ctx.quadraticCurveTo(mx - R * .05, my - R * .15, mx + R * .05, my), ctx.quadraticCurveTo(mx + R * .15, my + R * .12, mx + R * .3, my);
    else if (e.mouth === 'smirk') ctx.moveTo(mx - R * .2, my), ctx.quadraticCurveTo(mx + R * .1, my + R * .05, mx + R * .3, my - R * .1);
    else ctx.moveTo(mx - R * .18, my), ctx.lineTo(mx + R * .28, my);
    if (s.face.lips && e.mouth !== 'o') { ctx.strokeStyle = '#b0413e'; ctx.lineWidth = INKW * 1.6; ctx.stroke(); ctx.strokeStyle = PAPER_SHADOW ? SHADOW : FACE; ctx.lineWidth = INKW; }
    ctx.stroke();
    // facial hair
    const fh = s.facial;
    if (fh === 'stubble') hatch(ctx, R * .1, R * .3, R * .8, R * .55, 4, .3, .3);
    if (fh === 'mustache' || fh === 'goatee') { ctx.beginPath(); ctx.moveTo(mx - R * .25, my - R * .12); ctx.quadraticCurveTo(mx + R * .1, my - R * .35, mx + R * .38, my - R * .1); ctx.quadraticCurveTo(mx + R * .1, my - R * .18, mx - R * .25, my - R * .12); inkFill(ctx, hc); }
    if (fh === 'goatee') { ctx.beginPath(); ctx.moveTo(R * .15, R * .7); ctx.quadraticCurveTo(R * .5, R * 1.35, R * .85, R * .7); ctx.closePath(); inkFill(ctx, hc); }
    if (fh === 'beard' || fh === 'bigBeard') { const L = fh === 'bigBeard' ? 2.1 : 1.35; ctx.beginPath(); ctx.moveTo(-R * .15, R * .2); ctx.quadraticCurveTo(-R * .1, R * L, R * .5, R * L); ctx.quadraticCurveTo(R * 1.05, R * L * .9, R * .95, R * .35); ctx.quadraticCurveTo(R * .6, R * .75, R * .1, R * .55); ctx.closePath(); inkFill(ctx, hc); hatch(ctx, R * .1, R * .6, R * .6, R * .6, 3, .5, .3); }
    // front hair
    ctx.beginPath();
    switch (st) {
      case 'bald': break;
      case 'buzz': ctx.arc(0, 0, R * .96, Math.PI * 1.05, Math.PI * 2.05); ctx.closePath(); ctx.fillStyle = hc; ctx.globalAlpha = .55; ctx.fill(); ctx.globalAlpha = 1; break;
      case 'short': ctx.moveTo(-R * .95, R * .1); ctx.quadraticCurveTo(-R * 1.05, -R * 1.15, R * .2, -R * 1.08); ctx.quadraticCurveTo(R * .9, -R * 1.0, R * .95, -R * .55); ctx.quadraticCurveTo(R * .3, -R * .75, -R * .3, -R * .5); ctx.lineTo(-R * .7, R * .1); ctx.closePath(); inkFill(ctx, hc); break;
      case 'side': ctx.moveTo(-R * .95, R * .1); ctx.quadraticCurveTo(-R * 1.05, -R * 1.15, R * .1, -R * 1.08); ctx.quadraticCurveTo(R * 1.05, -R * 1.0, R * 1.0, -R * .3); ctx.quadraticCurveTo(R * .95, -R * .6, R * .4, -R * .7); ctx.quadraticCurveTo(-R * .2, -R * .6, -R * .6, -R * .1); ctx.closePath(); inkFill(ctx, hc); break;
      case 'slick': ctx.moveTo(-R * .95, R * .1); ctx.quadraticCurveTo(-R * 1.3, -R * 1.05, R * .3, -R * 1.05); ctx.quadraticCurveTo(R * 1.0, -R * 1.0, R * .95, -R * .6); ctx.quadraticCurveTo(R * .3, -R * .78, -R * .6, -R * .2); ctx.closePath(); inkFill(ctx, hc); hatch(ctx, -R * .8, -R * 1.0, R * 1.4, R * .5, 4, -.2, .35); break;
      case 'curly': for (let i = 0; i < 7; i++) { const a = Math.PI * (1.0 + i / 6 * 1.05); ctx.moveTo(Math.cos(a) * R * .85 + R * .3, Math.sin(a) * R * .85); ctx.arc(Math.cos(a) * R * .85, Math.sin(a) * R * .92, R * .32, 0, TAU); } inkFill(ctx, hc); break;
      case 'afro': ctx.moveTo(-R * .95, R * .35); ctx.quadraticCurveTo(-R * 1.6, -R * .2, -R * 1.2, -R * .9); ctx.quadraticCurveTo(-R * .6, -R * 1.65, R * .2, -R * 1.55); ctx.quadraticCurveTo(R * 1.1, -R * 1.5, R * 1.15, -R * .6); ctx.quadraticCurveTo(R * .6, -R * .75, R * .1, -R * .6); ctx.quadraticCurveTo(-R * .5, -R * .45, -R * .7, R * .3); ctx.closePath(); inkFill(ctx, hc); hatch(ctx, -R * 1.1, -R * 1.3, R * .9, R * 1.0, 4, .6, .25); break;
      case 'long': ctx.moveTo(-R * .95, R * .3); ctx.quadraticCurveTo(-R * 1.1, -R * 1.2, R * .2, -R * 1.08); ctx.quadraticCurveTo(R * 1.0, -R * 1.0, R * 1.0, -R * .35); ctx.quadraticCurveTo(R * .5, -R * .7, -R * .1, -R * .5); ctx.quadraticCurveTo(-R * .6, -R * .3, -R * .75, R * .5); ctx.closePath(); inkFill(ctx, hc); break;
      case 'bob': ctx.moveTo(-R * .95, R * .3); ctx.quadraticCurveTo(-R * 1.1, -R * 1.2, R * .2, -R * 1.08); ctx.quadraticCurveTo(R * 1.0, -R * 1.0, R * 1.0, -R * .35); ctx.quadraticCurveTo(R * .6, -R * .65, R * .1, -R * .55); ctx.quadraticCurveTo(-R * .5, -R * .4, -R * .75, R * .5); ctx.closePath(); inkFill(ctx, hc); break;
      case 'ponytail': ctx.moveTo(-R * .95, R * .1); ctx.quadraticCurveTo(-R * 1.05, -R * 1.15, R * .2, -R * 1.08); ctx.quadraticCurveTo(R * 1.0, -R * 1.0, R * .95, -R * .45); ctx.quadraticCurveTo(R * .3, -R * .7, -R * .3, -R * .5); ctx.lineTo(-R * .7, R * .1); ctx.closePath(); inkFill(ctx, hc); break;
      case 'bun': ctx.moveTo(-R * .95, R * .1); ctx.quadraticCurveTo(-R * 1.05, -R * 1.15, R * .2, -R * 1.08); ctx.quadraticCurveTo(R * 1.0, -R * 1.0, R * .95, -R * .45); ctx.quadraticCurveTo(R * .3, -R * .7, -R * .3, -R * .5); ctx.lineTo(-R * .7, R * .1); ctx.closePath(); inkFill(ctx, hc); ctx.beginPath(); ctx.arc(-R * .75, -R * .75, R * .42, 0, TAU); inkFill(ctx, hc); break;
      case 'mohawk': ctx.moveTo(-R * .6, -R * .75); ctx.lineTo(-R * .4, -R * 1.9); ctx.lineTo(R * .5, -R * 1.85); ctx.lineTo(R * .6, -R * .75); ctx.closePath(); inkFill(ctx, hc); break;
    }
    // hat
    const hat = s.hat, hcol = s.hatColor || (s.arch === 'worker' && hat === 'hardhat' ? '#e0b020' : s.top.color2 === s.top.color ? '#3d4150' : (hat === 'fedora' || hat === 'trilby' ? '#2b2f3a' : s.top.color));
    ctx.beginPath();
    switch (hat) {
      case 'cap': ctx.arc(0, -R * .55, R * 1.0, Math.PI, TAU); ctx.closePath(); inkFill(ctx, hcol); ctx.beginPath(); ctx.moveTo(R * .3, -R * .55); ctx.quadraticCurveTo(R * 1.6, -R * .7, R * 1.7, -R * .4); ctx.lineTo(R * .9, -R * .5); ctx.closePath(); inkFill(ctx, hcol); break;
      case 'capBack': ctx.arc(0, -R * .55, R * 1.0, Math.PI, TAU); ctx.closePath(); inkFill(ctx, hcol); ctx.beginPath(); ctx.moveTo(-R * .3, -R * .55); ctx.quadraticCurveTo(-R * 1.6, -R * .7, -R * 1.7, -R * .4); ctx.lineTo(-R * .9, -R * .5); ctx.closePath(); inkFill(ctx, hcol); break;
      case 'beanie': ctx.moveTo(-R * 1.0, -R * .45); ctx.quadraticCurveTo(-R * 1.1, -R * 1.6, 0, -R * 1.55); ctx.quadraticCurveTo(R * 1.1, -R * 1.6, R * 1.0, -R * .45); ctx.closePath(); inkFill(ctx, hcol); ctx.beginPath(); ctx.rect(-R * 1.0, -R * .8, R * 2, R * .35); inkFill(ctx, hcol); break;
      case 'fedora': case 'trilby': { const b = hat === 'fedora' ? 1.7 : 1.35; ctx.moveTo(-R * .9, -R * .6); ctx.lineTo(-R * .8, -R * 1.55); ctx.quadraticCurveTo(0, -R * 1.75, R * .8, -R * 1.55); ctx.lineTo(R * .9, -R * .6); ctx.closePath(); inkFill(ctx, hcol); ctx.beginPath(); ctx.ellipse(0, -R * .58, R * b, R * .22, 0, 0, TAU); inkFill(ctx, hcol); ctx.strokeStyle = PAPER_SHADOW ? SHADOW : FACE; ctx.lineWidth = INKW * 1.8; ctx.beginPath(); ctx.moveTo(-R * .85, -R * .8); ctx.lineTo(R * .85, -R * .8); ctx.stroke(); break; }
      case 'bucket': ctx.moveTo(-R * .85, -R * .7); ctx.lineTo(-R * .7, -R * 1.55); ctx.lineTo(R * .7, -R * 1.55); ctx.lineTo(R * .85, -R * .7); ctx.closePath(); inkFill(ctx, hcol); ctx.beginPath(); ctx.moveTo(-R * 1.3, -R * .35); ctx.lineTo(-R * .9, -R * .72); ctx.lineTo(R * .9, -R * .72); ctx.lineTo(R * 1.3, -R * .35); ctx.closePath(); inkFill(ctx, hcol); break;
      case 'hardhat': ctx.arc(0, -R * .6, R * 1.05, Math.PI, TAU); ctx.closePath(); inkFill(ctx, hcol); ctx.beginPath(); ctx.ellipse(R * .1, -R * .6, R * 1.35, R * .18, 0, 0, TAU); inkFill(ctx, hcol); break;
      case 'beret': ctx.ellipse(-R * .2, -R * .95, R * 1.25, R * .5, -.15, 0, TAU); inkFill(ctx, hcol); ctx.beginPath(); ctx.rect(-R * .8, -R * .7, R * 1.6, R * .15); inkFill(ctx, hcol); break;
      case 'sunhat': ctx.arc(0, -R * .5, R * .95, Math.PI, TAU); ctx.closePath(); inkFill(ctx, '#e8dcc0'); ctx.beginPath(); ctx.ellipse(0, -R * .5, R * 2.3, R * .3, 0, 0, TAU); inkFill(ctx, '#e8dcc0'); break;
      case 'cowboy': ctx.moveTo(-R * .8, -R * .6); ctx.quadraticCurveTo(-R * .9, -R * 1.9, 0, -R * 1.7); ctx.quadraticCurveTo(R * .9, -R * 1.9, R * .8, -R * .6); ctx.closePath(); inkFill(ctx, '#8a5a2b'); ctx.beginPath(); ctx.moveTo(-R * 2.1, -R * .9); ctx.quadraticCurveTo(0, -R * .1, R * 2.1, -R * .9); ctx.quadraticCurveTo(R * 1.6, -R * .5, 0, -R * .65); ctx.quadraticCurveTo(-R * 1.6, -R * .5, -R * 2.1, -R * .9); inkFill(ctx, '#8a5a2b'); break;
    }
    ctx.restore();
  }
  drawSpeech(ctx, zoom) {
    const sp = this.speech, k = Math.min(1, sp.t * 6), fade = sp.t > sp.dur - .4 ? (sp.dur - sp.t) / .4 : 1;
    const fs = Math.max(11, 13 / zoom), pad = fs * .6;
    ctx.save(); ctx.globalAlpha = fade; ctx.font = `${fs}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lines = sp.text.split('\n'); let w = 0; lines.forEach(l => w = Math.max(w, ctx.measureText(l).width));
    const bw = w + pad * 2, bh = lines.length * fs * 1.25 + pad * 1.4, bx = this.x, by = this.y - this.h - fs * 1.6 - bh / 2;
    ctx.translate(bx, by); ctx.scale(k, k);
    ctx.fillStyle = PAPER; ctx.strokeStyle = PAPER_SHADOW ? SHADOW : FACE; ctx.lineWidth = Math.max(1.2, 1.6 / zoom); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, fs * .6); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-fs * .4, bh / 2 - 1); ctx.lineTo(fs * .15, bh / 2 + fs * .9); ctx.lineTo(fs * .6, bh / 2 - 1); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke();
    ctx.fillStyle = PAPER; ctx.fillRect(-fs * .4, bh / 2 - 2.5, fs, 4);
    ctx.fillStyle = PAPER_SHADOW ? SHADOW : FACE; lines.forEach((l, i) => ctx.fillText(l, 0, -bh / 2 + pad * .7 + fs * .62 + i * fs * 1.25));
    ctx.restore();
  }
}
