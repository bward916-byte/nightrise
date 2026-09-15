// ===== crowd: lots of people, moving fast =====
class Crowd {
  constructor(city, count) {
    this.city = city; this.npcs = []; this.cars = [];
    const r = RNG(777 + (city.id ? city.id.length * 31 + city.i * 17 + (city.dir === 'ns' ? 400 : 0) : 0)), x0 = city.x0 - 300, x1 = city.x1 + 300;
    const N = count || (city.ch ? city.ch.crowd : 180);
    for (let i = 0; i < N; i++) {
      const a = new Actor(genCharacter(1000 + i + (city.dir === 'ns' ? 5000 : 0) + (city.i || 0) * 300));
      a.x = r.range(x0, x1); a.y = GROUND + r.range(6, WALK_DEPTH); a.facing = r.chance(.5) ? 1 : -1; a.dir = a.facing;
      a.wait = r.range(0, 3); a.spec.walkSpeed *= 1.35; this.npcs.push(a);
    }
    for (let i = 0; i < (city.ch ? city.ch.cars : 26); i++) this.cars.push(new Car(i % 2, r.range(x0, x1), 500 + i + (city.i || 0) * 90 + (city.dir === 'ns' ? 1000 : 0)));
  }
  update(dt, player, bounds) {
    const c = this.city, x0 = c.x0 - 300, x1 = c.x1 + 300;
    const density = typeof Game !== 'undefined' ? Game.density() : 1; const active = Math.floor(this.npcs.length * density);
    this.npcs.forEach((a, idx) => { const want = idx < active; if (want !== !a.hidden) { if (want) { a.hidden = false; const side = Math.random() < .5 ? -1 : 1; a.x = clamp(side < 0 ? bounds.x0 - 250 - Math.random() * 400 : bounds.x1 + 250 + Math.random() * 400, x0, x1); } else if (a.x < bounds.x0 - 150 || a.x > bounds.x1 + 150) a.hidden = true; } });
    for (const a of this.npcs) {
      if (a.hidden) continue;
      const near = a.x > bounds.x0 - 400 && a.x < bounds.x1 + 400;
      if (a.wait > 0) { a.wait -= dt; a.vx = a.vy = 0; }
      else {
        a.vx = a.dir * a.spec.walkSpeed; a.vy = 0; a.x += a.vx * dt;
        if ((a.dir > 0 && a.x > x1) || (a.dir < 0 && a.x < x0)) a.dir *= -1;
        if (Math.random() < dt * .03) { a.wait = 1 + Math.random() * 3; a.vx = 0; const em = ['think', 'phone', 'crossArms', 'handsHips', 'idleLook', 'pockets'][Math.floor(Math.random() * 6)]; a.setEmote(em, a.wait); }
      }
      if (near) a.update(dt); else { a.t += dt; }
    }
    for (const car of this.cars) car.update(dt, x0 - 400, x1 + 400, c, this.cars);
    // pigeon behaviour: peck, hop, walk, take off when startled, wheel around and land
    const T = typeof Game !== 'undefined' ? Game.clock * 50 : 0;
    for (const pg of c.pigeons) {
      pg.t -= dt;
      if (pg.hop > 0) pg.hop = Math.max(0, pg.hop - dt * 34);
      const spook = dist(pg.x, pg.y, player.x, player.y);
      if (pg.st !== 'fly' && (spook < 62 || (pg.startle = pg.startle || 0) > 0)) {
        pg.st = 'fly'; pg.t = 1.6 + Math.random() * 2.2;
        pg.vx = sgn(pg.x - player.x || 1) * (70 + Math.random() * 90); pg.vy = -120 - Math.random() * 70;
        pg.target = clamp(pg.home + (Math.random() - .5) * 300, c.x0, c.x1);
        // the whole flock goes up together
        for (const o of c.pigeons) if (o !== pg && o.st !== 'fly' && Math.abs(o.x - pg.x) < 120) { o.st = 'fly'; o.t = 1.4 + Math.random() * 2.2; o.vx = sgn(o.x - player.x || 1) * (60 + Math.random() * 90); o.vy = -110 - Math.random() * 80; o.target = clamp(o.home + (Math.random() - .5) * 300, c.x0, c.x1); }
      }
      if (pg.st === 'fly') {
        // climb, then wheel toward the landing spot and drop in
        const land = pg.t < .9;
        if (land) { const dx = (pg.target || pg.home) - pg.x; pg.vx += clamp(dx, -140, 140) * dt * 2.2; pg.vy += 210 * dt; }
        else { pg.vy += 120 * dt; if (pg.y < GROUND - 220) pg.vy = Math.max(pg.vy, -10); pg.vx *= 1 - dt * .5; }
        pg.x += pg.vx * dt; pg.y += pg.vy * dt; pg.face = sgn(pg.vx || pg.face);
        pg.x = clamp(pg.x, c.x0 - 20, c.x1 + 20);
        if (pg.y > GROUND + 6 + Math.random() * WALK_DEPTH * .6 && pg.vy > 0 && land) { pg.y = clamp(pg.y, GROUND + 6, GROUND + WALK_DEPTH); pg.st = 'peck'; pg.t = 1 + Math.random() * 3; pg.vx = pg.vy = 0; pg.hop = 3; }
        if (pg.t <= -1.5) { pg.st = 'peck'; pg.y = GROUND + 6 + Math.random() * WALK_DEPTH; pg.t = 2; pg.vx = pg.vy = 0; }
      } else if (pg.t <= 0) {
        const roll = Math.random();
        if (roll < .42) { pg.st = 'peck'; pg.t = 1.2 + Math.random() * 2.6; }
        else if (roll < .78) { pg.st = 'walk'; pg.t = .8 + Math.random() * 1.6; pg.face = Math.random() < .5 ? -1 : 1; }
        else { pg.st = 'hop'; pg.t = .35; pg.hop = 9; pg.face = Math.random() < .5 ? -1 : 1; }
      } else if (pg.st === 'walk') { pg.x += pg.face * 11 * dt; if (Math.abs(pg.x - pg.home) > 130) pg.face = sgn(pg.home - pg.x); }
      else if (pg.st === 'hop') { pg.x += pg.face * 42 * dt; }
    }
  }
  drawBehind(ctx, pal, zoom, bounds) { for (const car of this.cars) if (car.lane === 0 && car.x > bounds.x0 - 200 && car.x < bounds.x1 + 200) car.draw(ctx, pal, zoom); }
  drawFront(ctx, pal, zoom, bounds) { for (const car of this.cars) if (car.lane === 1 && car.x > bounds.x0 - 200 && car.x < bounds.x1 + 200) car.draw(ctx, pal, zoom); }
  visible(bounds) { return this.npcs.filter(a => !a.hidden && a.x > bounds.x0 - 100 && a.x < bounds.x1 + 100); }
}
