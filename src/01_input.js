// ===== input =====
const Input = {
  keys: {}, pressed: {}, axisX: 0, axisY: 0, wheel: 0, pinch: 0, tap: null,
  stick: { active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0, r: 46 },
  touches: {},
  init(canvas) {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', e => {
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; });
    canvas.addEventListener('wheel', e => { e.preventDefault(); this.wheel += e.deltaY; }, { passive: false });
    const pos = (t, r) => ({ x: t.clientX - r.left, y: t.clientY - r.top });
    canvas.addEventListener('touchstart', e => {
      e.preventDefault(); const r = canvas.getBoundingClientRect();
      for (const t of e.changedTouches) {
        const p = pos(t, r); this.touches[t.identifier] = p;
        if (!this.stick.active && p.x < r.width * .45) {
          Object.assign(this.stick, { active: true, id: t.identifier, ox: p.x, oy: p.y, x: p.x, y: p.y });
        } else this.tap = p;
      }
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      e.preventDefault(); const r = canvas.getBoundingClientRect();
      const ids = Object.keys(this.touches);
      const before = ids.length >= 2 ? this._pinchDist() : 0;
      for (const t of e.changedTouches) {
        const p = pos(t, r); this.touches[t.identifier] = p;
        if (this.stick.active && t.identifier === this.stick.id) { this.stick.x = p.x; this.stick.y = p.y; }
      }
      if (ids.length >= 2 && before) { const after = this._pinchDist(); this.pinch += (after - before); }
    }, { passive: false });
    const end = e => {
      for (const t of e.changedTouches) {
        delete this.touches[t.identifier];
        if (this.stick.active && t.identifier === this.stick.id) this.stick.active = false;
      }
    };
    canvas.addEventListener('touchend', end); canvas.addEventListener('touchcancel', end);
    canvas.addEventListener('mousedown', e => { const r = canvas.getBoundingClientRect(); this.tap = { x: e.clientX - r.left, y: e.clientY - r.top }; });
    // gamepad polled in update
  },
  _pinchDist() { const v = Object.values(this.touches); if (v.length < 2) return 0; return dist(v[0].x, v[0].y, v[1].x, v[1].y); },
  update() {
    let x = 0, y = 0;
    if (this.keys.ArrowLeft || this.keys.KeyA) x -= 1;
    if (this.keys.ArrowRight || this.keys.KeyD) x += 1;
    if (this.keys.ArrowUp || this.keys.KeyW) y -= 1;
    if (this.keys.ArrowDown || this.keys.KeyS) y += 1;
    if (this.stick.active) {
      const dx = this.stick.x - this.stick.ox, dy = this.stick.y - this.stick.oy, d = Math.hypot(dx, dy);
      if (d > 6) { const k = Math.min(1, d / this.stick.r); x = dx / d * k; y = dy / d * k; }
    }
    if (typeof navigator !== 'undefined' && navigator.getGamepads) {
      const gp = navigator.getGamepads()[0];
      if (gp) {
        const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
        if (Math.abs(ax) > .18) x = ax; if (Math.abs(ay) > .18) y = ay;
        if (gp.buttons[0] && gp.buttons[0].pressed && !this._gpA) this.pressed.Space = true;
        this._gpA = gp.buttons[0] && gp.buttons[0].pressed;
        if (gp.buttons[6] && gp.buttons[6].value > .5) this.wheel += 40;
        if (gp.buttons[7] && gp.buttons[7].value > .5) this.wheel -= 40;
      }
    }
    this.axisX = clamp(x, -1, 1); this.axisY = clamp(y, -1, 1);
  },
  consume(code) { const v = !!this.pressed[code]; this.pressed[code] = false; return v; },
  endFrame() { this.pressed = {}; this.wheel = 0; this.pinch = 0; this.tap = null; },
  drawStick(ctx) {
    if (!this.stick.active) return;
    const s = this.stick;
    ctx.save(); ctx.globalAlpha = .35; ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.fillStyle = PAPER;
    ctx.beginPath(); ctx.arc(s.ox, s.oy, s.r, 0, TAU); ctx.stroke();
    const dx = s.x - s.ox, dy = s.y - s.oy, d = Math.hypot(dx, dy), k = Math.min(d, s.r);
    const kx = d ? dx / d * k : 0, ky = d ? dy / d * k : 0;
    ctx.beginPath(); ctx.arc(s.ox + kx, s.oy + ky, 18, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
};
