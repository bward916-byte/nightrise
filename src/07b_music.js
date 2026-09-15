// ===== ambient score =====
// Small procedural loops built from the same oscillator helper as the street sounds.
// Each scene gets a mode, tempo and instrument colour; nothing is sampled or streamed.
const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11],
  penta: [0, 3, 5, 7, 10], major: [0, 2, 4, 5, 7, 9, 11], phryg: [0, 1, 3, 5, 7, 8, 10],
};
const THEMES = {
  apartment: { root: 48, scale: 'penta', bpm: 64, wave: 'sine', vol: .05, bass: .5, density: .45, pad: true },
  street:    { root: 45, scale: 'dorian', bpm: 84, wave: 'triangle', vol: .045, bass: .8, density: .7 },
  nightlife: { root: 43, scale: 'minor', bpm: 112, wave: 'sawtooth', vol: .04, bass: 1, density: .95, kick: true },
  quiet:     { root: 50, scale: 'penta', bpm: 58, wave: 'sine', vol: .035, bass: .35, density: .35, pad: true },
  industrial:{ root: 40, scale: 'phryg', bpm: 68, wave: 'square', vol: .03, bass: .6, density: .3 },
  hall:      { root: 46, scale: 'minor', bpm: 60, wave: 'sine', vol: .03, bass: .3, density: .3, pad: true },
  stairs:    { root: 38, scale: 'phryg', bpm: 52, wave: 'sine', vol: .028, bass: .4, density: .22, pad: true },
  lobby:     { root: 52, scale: 'major', bpm: 74, wave: 'triangle', vol: .035, bass: .45, density: .5 },
  elevator:  { root: 55, scale: 'major', bpm: 92, wave: 'sine', vol: .045, bass: .35, density: .8 },
  airport:   { root: 50, scale: 'lydian', bpm: 70, wave: 'sine', vol: .035, bass: .4, density: .45, pad: true },
  flight:    { root: 53, scale: 'lydian', bpm: 66, wave: 'sine', vol: .04, bass: .3, density: .5, pad: true },
  landmark:  { root: 47, scale: 'major', bpm: 76, wave: 'triangle', vol: .04, bass: .5, density: .55 },
  roof:      { root: 44, scale: 'dorian', bpm: 56, wave: 'sine', vol: .04, bass: .4, density: .3, pad: true },
};
const Music = {
  on: true, theme: null, name: '', step: 0, acc: 0, padT: 0, gain: 1,
  hz(n) { return 440 * Math.pow(2, (n - 69) / 12); },
  note(n, dur, wave, vol) {
    if (!Sfx.ok || !this.on) return;
    try {
      const c = Sfx.ctx, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
      o.type = wave; o.frequency.value = this.hz(n);
      f.type = 'lowpass'; f.frequency.value = 1400;
      g.gain.setValueAtTime(0, c.currentTime);
      g.gain.linearRampToValueAtTime(vol * this.gain, c.currentTime + .04);
      g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + dur);
      o.connect(f); f.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + dur + .02);
    } catch (e) {}
  },
  thud(vol) { if (!Sfx.ok || !this.on) return; try { const c = Sfx.ctx, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(120, c.currentTime); o.frequency.exponentialRampToValueAtTime(42, c.currentTime + .16); g.gain.setValueAtTime(vol * this.gain, c.currentTime); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + .22); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + .24); } catch (e) {} },
  setTheme(name) { if (name === this.name) return; this.name = name; this.theme = THEMES[name] || THEMES.street; this.step = 0; this.acc = 0; },
  update(dt) {
    if (!this.on || !Sfx.ok || !this.theme) return;
    const T = this.theme, beat = 60 / T.bpm / 2;   // eighth notes
    this.acc += dt;
    while (this.acc >= beat) {
      this.acc -= beat; const st = this.step++;
      const sc = SCALES[T.scale], bar = Math.floor(st / 8) % 4;
      const chordRoot = [0, 5, 3, 7][bar];
      if (st % 8 === 0) this.note(T.root - 12 + chordRoot, beat * 7, 'sine', .07 * T.bass);
      if (T.kick && st % 4 === 0) this.thud(.09);
      if (T.pad && st % 16 === 0) { this.note(T.root + chordRoot, beat * 14, 'sine', .022); this.note(T.root + chordRoot + sc[2], beat * 14, 'sine', .018); }
      const r = hash2(st * 13, this.name.length * 7 + bar);
      if (r < T.density) {
        const deg = Math.floor(hash2(st * 7, bar + 3) * sc.length);
        const oct = hash2(st, bar) < .3 ? 12 : 0;
        this.note(T.root + chordRoot + sc[deg] + oct, beat * (1.4 + hash2(st, 9) * 1.6), T.wave, T.vol);
      }
      if (st % 8 === 6 && hash2(st, 5) < .4) this.note(T.root + 12 + chordRoot + sc[4], beat * 2, T.wave, T.vol * .6);
    }
  },
  // pick the theme from the scene, and on the street from the street's character
  follow(G) {
    if (!G.scene) return;
    const n = G.scene.name;
    if (n === 'street' || n === 'balcony') {
      const f = G.city ? G.city.feature : 'downtown';
      this.setTheme(f === 'nightlife' || f === 'theater' ? 'nightlife' : f === 'quiet' || f === 'finance' ? 'quiet' : f === 'industrial' || f === 'construction' ? 'industrial' : 'street');
    } else this.setTheme(THEMES[n] ? n : 'street');
  },
};
