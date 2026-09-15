// ===== UI =====
const EMOTES = [
  { key: '1', name: 'armsUp', label: 'Huh?' }, { key: '2', name: 'headDown', label: 'Sad' }, { key: '3', name: 'shrug', label: 'Shrug' },
  { key: '4', name: 'wave', label: 'Wave' }, { key: '5', name: 'think', label: 'Hmm' }, { key: '6', name: 'point', label: 'Point' },
  { key: '7', name: 'cheer', label: 'Yes!' }, { key: '8', name: 'facepalm', label: 'Ugh' }, { key: '9', name: 'nod', label: 'Nod' }, { key: '0', name: 'no', label: 'No' },
];
const UI = {
  buttons: [], hint: '', hintT: 0, toast: null, panelOpen: false, packOpen: false, prompt: null,
  setHint(t, dur) { this.hint = t; this.hintT = dur || 2.5; },
  say(t, dur) { this.toast = { t, life: dur || 3 }; },
  update(dt) { if (this.hintT > 0) this.hintT -= dt; if (this.toast) { this.toast.life -= dt; if (this.toast.life <= 0) this.toast = null; } },
  panel(ctx, x, y, w, h, r, fill) { ctx.fillStyle = fill || 'rgba(242,236,223,.94)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, r || 8); ctx.fill(); },
  button(ctx, id, x, y, w, h, label, small, fill, col) {
    this.buttons.push({ id, x, y, w, h });
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.roundRect(x + 2, y + 3, w, h, 7); ctx.fill();
    this.panel(ctx, x, y, w, h, 7, fill); ctx.fillStyle = col || '#1c1a24'; ctx.font = `${small ? 12 : 15}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  },
  hit(p) { for (let i = this.buttons.length - 1; i >= 0; i--) { const b = this.buttons[i]; if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b.id; } return null; },
  draw(ctx, G) {
    this.buttons = []; const W = Camera.w, H = Camera.h, mobile = W < 700;
    ctx.save(); ctx.textBaseline = 'middle';
    this.panel(ctx, 12, 12, 150, 38); ctx.fillStyle = '#1c1a24'; ctx.font = `bold 17px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText('$' + G.cash.toLocaleString(), 24, 31);
    const hr = G.hour() % 24, h12 = ((Math.floor(hr) + 11) % 12) + 1, mn = Math.floor((hr % 1) * 60); ctx.font = `12px ${FONT}`; ctx.textAlign = 'right'; ctx.fillText(`${h12}:${mn < 10 ? '0' : ''}${mn}${Math.floor(hr) % 24 >= 12 ? 'pm' : 'am'}`, 152, 31);
    // energy + look meters
    const meter = (x, y, w, v, col, label) => { this.panel(ctx, x, y, w, 14, 7, 'rgba(242,236,223,.8)'); ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x + 2, y + 2, Math.max(4, (w - 4) * clamp(v / 100, 0, 1)), 10, 5); ctx.fill(); ctx.fillStyle = '#1c1a24'; ctx.font = `9px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText(label, x + 6, y + 7.5); };
    meter(172, 12, 90, G.energy, G.energy < 25 ? '#ff6a4a' : '#7dff7a', 'ENERGY'); meter(172, 30, 90, G.look, '#ffd36a', 'LOOK ' + Math.round(G.look));
    if (G.heat > .2) { this.panel(ctx, 270, 12, 60, 32, 7, 'rgba(255,90,74,.85)'); ctx.fillStyle = '#fff'; ctx.font = `bold 10px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('HEAT', 300, 28); }
    const hh = G.scene && G.scene.name === 'street' ? G.homeHint() : null; if (hh) { this.panel(ctx, 12, 56, 150, 26, 13, 'rgba(242,236,223,.8)'); ctx.fillStyle = '#1c1a24'; ctx.font = `11px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('🏠 ' + hh, 87, 69); }
    this.panel(ctx, W - 192, 12, 180, 38); ctx.fillStyle = '#1c1a24'; ctx.font = `13px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(`${G.where}  ·  N${G.night || 1} · rent ${G.rentDue}n`, W - 102, 31);
    const turning = !!G.cinema;
    const sw = mobile ? 40 : 46, gap = 6;
    if (this.packOpen && !turning) {
      const n = G.inv.length, cols = 6, rows = Math.ceil(n / cols), pw = cols * (sw + gap) + 14, ph = rows * (sw + gap) + 34, px = 12, py = H - 62 - 10 - ph;
      this.panel(ctx, px, py, pw, ph, 8);
      ctx.fillStyle = '#1c1a24'; ctx.font = `bold 11px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText((G.hasBackpack ? 'BACKPACK' : 'POCKETS') + '  ' + G.inv.filter(Boolean).length + '/' + n, px + 10, py + 14);
      if (G.bottles) { ctx.textAlign = 'right'; ctx.fillText(G.bottles + ' bottles', px + pw - 10, py + 14); }
      for (let i = 0; i < n; i++) { const r = Math.floor(i / cols), c = i % cols, x = px + 8 + c * (sw + gap), y = py + 26 + r * (sw + gap); const it = G.inv[i];
        this.buttons.push({ id: 'inv:' + i, x, y, w: sw, h: sw });
        this.panel(ctx, x, y, sw, sw, 6, 'rgba(255,255,255,.55)');
        if (it) { ctx.fillStyle = it.col || '#3d4150'; ctx.beginPath(); ctx.roundRect(x + 8, y + 8, sw - 16, sw - 16, 4); ctx.fill(); ctx.fillStyle = '#1c1a24'; ctx.font = `9px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(it.name, x + sw / 2, y + sw - 6, sw - 4); } }
    }
    const bx = W - 56, by = H - 190;
    if (!G.scene.noZoom && !turning) { this.button(ctx, 'zoomIn', bx, by, 44, 44, '+'); this.button(ctx, 'zoomOut', bx, by + 52, 44, 44, '–'); this.button(ctx, 'zoomFit', bx, by + 104, 44, 44, '⌖'); }
    if (!turning) { this.button(ctx, 'emotes', 12, H - 62, 64, 44, this.panelOpen ? 'Close' : 'Pose'); this.button(ctx, 'pack', 82, H - 62, 64, 44, this.packOpen ? 'Close' : 'Pack'); this.button(ctx, 'mute', W - 56, 56, 44, 34, Music.on ? '♪' : '✕', true); }
    if (this.prompt && !turning) this.button(ctx, 'act', 154, H - 62, mobile ? Math.min(150, W - 220) : 170, 44, this.prompt, false, '#ffe6a8');
    if (this.panelOpen) { const px = 12, py = H - 62 - 10 - (mobile ? 2 : 1) * 46, cols = mobile ? 5 : 10, bw = mobile ? 56 : 62; EMOTES.forEach((e, i) => { const r = Math.floor(i / cols), c = i % cols; this.button(ctx, 'emote:' + e.name, px + c * (bw + 5), py + r * 46, bw, 40, e.label, true); }); }
    if (this.hintT > 0 && this.hint) { ctx.globalAlpha = Math.min(1, this.hintT * 2); ctx.font = `15px ${FONT}`; const w = Math.min(W - 24, ctx.measureText(this.hint).width + 28); this.panel(ctx, W / 2 - w / 2, 62, w, 34, 17); ctx.fillStyle = '#1c1a24'; ctx.textAlign = 'center'; ctx.fillText(this.hint, W / 2, 79, w - 20); ctx.globalAlpha = 1; }
    if (this.toast) { ctx.font = `14px ${FONT}`; const w = Math.min(W - 40, ctx.measureText(this.toast.t).width + 28), ty = H - 62 - 46 - (this.packOpen ? 130 : 0); this.panel(ctx, W / 2 - w / 2, ty, w, 32, 16, '#ffe6a8'); ctx.fillStyle = '#1c1a24'; ctx.textAlign = 'center'; ctx.fillText(this.toast.t, W / 2, ty + 16, w - 16); }
    ctx.restore();
  },
  title(ctx, text, sub, alpha) {
    const W = Camera.w, H = Camera.h; ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(W / 2 - 196, H * .18 + 6, 400, 96);
    ctx.fillStyle = PAPER; ctx.fillRect(W / 2 - 200, H * .18, 400, 96);
    ctx.fillStyle = '#1c1a24'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold 36px ${FONT}`; ctx.fillText(text, W / 2, H * .18 + 38);
    ctx.font = `15px ${FONT}`; ctx.fillText(sub, W / 2, H * .18 + 72); ctx.restore();
  }
};
