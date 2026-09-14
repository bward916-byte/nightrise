// ===== crowd: lots of people, moving fast =====
class Crowd {
  constructor(city, count) {
    this.city = city; this.npcs = []; this.cars = [];
    const r = RNG(777 + (city.id ? city.id.length * 31 + city.i * 17 + (city.dir === 'ns' ? 400 : 0) : 0)), x0 = city.x0 - 300, x1 = city.x1 + 300;
    for (let i = 0; i < (count || 240); i++) {
      const a = new Actor(genCharacter(1000 + i + (city.dir === 'ns' ? 5000 : 0) + (city.i || 0) * 300));
      a.x = r.range(x0, x1); a.y = GROUND + r.range(6, WALK_DEPTH); a.facing = r.chance(.5) ? 1 : -1; a.dir = a.facing;
      a.wait = r.range(0, 3); a.spec.walkSpeed *= 1.35; this.npcs.push(a);
    }
    for (let i = 0; i < 26; i++) this.cars.push(new Car(i % 2, r.range(x0, x1), 500 + i + (city.i || 0) * 90 + (city.dir === 'ns' ? 1000 : 0)));
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
    for (const pg of c.pigeons) { const d = dist(pg.x, pg.y, player.x, player.y); if (pg.fly <= 0 && d < 70) { pg.fly = 2 + Math.random(); pg.vx = sgn(pg.x - player.x) * (60 + Math.random() * 60); pg.vy = -80 - Math.random() * 60; } if (pg.fly > 0) { pg.fly -= dt; pg.x += pg.vx * dt; pg.y += pg.vy * dt; pg.vy += 40 * dt; if (pg.fly <= 0) { pg.y = GROUND + 6 + Math.random() * WALK_DEPTH; pg.vx = pg.vy = 0; } } }
  }
  drawBehind(ctx, pal, zoom, bounds) { for (const car of this.cars) if (car.lane === 0 && car.x > bounds.x0 - 200 && car.x < bounds.x1 + 200) car.draw(ctx, pal, zoom); }
  drawFront(ctx, pal, zoom, bounds) { for (const car of this.cars) if (car.lane === 1 && car.x > bounds.x0 - 200 && car.x < bounds.x1 + 200) car.draw(ctx, pal, zoom); }
  visible(bounds) { return this.npcs.filter(a => !a.hidden && a.x > bounds.x0 - 100 && a.x < bounds.x1 + 100); }
}
