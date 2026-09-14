// ===== camera =====
// zoom 1 => 1 world px per screen px. Player is ~56px tall at zoom 1 ("kind of small").
const ZOOM_STOPS = [
  { z: 2.4,  name: 'Close' },
  { z: 1.0,  name: 'Street' },
  { z: 0.42, name: 'Block' },
  { z: 0.15, name: 'Tower' },
  { z: 0.06, name: 'District' },
];
const Camera = {
  x: 0, y: 0, zoom: 1, tx: 0, ty: 0, tzoom: 1, w: 800, h: 600, dpr: 1,
  stopIndex: 1, follow: null, seq: null, seqT: 0, shake: 0,
  locked: false,           // true while a scene owns the camera (elevator panel etc)
  setSize(w, h, dpr) { this.w = w; this.h = h; this.dpr = dpr || 1; },
  snapTo(x, y, z) { this.x = this.tx = x; this.y = this.ty = y; if (z) this.zoom = this.tzoom = z; },
  setStop(i) { this.stopIndex = clamp(i, 0, ZOOM_STOPS.length - 1); this.tzoom = ZOOM_STOPS[this.stopIndex].z; },
  nearestStop() { let b = 0, bd = 1e9; ZOOM_STOPS.forEach((s, i) => { const d = Math.abs(Math.log(s.z) - Math.log(this.tzoom)); if (d < bd) { bd = d; b = i; } }); return b; },
  zoomBy(f) { this.tzoom = clamp(this.tzoom * f, ZOOM_STOPS[ZOOM_STOPS.length - 1].z, ZOOM_STOPS[0].z); this.stopIndex = this.nearestStop(); },
  // cinematic: list of {x,y,zoom,dur,hold,ease}
  play(steps, done) { this.seq = { steps, i: 0, t: 0, from: { x: this.x, y: this.y, z: this.zoom }, done }; },
  update(dt) {
    if (this.seq) {
      const s = this.seq, st = s.steps[s.i];
      s.t += dt;
      const dur = st.dur || 1.2, hold = st.hold || 0;
      const t = clamp(s.t / dur, 0, 1), e = (st.ease || easeInOut)(t);
      const tx = st.x !== undefined ? st.x : (this.follow ? this.follow.x : this.x);
      const ty = st.y !== undefined ? st.y : (this.follow ? this.follow.y - this.h * .22 / st.zoom : this.y);
      // interpolate in log-zoom so it feels linear to the eye
      this.zoom = Math.exp(lerp(Math.log(s.from.z), Math.log(st.zoom), e));
      this.x = lerp(s.from.x, tx, e); this.y = lerp(s.from.y, ty, e);
      if (s.t >= dur + hold) { s.i++; s.from = { x: this.x, y: this.y, z: this.zoom }; s.t = 0; if (s.i >= s.steps.length) { const d = s.done; this.tzoom = this.zoom; this.tx = this.x; this.ty = this.y; this.stopIndex = this.nearestStop(); this.seq = null; d && d(); } }
      return;
    }
    if (this.follow && !this.locked) {
      this.tx = this.follow.x;
      // when zoomed far out, centre on the building rather than the guy
      const far = smoothstep(0.35, 0.08, this.zoom);
      this.ty = lerp(this.follow.y - this.h * .22 / this.zoom, this.follow.y - 900 - this.h * .1 / this.zoom, far);
    }
    const k = 1 - Math.pow(0.001, dt);     // exp smoothing, framerate independent
    this.zoom = Math.exp(lerp(Math.log(this.zoom), Math.log(this.tzoom), k * .9));
    this.x = lerp(this.x, this.tx, k); this.y = lerp(this.y, this.ty, k);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3);
  },
  begin(ctx) {
    ctx.save();
    ctx.translate(this.w / 2, this.h / 2);
    ctx.scale(this.zoom, this.zoom);
    const sx = this.shake ? (Math.random() - .5) * 6 * this.shake : 0, sy = this.shake ? (Math.random() - .5) * 6 * this.shake : 0;
    ctx.translate(-this.x + sx, -this.y + sy);
  },
  end(ctx) { ctx.restore(); },
  // visible world rect
  bounds() { const hw = this.w / 2 / this.zoom, hh = this.h / 2 / this.zoom; return { x0: this.x - hw, y0: this.y - hh, x1: this.x + hw, y1: this.y + hh }; },
  toWorld(sx, sy) { return { x: (sx - this.w / 2) / this.zoom + this.x, y: (sy - this.h / 2) / this.zoom + this.y }; },
  stopName() { return ZOOM_STOPS[this.nearestStop()].name; },
};
